/**
 * Nach Yomi Telegram Bot
 *
 * Daily Nach Yomi chapter with Rav Breitowitz's shiurim from Kol Halashon.
 * Features: Embedded video + audio, full Hebrew + English text
 *
 * Commands:
 *   /start - Today's chapter (video + audio + text)
 *   /video - Video shiur only
 *   /audio - Audio shiur only
 *   /text  - Text only
 */

import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';
import cron from 'node-cron';
import { createReadStream } from 'fs';
import { getTodaysNachYomi } from './hebcalService.js';
import { getChapterText } from './sefariaService.js';
import {
  buildDailyMessages,
  buildKeyboard,
  buildMediaCaption,
  buildMediaKeyboard,
  buildWelcomeMessage
} from './messageBuilder.js';
import { getShiurId, getShiurAudioUrl, getShiurVideoUrl, getShiurUrl } from './data/shiurMapping.js';
import { prepareVideoForTelegram, cleanupVideo, cleanupVideoParts, checkFfmpeg } from './videoService.js';

// Configuration
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

if (!BOT_TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN required');
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });
let ffmpegAvailable = false;

// Initialize
(async () => {
  ffmpegAvailable = await checkFfmpeg();
  console.log('Nach Yomi Bot started');
  console.log(`FFmpeg: ${ffmpegAvailable ? 'yes' : 'no'}`);
})();

/**
 * Format duration in minutes:seconds
 */
function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Send video shiur for a chapter
 * Handles both single videos and multi-part videos for large shiurim
 */
async function sendVideoShiur(chatId, nachYomi, shiurId) {
  if (!ffmpegAvailable) {
    await bot.sendMessage(chatId, '_Video requires FFmpeg. Use /audio instead._', { parse_mode: 'Markdown' });
    return false;
  }

  if (!shiurId) {
    await bot.sendMessage(chatId, '_No video mapped for this chapter yet. Use /audio for the full shiur._', { parse_mode: 'Markdown' });
    return false;
  }

  try {
    const statusMsg = await bot.sendMessage(chatId, '🎬 _Converting full video shiur (this may take several minutes)..._', { parse_mode: 'Markdown' });

    const videoUrl = getShiurVideoUrl(shiurId);
    const videoResult = await prepareVideoForTelegram(videoUrl, shiurId);

    // Delete status message
    await bot.deleteMessage(chatId, statusMsg.message_id).catch(() => {});

    if (!videoResult) {
      throw new Error('Video preparation failed');
    }

    if (videoResult.tooLarge) {
      // Splitting failed - provide external link
      const shiurPageUrl = getShiurUrl(nachYomi.book, nachYomi.chapter);
      await bot.sendMessage(chatId,
        `🎬 *Video Shiur*\n\n` +
        `The video could not be processed for Telegram.\n\n` +
        `[Watch on Kol Halashon](${shiurPageUrl})`,
        { parse_mode: 'Markdown', disable_web_page_preview: true }
      );
      return false;
    }

    // Handle multi-part videos
    if (videoResult.parts) {
      const { parts, totalDuration } = videoResult;
      const totalMins = Math.round(totalDuration / 60);

      await bot.sendMessage(chatId,
        `🎬 *${nachYomi.book} ${nachYomi.chapter}* — Full Video Shiur\n\n` +
        `_Total duration: ~${totalMins} minutes_\n` +
        `_Sending in ${parts.length} parts..._`,
        { parse_mode: 'Markdown' }
      );

      for (const part of parts) {
        const partCaption = `🎬 *Part ${part.partNumber}/${part.totalParts}*\n` +
          `_${nachYomi.book} ${nachYomi.chapter}_ · Rav Yitzchok Breitowitz`;

        await bot.sendVideo(chatId, createReadStream(part.path), {
          caption: partCaption,
          parse_mode: 'Markdown',
          supports_streaming: true,
          reply_markup: part.partNumber === part.totalParts
            ? buildMediaKeyboard(nachYomi.book, nachYomi.chapter)
            : undefined
        });
      }

      await cleanupVideoParts(parts);
      console.log(`Video sent in ${parts.length} parts: ${nachYomi.book} ${nachYomi.chapter}`);
      return true;
    }

    // Single video (under 50MB)
    if (videoResult.path) {
      await bot.sendVideo(chatId, createReadStream(videoResult.path), {
        caption: buildMediaCaption(nachYomi, 'video'),
        parse_mode: 'Markdown',
        reply_markup: buildMediaKeyboard(nachYomi.book, nachYomi.chapter),
        supports_streaming: true
      });
      await cleanupVideo(videoResult.path);
      console.log(`Video sent: ${nachYomi.book} ${nachYomi.chapter}`);
      return true;
    }

  } catch (err) {
    console.warn('Video failed:', err.message);
    // Notify user of failure with fallback link
    const shiurPageUrl = getShiurUrl(nachYomi.book, nachYomi.chapter);
    await bot.sendMessage(chatId,
      `🎬 *Video Shiur*\n\n` +
      `Video conversion failed. Watch on Kol Halashon instead:\n\n` +
      `[Watch Full Shiur](${shiurPageUrl})`,
      { parse_mode: 'Markdown', disable_web_page_preview: true }
    ).catch(() => {});
  }
  return false;
}

/**
 * Send audio shiur for a chapter
 */
async function sendAudioShiur(chatId, nachYomi, shiurId) {
  if (!shiurId) {
    // No specific shiur ID - provide link to Kol Halashon page
    const shiurPageUrl = getShiurUrl(nachYomi.book, nachYomi.chapter);
    await bot.sendMessage(chatId,
      `🎧 *Audio Shiur*\n\n` +
      `No embedded audio available for ${nachYomi.book} ${nachYomi.chapter}.\n\n` +
      `[Listen on Kol Halashon](${shiurPageUrl})`,
      { parse_mode: 'Markdown', disable_web_page_preview: true }
    );
    return false;
  }

  try {
    const audioUrl = getShiurAudioUrl(shiurId);
    await bot.sendAudio(chatId, audioUrl, {
      title: `${nachYomi.book} ${nachYomi.chapter}`,
      performer: 'Rav Yitzchok Breitowitz',
      caption: buildMediaCaption(nachYomi, 'audio'),
      parse_mode: 'Markdown',
      reply_markup: buildMediaKeyboard(nachYomi.book, nachYomi.chapter)
    });
    console.log(`Audio sent: ${nachYomi.book} ${nachYomi.chapter}`);
    return true;
  } catch (err) {
    console.warn('Audio failed:', err.message);
    // Notify user of failure with fallback link
    const shiurPageUrl = getShiurUrl(nachYomi.book, nachYomi.chapter);
    await bot.sendMessage(chatId,
      `🎧 *Audio Shiur*\n\n` +
      `Audio loading failed. Listen on Kol Halashon instead:\n\n` +
      `[Listen to Full Shiur](${shiurPageUrl})`,
      { parse_mode: 'Markdown', disable_web_page_preview: true }
    ).catch(() => {});
    return false;
  }
}

/**
 * Send chapter text (Hebrew + English)
 */
async function sendChapterText(chatId, nachYomi, chapterText) {
  const messages = buildDailyMessages(nachYomi, chapterText);

  for (let i = 0; i < messages.length; i++) {
    const isLastMessage = i === messages.length - 1;
    await bot.sendMessage(chatId, messages[i], {
      parse_mode: 'Markdown',
      reply_markup: isLastMessage ? buildKeyboard(nachYomi.book, nachYomi.chapter) : undefined,
      disable_web_page_preview: true
    });
  }

  console.log(`Text sent: ${messages.length} message(s)`);
  return messages.length;
}

/**
 * Send daily Nach Yomi - VIDEO + AUDIO + TEXT (complete experience)
 */
async function sendDailyNachYomi(chatId, options = {}) {
  const { videoOnly = false, audioOnly = false, textOnly = false } = options;

  try {
    const nachYomi = await getTodaysNachYomi();
    console.log(`Sending: ${nachYomi.book} ${nachYomi.chapter}`);

    const shiurId = getShiurId(nachYomi.book, nachYomi.chapter);

    // 1. VIDEO (full shiur)
    if (!audioOnly && !textOnly) {
      await sendVideoShiur(chatId, nachYomi, shiurId);
    }

    // 2. AUDIO (full shiur) - Always send if we have it
    if (!videoOnly && !textOnly && shiurId) {
      await sendAudioShiur(chatId, nachYomi, shiurId);
    }

    // 3. TEXT (full chapter)
    if (!videoOnly && !audioOnly) {
      let chapterText = null;
      try {
        chapterText = await getChapterText(nachYomi.book, nachYomi.chapter, { maxVerses: null });
      } catch (err) {
        console.warn('Text fetch failed:', err.message);
      }
      await sendChapterText(chatId, nachYomi, chapterText);
    }

    return true;

  } catch (error) {
    console.error('Send failed:', error.message);
    if (ADMIN_CHAT_ID) {
      bot.sendMessage(ADMIN_CHAT_ID, `❌ Error: ${error.message}`).catch(() => {});
    }
    throw error;
  }
}

// ============================================
// COMMAND HANDLERS
// ============================================

// /start - Today's chapter (video + audio + text)
bot.onText(/\/start/, async (msg) => {
  try {
    await bot.sendMessage(msg.chat.id, buildWelcomeMessage(), { parse_mode: 'Markdown' });
    await sendDailyNachYomi(msg.chat.id);
  } catch (err) {
    await bot.sendMessage(msg.chat.id, '❌ Error loading chapter. Please try again.');
  }
});

// /video - Video shiur only
bot.onText(/\/video/, async (msg) => {
  try {
    const nachYomi = await getTodaysNachYomi();
    const shiurId = getShiurId(nachYomi.book, nachYomi.chapter);
    await sendVideoShiur(msg.chat.id, nachYomi, shiurId);
  } catch (err) {
    await bot.sendMessage(msg.chat.id, `❌ Error: ${err.message}`);
  }
});

// /audio - Audio shiur only
bot.onText(/\/audio/, async (msg) => {
  try {
    const nachYomi = await getTodaysNachYomi();
    const shiurId = getShiurId(nachYomi.book, nachYomi.chapter);
    await sendAudioShiur(msg.chat.id, nachYomi, shiurId);
  } catch (err) {
    await bot.sendMessage(msg.chat.id, `❌ Error: ${err.message}`);
  }
});

// /text - Text only
bot.onText(/\/text/, async (msg) => {
  try {
    const nachYomi = await getTodaysNachYomi();
    const chapterText = await getChapterText(nachYomi.book, nachYomi.chapter, { maxVerses: null }).catch(() => null);
    await sendChapterText(msg.chat.id, nachYomi, chapterText);
  } catch (err) {
    await bot.sendMessage(msg.chat.id, '❌ Error fetching text.');
  }
});

// /broadcast - Admin only: send to channel
bot.onText(/\/broadcast/, async (msg) => {
  if (ADMIN_CHAT_ID && msg.chat.id.toString() !== ADMIN_CHAT_ID) return;
  if (!CHANNEL_ID) {
    await bot.sendMessage(msg.chat.id, 'No channel configured.');
    return;
  }
  try {
    await sendDailyNachYomi(CHANNEL_ID);
    await bot.sendMessage(msg.chat.id, '✅ Broadcast sent.');
  } catch (err) {
    await bot.sendMessage(msg.chat.id, `❌ Broadcast failed: ${err.message}`);
  }
});

// ============================================
// SCHEDULED TASKS
// ============================================

// Daily post at 6:00 AM Israel time (4:00 UTC)
if (CHANNEL_ID) {
  cron.schedule('0 4 * * *', () => {
    console.log('Running scheduled broadcast...');
    sendDailyNachYomi(CHANNEL_ID).catch(err => {
      console.error('Scheduled broadcast failed:', err.message);
      if (ADMIN_CHAT_ID) {
        bot.sendMessage(ADMIN_CHAT_ID, `❌ Scheduled broadcast failed: ${err.message}`).catch(() => {});
      }
    });
  }, { timezone: 'UTC' });
  console.log(`Scheduled daily post to ${CHANNEL_ID} at 6:00 AM Israel`);
}

// ============================================
// ERROR HANDLERS
// ============================================

bot.on('polling_error', (err) => console.error('Polling error:', err.message));
bot.on('error', (err) => console.error('Bot error:', err.message));

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  bot.stopPolling();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Shutting down...');
  bot.stopPolling();
  process.exit(0);
});

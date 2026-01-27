/**
 * Nach Yomi Telegram Bot
 *
 * Daily Nach Yomi chapter with Rav Breitowitz's shiurim from Kol Halashon.
 * Features: Embedded video + audio, full Hebrew + English text
 *
 * Commands:
 *   /start    - Welcome message and today's chapter
 *   /today    - Today's Nach Yomi chapter
 *   /tomorrow - Tomorrow's chapter preview
 *   /video    - Get video shiur for today
 *   /audio    - Get audio shiur for today
 *   /text     - Get text only (no media)
 *   /help     - Show all commands
 *   /about    - About this bot and sources
 */

import TelegramBot from 'node-telegram-bot-api';
import cron from 'node-cron';
import { createReadStream } from 'fs';
import { getTodaysNachYomi, getNachYomiForDate } from './hebcalService.js';
import { getChapterText } from './sefariaService.js';
import {
  buildDailyMessages,
  buildKeyboard,
  buildMediaCaption,
  buildMediaKeyboard,
  buildWelcomeMessage,
  buildAboutMessage,
  buildHelpMessage
} from './messageBuilder.js';
import { getShiurId, getShiurAudioUrl, getShiurVideoUrl, getShiurUrl } from './data/shiurMapping.js';
import { prepareVideoForTelegram, cleanupVideo, checkFfmpeg } from './videoService.js';

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
 * Send video shiur for a chapter
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
    const statusMsg = await bot.sendMessage(chatId, '🎬 _Converting video (this may take a moment)..._', { parse_mode: 'Markdown' });

    const videoUrl = getShiurVideoUrl(shiurId);
    const videoFile = await prepareVideoForTelegram(videoUrl, shiurId);

    // Delete status message
    await bot.deleteMessage(chatId, statusMsg.message_id).catch(() => {});

    if (videoFile) {
      await bot.sendVideo(chatId, createReadStream(videoFile.path), {
        caption: buildMediaCaption(nachYomi, 'video'),
        parse_mode: 'Markdown',
        reply_markup: buildMediaKeyboard(nachYomi.book, nachYomi.chapter),
        supports_streaming: true
      });
      await cleanupVideo(videoFile.path);
      console.log(`Video sent: ${nachYomi.book} ${nachYomi.chapter}`);
      return true;
    }
  } catch (err) {
    console.warn('Video failed:', err.message);
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

    // 1. VIDEO (2-minute preview)
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

// /start - Welcome + Today's chapter
bot.onText(/\/start/, async (msg) => {
  try {
    await bot.sendMessage(msg.chat.id, buildWelcomeMessage(), { parse_mode: 'Markdown' });
    await sendDailyNachYomi(msg.chat.id);
  } catch (err) {
    await bot.sendMessage(msg.chat.id, '❌ Error loading chapter. Try /today');
  }
});

// /today - Today's Nach Yomi (video + audio + text)
bot.onText(/\/today/, async (msg) => {
  try {
    await sendDailyNachYomi(msg.chat.id);
  } catch (err) {
    await bot.sendMessage(msg.chat.id, '❌ Error fetching Nach Yomi. Please try again.');
  }
});

// /tomorrow - Tomorrow's chapter preview
bot.onText(/\/tomorrow/, async (msg) => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nachYomi = await getNachYomiForDate(tomorrow);

    if (!nachYomi) {
      await bot.sendMessage(msg.chat.id, 'Could not find tomorrow\'s Nach Yomi.');
      return;
    }

    const chapterText = await getChapterText(nachYomi.book, nachYomi.chapter, { maxVerses: null }).catch(() => null);
    const messages = buildDailyMessages(nachYomi, chapterText);
    messages[0] = `📅 *Tomorrow's Nach Yomi*\n\n` + messages[0];

    for (let i = 0; i < messages.length; i++) {
      const isLastMessage = i === messages.length - 1;
      await bot.sendMessage(msg.chat.id, messages[i], {
        parse_mode: 'Markdown',
        reply_markup: isLastMessage ? buildKeyboard(nachYomi.book, nachYomi.chapter) : undefined,
        disable_web_page_preview: true
      });
    }
  } catch (err) {
    await bot.sendMessage(msg.chat.id, '❌ Error fetching tomorrow\'s chapter.');
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

// /text - Text only (no media)
bot.onText(/\/text/, async (msg) => {
  try {
    const nachYomi = await getTodaysNachYomi();
    const chapterText = await getChapterText(nachYomi.book, nachYomi.chapter, { maxVerses: null }).catch(() => null);
    await sendChapterText(msg.chat.id, nachYomi, chapterText);
  } catch (err) {
    await bot.sendMessage(msg.chat.id, '❌ Error fetching text.');
  }
});

// /help - Show all commands
bot.onText(/\/help/, async (msg) => {
  await bot.sendMessage(msg.chat.id, buildHelpMessage(), { parse_mode: 'Markdown' });
});

// /about - About the bot
bot.onText(/\/about/, async (msg) => {
  await bot.sendMessage(msg.chat.id, buildAboutMessage(), { parse_mode: 'Markdown' });
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

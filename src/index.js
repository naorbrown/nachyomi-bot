/**
 * Nach Yomi Telegram Bot
 *
 * Daily Nach Yomi chapter with Rav Breitowitz's shiurim from Kol Halashon.
 * Features: Embedded video + audio, full Hebrew + English text
 *
 * Commands:
 *   /today - Get today's Nach Yomi (video + audio + text)
 *   /start - Same as /today
 *   /video - Watch the video shiur
 *   /audio - Listen to the audio shiur
 *   /text  - Read the chapter
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

// Rate limiting: 5 requests per minute per user
const rateLimits = new Map();
const RATE_LIMIT = 5;
const RATE_WINDOW = 60000; // 1 minute

function isRateLimited(chatId) {
  const now = Date.now();
  const userHistory = rateLimits.get(chatId) || [];
  const recentRequests = userHistory.filter(t => now - t < RATE_WINDOW);

  if (recentRequests.length >= RATE_LIMIT) {
    return true;
  }

  recentRequests.push(now);
  rateLimits.set(chatId, recentRequests);

  // Cleanup old entries periodically
  if (rateLimits.size > 1000) {
    for (const [id, times] of rateLimits) {
      if (times.every(t => now - t > RATE_WINDOW)) {
        rateLimits.delete(id);
      }
    }
  }

  return false;
}

// Initialize
(async () => {
  ffmpegAvailable = await checkFfmpeg();

  // Set bot commands programmatically
  await bot.setMyCommands([
    { command: 'today', description: "Get today's Nach Yomi" },
    { command: 'start', description: "Get today's shiur" },
    { command: 'video', description: 'Watch the video shiur' },
    { command: 'audio', description: 'Listen to the audio shiur' },
    { command: 'text', description: 'Read the chapter' }
  ]);

  console.log('Nach Yomi Bot started');
  console.log(`FFmpeg: ${ffmpegAvailable ? 'yes' : 'no'}`);
  console.log('Commands registered');
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

/**
 * Parse command from message text
 * Handles: /command, /command@botname, /command params
 * Returns: { command: 'start', params: 'optional params' } or null
 */
function parseCommand(text) {
  if (!text || typeof text !== 'string') return null;

  // Trim whitespace and newlines
  const trimmed = text.trim();

  // Must start with /
  if (!trimmed.startsWith('/')) return null;

  // Extract command: /command or /command@botname
  const spaceIndex = trimmed.indexOf(' ');
  const commandPart = spaceIndex > 0 ? trimmed.slice(0, spaceIndex) : trimmed;
  const params = spaceIndex > 0 ? trimmed.slice(spaceIndex + 1).trim() : '';

  // Parse command name (remove / and optional @botname)
  const atIndex = commandPart.indexOf('@');
  const command = atIndex > 0
    ? commandPart.slice(1, atIndex).toLowerCase()
    : commandPart.slice(1).toLowerCase();

  if (!command) return null;

  return { command, params };
}

// Single message handler for all commands
bot.on('message', async (msg) => {
  // Skip non-text messages
  if (!msg.text) return;

  const parsed = parseCommand(msg.text);
  if (!parsed) return;

  const { command } = parsed;
  const chatId = msg.chat.id;

  console.log(`[${new Date().toISOString()}] Command received: /${command} from chat ${chatId}`);

  // Rate limit check (except for broadcast which is admin-only)
  if (command !== 'broadcast' && isRateLimited(chatId)) {
    return bot.sendMessage(chatId, '_Please wait a moment before trying again._', { parse_mode: 'Markdown' });
  }

  try {
    switch (command) {
      case 'start':
      case 'today': {
        await bot.sendMessage(chatId, buildWelcomeMessage(), { parse_mode: 'Markdown' });
        await sendDailyNachYomi(chatId);
        break;
      }

      case 'video': {
        const nachYomi = await getTodaysNachYomi();
        const shiurId = getShiurId(nachYomi.book, nachYomi.chapter);
        await sendVideoShiur(chatId, nachYomi, shiurId);
        break;
      }

      case 'audio': {
        const nachYomi = await getTodaysNachYomi();
        const shiurId = getShiurId(nachYomi.book, nachYomi.chapter);
        await sendAudioShiur(chatId, nachYomi, shiurId);
        break;
      }

      case 'text': {
        const nachYomi = await getTodaysNachYomi();
        const chapterText = await getChapterText(nachYomi.book, nachYomi.chapter, { maxVerses: null }).catch(() => null);
        await sendChapterText(chatId, nachYomi, chapterText);
        break;
      }

      case 'broadcast': {
        // Admin only
        if (ADMIN_CHAT_ID && chatId.toString() !== ADMIN_CHAT_ID) {
          console.log(`Unauthorized broadcast attempt from ${chatId}`);
          return;
        }
        if (!CHANNEL_ID) {
          await bot.sendMessage(chatId, 'No channel configured.');
          return;
        }
        await sendDailyNachYomi(CHANNEL_ID);
        await bot.sendMessage(chatId, '✅ Broadcast sent.');
        break;
      }

      default:
        // Unknown command - ignore silently
        return;
    }
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Command /${command} failed:`, err.message);

    const errorMessages = {
      start: '❌ Error loading chapter. Please try again.',
      today: '❌ Error loading chapter. Please try again.',
      video: `❌ Error: ${err.message}`,
      audio: `❌ Error: ${err.message}`,
      text: '❌ Error fetching text.',
      broadcast: `❌ Broadcast failed: ${err.message}`
    };

    await bot.sendMessage(chatId, errorMessages[command] || '❌ An error occurred.').catch(() => {});
  }
});

// ============================================
// SCHEDULED TASKS
// ============================================

/**
 * Execute scheduled broadcast with retry logic
 */
async function runScheduledBroadcast() {
  const MAX_RETRIES = 3;
  const RETRY_DELAYS = [30000, 60000, 120000]; // 30s, 1m, 2m

  console.log(`[${new Date().toISOString()}] Running scheduled broadcast...`);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await sendDailyNachYomi(CHANNEL_ID);
      console.log(`[${new Date().toISOString()}] Scheduled broadcast completed successfully`);
      if (ADMIN_CHAT_ID) {
        bot.sendMessage(ADMIN_CHAT_ID, `✅ Daily broadcast sent successfully`).catch(() => {});
      }
      return; // Success - exit retry loop
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Broadcast attempt ${attempt}/${MAX_RETRIES} failed:`, err.message);

      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAYS[attempt - 1];
        console.log(`Retrying in ${delay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // All retries exhausted
        console.error(`[${new Date().toISOString()}] All broadcast attempts failed`);
        if (ADMIN_CHAT_ID) {
          bot.sendMessage(ADMIN_CHAT_ID, `❌ Scheduled broadcast failed after ${MAX_RETRIES} attempts: ${err.message}`).catch(() => {});
        }
      }
    }
  }
}

// Daily post at 6:00 AM Israel time (handles DST automatically)
if (CHANNEL_ID) {
  cron.schedule('0 6 * * *', runScheduledBroadcast, { timezone: 'Asia/Jerusalem' });
  console.log(`Scheduled daily post to ${CHANNEL_ID} at 6:00 AM Israel (Asia/Jerusalem timezone)`);
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

/**
 * Nach Yomi Telegram Bot
 *
 * Daily Nach Yomi chapter with Rav Breitowitz's shiurim from Kol Halashon.
 * Features: Embedded audio shiur, video link, full Hebrew + English text
 *
 * Commands:
 *   /start - Get today's Nach Yomi (audio + video link + text)
 *   /today - Same as /start
 *   /audio - Listen to the audio shiur (embedded)
 *   /video - Get link to watch the video shiur
 *   /text  - Read the chapter
 */

import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';
import cron from 'node-cron';
import { getTodaysNachYomi } from './hebcalService.js';
import { getChapterText } from './sefariaService.js';
import {
  buildDailyMessages,
  buildKeyboard,
  buildMediaCaption,
  buildMediaKeyboard,
  buildWelcomeMessage,
} from './messageBuilder.js';
import { getShiurId, getShiurAudioUrl, getShiurUrl } from './data/shiurMapping.js';
import { isUnifiedChannelEnabled, publishTextToUnified } from './unified/index.js';

// Configuration
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

if (!BOT_TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN required');
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

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
  // Set bot commands programmatically
  await bot.setMyCommands([
    { command: 'start', description: "Today's shiur (audio + video link + text)" },
    { command: 'today', description: "Today's Nach Yomi" },
    { command: 'audio', description: 'Listen to the audio shiur' },
    { command: 'video', description: 'Get video shiur link' },
    { command: 'text', description: 'Read the chapter' },
  ]);

  console.log('Nach Yomi Bot started');
  console.log('Commands registered');
})();

/**
 * Send video shiur link for a chapter
 * Sends a link to watch the video on Kol Halashon
 */
async function sendVideoLink(chatId, nachYomi, shiurId) {
  const shiurPageUrl = getShiurUrl(nachYomi.book, nachYomi.chapter);

  if (!shiurId) {
    await bot.sendMessage(
      chatId,
      `🎬 *Video Shiur*\n\n` +
        `_${nachYomi.book} ${nachYomi.chapter}_\n\n` +
        `[Watch on Kol Halashon](${shiurPageUrl})`,
      { parse_mode: 'Markdown', disable_web_page_preview: true }
    );
    return true;
  }

  await bot.sendMessage(
    chatId,
    `🎬 *Video Shiur*\n` +
      `_${nachYomi.book} ${nachYomi.chapter}_ · Rav Yitzchok Breitowitz\n\n` +
      `[Watch Full Video Shiur](${shiurPageUrl})`,
    {
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
      reply_markup: buildMediaKeyboard(nachYomi.book, nachYomi.chapter),
    }
  );
  console.log(`Video link sent: ${nachYomi.book} ${nachYomi.chapter}`);
  return true;
}

/**
 * Send audio shiur for a chapter
 */
async function sendAudioShiur(chatId, nachYomi, shiurId) {
  if (!shiurId) {
    // No specific shiur ID - provide link to Kol Halashon page
    const shiurPageUrl = getShiurUrl(nachYomi.book, nachYomi.chapter);
    await bot.sendMessage(
      chatId,
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
      reply_markup: buildMediaKeyboard(nachYomi.book, nachYomi.chapter),
    });
    console.log(`Audio sent: ${nachYomi.book} ${nachYomi.chapter}`);
    return true;
  } catch (err) {
    console.warn('Audio failed:', err.message);
    // Notify user of failure with fallback link
    const shiurPageUrl = getShiurUrl(nachYomi.book, nachYomi.chapter);
    await bot
      .sendMessage(
        chatId,
        `🎧 *Audio Shiur*\n\n` +
          `Audio loading failed. Listen on Kol Halashon instead:\n\n` +
          `[Listen to Full Shiur](${shiurPageUrl})`,
        { parse_mode: 'Markdown', disable_web_page_preview: true }
      )
      .catch(() => {});
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
      disable_web_page_preview: true,
    });
  }

  console.log(`Text sent: ${messages.length} message(s)`);
  return messages.length;
}

/**
 * Send daily Nach Yomi - AUDIO (primary) + VIDEO LINK + TEXT
 * Audio is the most prominent content, sent first
 */
async function sendDailyNachYomi(chatId, options = {}) {
  const { videoOnly = false, audioOnly = false, textOnly = false } = options;

  try {
    const nachYomi = await getTodaysNachYomi();
    console.log(`Sending: ${nachYomi.book} ${nachYomi.chapter}`);

    const shiurId = getShiurId(nachYomi.book, nachYomi.chapter);

    // 1. AUDIO (primary content - embedded, most important)
    if (!videoOnly && !textOnly && shiurId) {
      await sendAudioShiur(chatId, nachYomi, shiurId);
    }

    // 2. VIDEO LINK (link to Kol Halashon)
    if (!audioOnly && !textOnly) {
      await sendVideoLink(chatId, nachYomi, shiurId);
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
  const command =
    atIndex > 0 ? commandPart.slice(1, atIndex).toLowerCase() : commandPart.slice(1).toLowerCase();

  if (!command) return null;

  return { command, params };
}

// Single message handler for all commands
bot.on('message', async msg => {
  // Skip non-text messages
  if (!msg.text) return;

  const parsed = parseCommand(msg.text);
  if (!parsed) return;

  const { command } = parsed;
  const chatId = msg.chat.id;

  console.log(`[${new Date().toISOString()}] Command received: /${command} from chat ${chatId}`);

  // Rate limit check (except for broadcast which is admin-only)
  if (command !== 'broadcast' && isRateLimited(chatId)) {
    return bot.sendMessage(chatId, '_Please wait a moment before trying again._', {
      parse_mode: 'Markdown',
    });
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
        await sendVideoLink(chatId, nachYomi, shiurId);
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
        const chapterText = await getChapterText(nachYomi.book, nachYomi.chapter, {
          maxVerses: null,
        }).catch(() => null);
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
      broadcast: `❌ Broadcast failed: ${err.message}`,
    };

    await bot
      .sendMessage(chatId, errorMessages[command] || '❌ An error occurred.')
      .catch(() => {});
  }
});

// ============================================
// UNIFIED CHANNEL PUBLISHING
// ============================================

/**
 * Send a condensed summary to the unified Torah Yomi channel
 * This is a simplified version optimized for the aggregated channel
 */
async function sendToUnifiedChannel() {
  if (!isUnifiedChannelEnabled()) {
    console.log('Unified channel not configured, skipping');
    return;
  }

  try {
    const nachYomi = await getTodaysNachYomi();
    console.log(`Publishing to unified channel: ${nachYomi.book} ${nachYomi.chapter}`);

    let chapterText = null;

    try {
      chapterText = await getChapterText(nachYomi.book, nachYomi.chapter, { maxVerses: 3 });
    } catch (err) {
      console.warn('Text fetch for unified channel failed:', err.message);
    }

    // Build summary message for unified channel
    let summaryText = `📖 *${nachYomi.book} ${nachYomi.chapter}*\n`;
    summaryText += `_${nachYomi.hebrewBook || ''}_\n\n`;

    if (chapterText && chapterText.verses && chapterText.verses.length > 0) {
      const firstVerse = chapterText.verses[0];
      if (firstVerse.hebrew) {
        summaryText += `*פסוק א׳:*\n${firstVerse.hebrew}\n\n`;
      }
    }

    summaryText += `🎧 Audio shiur + 🎬 Video link\n`;
    summaryText += `📚 Full chapter with Hebrew/English text\n\n`;
    summaryText += `_Rav Yitzchok Breitowitz_`;

    await publishTextToUnified(summaryText);
    console.log('Published to unified channel successfully');
  } catch (error) {
    console.error('Unified channel publish failed:', error.message);
    // Don't throw - unified channel failure shouldn't affect primary bot
  }
}

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

      // After successful primary broadcast, publish to unified channel
      try {
        await sendToUnifiedChannel();
      } catch (unifiedErr) {
        console.error('Unified channel publish failed:', unifiedErr.message);
        // Don't throw - unified channel is non-critical
      }

      if (ADMIN_CHAT_ID) {
        bot.sendMessage(ADMIN_CHAT_ID, `✅ Daily broadcast sent successfully`).catch(() => {});
      }
      return; // Success - exit retry loop
    } catch (err) {
      console.error(
        `[${new Date().toISOString()}] Broadcast attempt ${attempt}/${MAX_RETRIES} failed:`,
        err.message
      );

      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAYS[attempt - 1];
        console.log(`Retrying in ${delay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // All retries exhausted
        console.error(`[${new Date().toISOString()}] All broadcast attempts failed`);
        if (ADMIN_CHAT_ID) {
          bot
            .sendMessage(
              ADMIN_CHAT_ID,
              `❌ Scheduled broadcast failed after ${MAX_RETRIES} attempts: ${err.message}`
            )
            .catch(() => {});
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

bot.on('polling_error', err => console.error('Polling error:', err.message));
bot.on('error', err => console.error('Bot error:', err.message));

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

/**
 * Torah Yomi Unified Channel Publisher for Nach Yomi Bot
 *
 * Publishes content to the unified Torah Yomi channel.
 * Handles rate limiting, retries, and proper message formatting.
 */

import TelegramBot from 'node-telegram-bot-api';
import { createReadStream } from 'fs';

// Configuration from environment
const UNIFIED_CHANNEL_ID = process.env.TORAH_YOMI_CHANNEL_ID;
const UNIFIED_BOT_TOKEN = process.env.TORAH_YOMI_CHANNEL_BOT_TOKEN;
const PUBLISH_ENABLED = process.env.TORAH_YOMI_PUBLISH_ENABLED !== 'false';

// Source configuration
const SOURCE = 'nach_yomi';
const BADGE = '📖 Nach Yomi | נ"ך יומי';
const BOT_USERNAME = 'NachYomiBot';

// Rate limiting
const RATE_LIMIT_DELAY = 100; // ms between messages
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // ms

let unifiedBot = null;

/**
 * Get or create the unified channel bot instance
 */
function getBot() {
  if (!unifiedBot && UNIFIED_BOT_TOKEN) {
    unifiedBot = new TelegramBot(UNIFIED_BOT_TOKEN);
  }
  return unifiedBot;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format message with unified channel header/footer
 */
function formatForUnifiedChannel(content) {
  const header = `${BADGE}\n${'─'.repeat(30)}\n\n`;
  const footer = `\n\n${'━'.repeat(30)}\n🔗 @${BOT_USERNAME}`;
  return `${header}${content}${footer}`;
}

/**
 * Check if unified channel publishing is enabled
 */
export function isUnifiedChannelEnabled() {
  return PUBLISH_ENABLED && !!UNIFIED_CHANNEL_ID && !!UNIFIED_BOT_TOKEN;
}

/**
 * Publish a text message to the unified channel
 */
export async function publishTextToUnified(text, options = {}) {
  if (!isUnifiedChannelEnabled()) {
    console.log('[TorahYomi] Unified channel publish disabled or not configured');
    return false;
  }

  const bot = getBot();
  if (!bot) {
    console.error('[TorahYomi] No bot token configured');
    return false;
  }

  const formattedText = formatForUnifiedChannel(text);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await bot.sendMessage(UNIFIED_CHANNEL_ID, formattedText, {
        parse_mode: 'Markdown',
        disable_notification: false,
        disable_web_page_preview: true,
        ...options
      });
      console.log(`[TorahYomi] Published text to unified channel`);
      return true;
    } catch (error) {
      console.error(`[TorahYomi] Publish attempt ${attempt} failed:`, error.message);
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY * attempt);
      }
    }
  }

  console.error('[TorahYomi] All publish attempts failed');
  return false;
}

/**
 * Publish a video to the unified channel
 */
export async function publishVideoToUnified(video, caption, options = {}) {
  if (!isUnifiedChannelEnabled()) {
    console.log('[TorahYomi] Unified channel publish disabled or not configured');
    return false;
  }

  const bot = getBot();
  if (!bot) {
    console.error('[TorahYomi] No bot token configured');
    return false;
  }

  const formattedCaption = formatForUnifiedChannel(caption);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Handle file streams by creating a new one for retries
      const videoSource = typeof video === 'string' ? video : createReadStream(video.path || video);
      await bot.sendVideo(UNIFIED_CHANNEL_ID, videoSource, {
        caption: formattedCaption,
        parse_mode: 'Markdown',
        supports_streaming: true,
        ...options
      });
      console.log(`[TorahYomi] Published video to unified channel`);
      return true;
    } catch (error) {
      console.error(`[TorahYomi] Video publish attempt ${attempt} failed:`, error.message);
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY * attempt);
      }
    }
  }

  console.error('[TorahYomi] All video publish attempts failed');
  return false;
}

/**
 * Publish an audio file to the unified channel
 */
export async function publishAudioToUnified(audio, caption, options = {}) {
  if (!isUnifiedChannelEnabled()) {
    console.log('[TorahYomi] Unified channel publish disabled or not configured');
    return false;
  }

  const bot = getBot();
  if (!bot) {
    console.error('[TorahYomi] No bot token configured');
    return false;
  }

  const formattedCaption = formatForUnifiedChannel(caption);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await bot.sendAudio(UNIFIED_CHANNEL_ID, audio, {
        caption: formattedCaption,
        parse_mode: 'Markdown',
        ...options
      });
      console.log(`[TorahYomi] Published audio to unified channel`);
      return true;
    } catch (error) {
      console.error(`[TorahYomi] Audio publish attempt ${attempt} failed:`, error.message);
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY * attempt);
      }
    }
  }

  console.error('[TorahYomi] All audio publish attempts failed');
  return false;
}

/**
 * Publish the daily Nach Yomi content to the unified channel
 * This mirrors the sendDailyNachYomi function but sends to unified channel
 */
export async function publishDailyToUnified(nachYomi, shiurId, chapterText, videoPath = null) {
  if (!isUnifiedChannelEnabled()) {
    return { success: 0, failed: 0 };
  }

  let success = 0;
  let failed = 0;

  // Build a summary message for the unified channel
  const summaryText = buildUnifiedSummary(nachYomi, shiurId, chapterText);

  // 1. Publish video if available
  if (videoPath) {
    const videoCaption = `🎬 *${nachYomi.book} ${nachYomi.chapter}*\n_Video shiur by Rav Yitzchok Breitowitz_`;
    if (await publishVideoToUnified(videoPath, videoCaption)) {
      success++;
    } else {
      failed++;
    }
    await sleep(RATE_LIMIT_DELAY);
  }

  // 2. Publish summary text
  if (await publishTextToUnified(summaryText)) {
    success++;
  } else {
    failed++;
  }

  return { success, failed };
}

/**
 * Build unified channel summary message
 */
function buildUnifiedSummary(nachYomi, shiurId, chapterText) {
  let text = `📖 *${nachYomi.book} ${nachYomi.chapter}*\n`;
  text += `_${nachYomi.hebrewBook} ${nachYomi.hebrewChapter || ''}_\n\n`;

  if (chapterText && chapterText.verses && chapterText.verses.length > 0) {
    // Include first verse as preview
    const firstVerse = chapterText.verses[0];
    if (firstVerse.hebrew) {
      text += `*פסוק א׳:*\n${firstVerse.hebrew}\n\n`;
    }
  }

  text += `🎧 Audio & 🎬 Video shiurim by *Rav Yitzchok Breitowitz*\n`;
  text += `📚 Full chapter with Hebrew/English text\n\n`;
  text += `_Use @NachYomiBot for the complete experience_`;

  return text;
}

export default {
  isUnifiedChannelEnabled,
  publishTextToUnified,
  publishVideoToUnified,
  publishAudioToUnified,
  publishDailyToUnified
};

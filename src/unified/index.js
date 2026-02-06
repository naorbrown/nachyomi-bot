/**
 * Torah Yomi Unified Channel Publisher for Nach Yomi Bot
 *
 * Publishes content to the unified Torah Yomi channel.
 * Handles rate limiting, duplicate prevention, and proper message formatting.
 *
 * Duplicate prevention uses a content-hash tracker file that persists across
 * process restarts within the same day. This prevents double-publishes from:
 * - Dual cron schedules (DST handling)
 * - Process restarts / redeployments
 * - Manual re-triggers
 */

import TelegramBot from 'node-telegram-bot-api';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createReadStream } from 'fs';

// Configuration from environment
const UNIFIED_CHANNEL_ID = process.env.TORAH_YOMI_CHANNEL_ID;
const UNIFIED_BOT_TOKEN = process.env.TORAH_YOMI_CHANNEL_BOT_TOKEN;
const PUBLISH_ENABLED = process.env.TORAH_YOMI_PUBLISH_ENABLED !== 'false';

// Source configuration
const SOURCE = 'nach_yomi';
const BADGE = '📖 Nach Yomi | נ"ך יומי';
const BOT_USERNAME = 'NachYomiBot';

// Duplicate tracking
const TRACKER_DIR = process.env.TORAH_YOMI_TRACKER_DIR || path.join(os.tmpdir(), 'torah-yomi-channel');
const TRACKER_FILE = path.join(TRACKER_DIR, 'published-hashes.json');
const LOCK_FILE = path.join(TRACKER_DIR, 'published-hashes.lock');
const LOCK_TIMEOUT_MS = 5000;
const LOCK_RETRY_INTERVAL_MS = 50;
const LOCK_STALE_MS = 30000;

// Rate limiting
const RATE_LIMIT_DELAY = 100; // ms between messages
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // ms

let unifiedBot = null;

// ─── Duplicate Tracker ───────────────────────────────────────────────────────

/**
 * Get today's date as YYYY-MM-DD in Israel timezone.
 * Must match broadcastState.js to avoid dedup reset at wrong boundary.
 */
function todayISO() {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Jerusalem',
  }).format(new Date());
}

let publishedHashes = new Set();
let currentDate = todayISO();

function ensureTrackerDir() {
  try {
    if (!fs.existsSync(TRACKER_DIR)) {
      fs.mkdirSync(TRACKER_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn(`[TorahYomi] Could not create tracker directory: ${err.message}`);
  }
}

function loadTrackerFromFile() {
  try {
    if (fs.existsSync(TRACKER_FILE)) {
      const data = JSON.parse(fs.readFileSync(TRACKER_FILE, 'utf8'));
      if ((data.date || '') === currentDate) {
        publishedHashes = new Set(data.hashes || []);
        console.log(`[TorahYomi] Loaded ${publishedHashes.size} hashes from tracker`);
      } else {
        console.log(`[TorahYomi] Tracker date "${data.date}" differs from today "${currentDate}", starting fresh`);
        saveTrackerToFile();
      }
    }
  } catch (err) {
    console.warn(`[TorahYomi] Could not load tracker file: ${err.message}`);
  }
}

function saveTrackerToFile() {
  try {
    const data = {
      date: currentDate,
      hashes: Array.from(publishedHashes),
      lastUpdated: new Date().toISOString()
    };
    fs.writeFileSync(TRACKER_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.warn(`[TorahYomi] Could not save tracker file: ${err.message}`);
  }
}

function resetIfNewDay() {
  const today = todayISO();
  if (today !== currentDate) {
    publishedHashes.clear();
    currentDate = today;
    saveTrackerToFile();
  } else {
    loadTrackerFromFile();
  }
}

function computeHash(content, contentType = 'text') {
  const key = `${SOURCE}:${contentType}:${content}`;
  return crypto.createHash('sha256').update(key).digest('hex').slice(0, 16);
}

async function acquireLock() {
  const startTime = Date.now();
  while (Date.now() - startTime < LOCK_TIMEOUT_MS) {
    try {
      if (fs.existsSync(LOCK_FILE)) {
        const lockStat = fs.statSync(LOCK_FILE);
        if (Date.now() - lockStat.mtimeMs > LOCK_STALE_MS) {
          console.warn('[TorahYomi] Removing stale lock file');
          fs.unlinkSync(LOCK_FILE);
        }
      }
      fs.writeFileSync(LOCK_FILE, `${process.pid}:${Date.now()}`, { flag: 'wx' });
      return true;
    } catch (err) {
      if (err.code === 'EEXIST') {
        await new Promise(resolve => setTimeout(resolve, LOCK_RETRY_INTERVAL_MS));
      } else {
        console.warn(`[TorahYomi] Lock acquisition error: ${err.message}`);
        return false;
      }
    }
  }
  console.warn(`[TorahYomi] Lock acquisition timeout after ${LOCK_TIMEOUT_MS}ms`);
  return false;
}

function releaseLock() {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      fs.unlinkSync(LOCK_FILE);
    }
  } catch (err) {
    console.warn(`[TorahYomi] Could not release lock: ${err.message}`);
  }
}

/**
 * Atomically check if content is a duplicate and mark it as published if not.
 * @returns {Promise<{isDuplicate: boolean, hash: string}>}
 */
async function checkAndMarkPublished(content, contentType = 'text') {
  const contentHash = computeHash(content, contentType);

  const lockAcquired = await acquireLock();
  if (!lockAcquired) {
    // Can't get lock — treat as duplicate to prevent double-publish
    console.warn('[TorahYomi] Could not acquire lock, skipping publish to prevent duplicate');
    return { isDuplicate: true, hash: contentHash };
  }

  try {
    resetIfNewDay();

    if (publishedHashes.has(contentHash)) {
      console.log(`[TorahYomi] Duplicate detected: ${contentHash.slice(0, 8)}... (${contentType})`);
      return { isDuplicate: true, hash: contentHash };
    }

    publishedHashes.add(contentHash);
    saveTrackerToFile();
    console.log(`[TorahYomi] Reserved for publishing: ${contentHash.slice(0, 8)}... (${contentType})`);
    return { isDuplicate: false, hash: contentHash };
  } finally {
    releaseLock();
  }
}

// Initialize tracker
ensureTrackerDir();
loadTrackerFromFile();

// ─── Retry Safety ────────────────────────────────────────────────────────────

/**
 * Determine if a Telegram API error is safe to retry without risking duplicates.
 * Only retry on errors where we are confident the message was NOT delivered.
 */
function isRetryableError(error) {
  const code = error.code || error.response?.statusCode;

  // 429 Too Many Requests — not sent, safe to retry
  if (code === 429) return true;
  // 5xx — Telegram didn't process the request
  if (typeof code === 'number' && code >= 500) return true;
  // DNS failures — request never left the machine
  if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') return true;
  // Connection refused — server not reachable
  if (error.code === 'ECONNREFUSED') return true;
  // 400 Bad Request — format issue, not delivered
  if (code === 400) return true;

  // All other errors (ETIMEDOUT, ECONNRESET, etc.) are ambiguous — do NOT retry
  return false;
}

// ─── Bot & Formatting ────────────────────────────────────────────────────────

function getBot() {
  if (!unifiedBot && UNIFIED_BOT_TOKEN) {
    unifiedBot = new TelegramBot(UNIFIED_BOT_TOKEN);
  }
  return unifiedBot;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
 * Publish a text message to the unified channel (with duplicate prevention).
 * @returns {Promise<'sent'|'skipped'|'failed'>}
 */
export async function publishTextToUnified(text, options = {}) {
  if (!isUnifiedChannelEnabled()) {
    console.log('[TorahYomi] Unified channel publish disabled or not configured');
    return 'skipped';
  }

  const { isDuplicate } = await checkAndMarkPublished(text, 'text');
  if (isDuplicate) {
    console.warn('[TorahYomi] Duplicate text detected, skipping publish');
    return 'skipped';
  }

  const bot = getBot();
  if (!bot) {
    console.error('[TorahYomi] No bot token configured');
    return 'failed';
  }

  const formattedText = formatForUnifiedChannel(text);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await bot.sendMessage(UNIFIED_CHANNEL_ID, formattedText, {
        parse_mode: 'Markdown',
        disable_notification: false,
        disable_web_page_preview: true,
        ...options,
      });
      console.log('[TorahYomi] Published text to unified channel');
      return 'sent';
    } catch (error) {
      console.error(`[TorahYomi] Publish attempt ${attempt} failed:`, error.message);
      if (isRetryableError(error) && attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY * attempt);
      } else {
        break;
      }
    }
  }

  console.error('[TorahYomi] All publish attempts failed');
  return 'failed';
}

/**
 * Publish a video to the unified channel (with duplicate prevention).
 * @returns {Promise<'sent'|'skipped'|'failed'>}
 */
export async function publishVideoToUnified(video, caption, options = {}) {
  if (!isUnifiedChannelEnabled()) {
    console.log('[TorahYomi] Unified channel publish disabled or not configured');
    return 'skipped';
  }

  const contentKey = `${video}:${caption}`;
  const { isDuplicate } = await checkAndMarkPublished(contentKey, 'video');
  if (isDuplicate) {
    console.warn('[TorahYomi] Duplicate video detected, skipping publish');
    return 'skipped';
  }

  const bot = getBot();
  if (!bot) {
    console.error('[TorahYomi] No bot token configured');
    return 'failed';
  }

  const formattedCaption = formatForUnifiedChannel(caption);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const videoSource = typeof video === 'string' ? video : createReadStream(video.path || video);
      await bot.sendVideo(UNIFIED_CHANNEL_ID, videoSource, {
        caption: formattedCaption,
        parse_mode: 'Markdown',
        supports_streaming: true,
        ...options,
      });
      console.log('[TorahYomi] Published video to unified channel');
      return 'sent';
    } catch (error) {
      console.error(`[TorahYomi] Video publish attempt ${attempt} failed:`, error.message);
      if (isRetryableError(error) && attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY * attempt);
      } else {
        break;
      }
    }
  }

  console.error('[TorahYomi] All video publish attempts failed');
  return 'failed';
}

/**
 * Publish an audio file to the unified channel (with duplicate prevention).
 * @returns {Promise<'sent'|'skipped'|'failed'>}
 */
export async function publishAudioToUnified(audio, caption, options = {}) {
  if (!isUnifiedChannelEnabled()) {
    console.log('[TorahYomi] Unified channel publish disabled or not configured');
    return 'skipped';
  }

  const contentKey = `${audio}:${caption}`;
  const { isDuplicate } = await checkAndMarkPublished(contentKey, 'audio');
  if (isDuplicate) {
    console.warn('[TorahYomi] Duplicate audio detected, skipping publish');
    return 'skipped';
  }

  const bot = getBot();
  if (!bot) {
    console.error('[TorahYomi] No bot token configured');
    return 'failed';
  }

  const formattedCaption = formatForUnifiedChannel(caption);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await bot.sendAudio(UNIFIED_CHANNEL_ID, audio, {
        caption: formattedCaption,
        parse_mode: 'Markdown',
        ...options,
      });
      console.log('[TorahYomi] Published audio to unified channel');
      return 'sent';
    } catch (error) {
      console.error(`[TorahYomi] Audio publish attempt ${attempt} failed:`, error.message);
      if (isRetryableError(error) && attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY * attempt);
      } else {
        break;
      }
    }
  }

  console.error('[TorahYomi] All audio publish attempts failed');
  return 'failed';
}

/**
 * Publish the daily Nach Yomi content to the unified channel.
 * Uses duplicate prevention — safe to call multiple times per day.
 * @returns {Promise<{sent: number, skipped: number, failed: number}>}
 */
export async function publishDailyToUnified(nachYomi, shiurId, chapterText, videoPath = null) {
  if (!isUnifiedChannelEnabled()) {
    return { sent: 0, skipped: 0, failed: 0 };
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  function tally(result) {
    if (result === 'sent') sent++;
    else if (result === 'skipped') skipped++;
    else failed++;
  }

  const summaryText = buildUnifiedSummary(nachYomi, shiurId, chapterText);

  // 1. Publish video if available
  if (videoPath) {
    const videoCaption = `🎬 *${nachYomi.book} ${nachYomi.chapter}*\n_Video shiur by Rav Yitzchok Breitowitz_`;
    tally(await publishVideoToUnified(videoPath, videoCaption));
    await sleep(RATE_LIMIT_DELAY);
  }

  // 2. Publish summary text
  tally(await publishTextToUnified(summaryText));

  return { sent, skipped, failed };
}

/**
 * Build unified channel summary message
 */
function buildUnifiedSummary(nachYomi, shiurId, chapterText) {
  let text = `📖 *${nachYomi.book} ${nachYomi.chapter}*\n`;
  text += `_${nachYomi.hebrewBook} ${nachYomi.hebrewChapter || ''}_\n\n`;

  if (chapterText && chapterText.verses && chapterText.verses.length > 0) {
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
  publishDailyToUnified,
};

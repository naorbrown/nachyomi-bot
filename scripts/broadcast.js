#!/usr/bin/env node
/**
 * Daily Broadcast Script
 *
 * Sends today's Nach Yomi to:
 * 1. The Telegram channel (TELEGRAM_CHANNEL_ID) - optional
 * 2. Torah Yomi unified channel (TORAH_YOMI_CHANNEL_ID) - optional
 * 3. All private bot subscribers
 * 4. Admin chat (TELEGRAM_CHAT_ID) - always included
 *
 * Content: Audio (embedded) + Video Link + Full Text
 *
 * Usage: node scripts/broadcast.js
 * Requires: TELEGRAM_BOT_TOKEN
 * Optional: TELEGRAM_CHANNEL_ID, TELEGRAM_CHAT_ID, TORAH_YOMI_*
 */

import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';
import { getTodaysNachYomi } from '../src/hebcalService.js';
import { getChapterText } from '../src/sefariaService.js';
import {
  buildDailyMessages,
  buildKeyboard,
  buildMediaCaption,
  buildMediaKeyboard,
} from '../src/messageBuilder.js';
import { getShiurId, getShiurAudioUrl, getShiurUrl } from '../src/data/shiurMapping.js';
import { isIsrael6am, getIsraelHour } from '../src/utils/israelTime.js';
import { loadSubscribers } from '../src/utils/subscribers.js';
import { wasBroadcastSentToday, markBroadcastSent, getIsraelDate } from '../src/utils/broadcastState.js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
const FORCE_BROADCAST = process.env.FORCE_BROADCAST === 'true';

// Torah Yomi unified channel (uses separate bot)
const TORAH_YOMI_CHANNEL_ID = process.env.TORAH_YOMI_CHANNEL_ID;
const TORAH_YOMI_BOT_TOKEN = process.env.TORAH_YOMI_CHANNEL_BOT_TOKEN;
const TORAH_YOMI_ENABLED = process.env.TORAH_YOMI_PUBLISH_ENABLED !== 'false';

console.log('=== BROADCAST CONFIGURATION ===');
console.log(`BOT_TOKEN: ${BOT_TOKEN ? '***' + BOT_TOKEN.slice(-4) : 'NOT SET'}`);
console.log(`CHANNEL_ID: ${CHANNEL_ID || 'NOT SET'}`);
console.log(`TELEGRAM_CHAT_ID: ${ADMIN_CHAT_ID || 'NOT SET'}`);
console.log(`TORAH_YOMI_CHANNEL: ${TORAH_YOMI_ENABLED && TORAH_YOMI_CHANNEL_ID ? 'ENABLED' : 'DISABLED'}`);
console.log(`FORCE_BROADCAST: ${FORCE_BROADCAST}`);

// Diagnostic checks
if (ADMIN_CHAT_ID && CHANNEL_ID && ADMIN_CHAT_ID === CHANNEL_ID) {
  console.warn('WARNING: ADMIN_CHAT_ID equals CHANNEL_ID - private chat will not receive separate broadcast!');
}
if (ADMIN_CHAT_ID && ADMIN_CHAT_ID.startsWith('-')) {
  console.warn('WARNING: ADMIN_CHAT_ID starts with "-" which indicates a group/channel, not a private chat!');
  console.warn('Private user chat IDs are positive numbers (e.g., 123456789)');
}

if (!BOT_TOKEN) {
  console.error('ERROR: TELEGRAM_BOT_TOKEN is required');
  process.exit(1);
}

if (!ADMIN_CHAT_ID && !CHANNEL_ID) {
  console.error('ERROR: At least one of ADMIN_CHAT_ID or CHANNEL_ID must be set');
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: false });

// Torah Yomi bot (separate instance with different token)
const torahYomiBot =
  TORAH_YOMI_ENABLED && TORAH_YOMI_BOT_TOKEN
    ? new TelegramBot(TORAH_YOMI_BOT_TOKEN, { polling: false })
    : null;

/**
 * Send audio shiur (embedded)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function sendAudio(chatId, nachYomi, shiurId, botInstance = bot) {
  if (!shiurId) {
    return { success: false, error: 'No shiur ID' };
  }

  try {
    const audioUrl = getShiurAudioUrl(shiurId);
    console.log(`  Sending audio to ${chatId}...`);
    await botInstance.sendAudio(chatId, audioUrl, {
      title: `${nachYomi.book} ${nachYomi.chapter}`,
      performer: 'Rav Yitzchok Breitowitz',
      caption: buildMediaCaption(nachYomi, 'audio'),
      parse_mode: 'Markdown',
      reply_markup: buildMediaKeyboard(nachYomi.book, nachYomi.chapter),
    });
    console.log(`  Audio sent successfully to ${chatId}`);
    return { success: true };
  } catch (err) {
    console.error(`  Audio FAILED for ${chatId}: ${err.message}`);
    return { success: false, error: err.message };
  }
}

/**
 * Send video link
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function sendVideoLink(chatId, nachYomi, botInstance = bot) {
  const shiurPageUrl = getShiurUrl(nachYomi.book, nachYomi.chapter);

  try {
    console.log(`  Sending video link to ${chatId}...`);
    await botInstance.sendMessage(chatId, `[Watch Video Shiur](${shiurPageUrl})`, {
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
    });
    console.log(`  Video link sent successfully to ${chatId}`);
    return { success: true };
  } catch (err) {
    console.error(`  Video link FAILED for ${chatId}: ${err.message}`);
    return { success: false, error: err.message };
  }
}

/**
 * Send chapter text
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function sendText(chatId, nachYomi, chapterText, botInstance = bot) {
  try {
    const messages = buildDailyMessages(nachYomi, chapterText);
    console.log(`  Sending ${messages.length} text message(s) to ${chatId}...`);

    for (let i = 0; i < messages.length; i++) {
      const isLast = i === messages.length - 1;
      await botInstance.sendMessage(chatId, messages[i], {
        parse_mode: 'Markdown',
        reply_markup: isLast ? buildKeyboard(nachYomi.book, nachYomi.chapter) : undefined,
        disable_web_page_preview: true,
      });
    }
    console.log(`  Text sent successfully to ${chatId}`);
    return { success: true };
  } catch (err) {
    console.error(`  Text FAILED for ${chatId}: ${err.message}`);
    return { success: false, error: err.message };
  }
}

/**
 * Send full daily content to a single chat
 * NO RETRY: Prevents duplicates if partial failure occurs
 * @returns {Promise<{audio: boolean, video: boolean, text: boolean, anySuccess: boolean}>}
 */
async function sendDailyContent(chatId, nachYomi, shiurId, chapterText, botInstance = bot) {
  console.log(`\nSending to chat ${chatId}:`);

  const audioResult = await sendAudio(chatId, nachYomi, shiurId, botInstance);
  const videoResult = await sendVideoLink(chatId, nachYomi, botInstance);
  const textResult = await sendText(chatId, nachYomi, chapterText, botInstance);

  const anySuccess = audioResult.success || videoResult.success || textResult.success;

  console.log(
    `  Result for ${chatId}: audio=${audioResult.success}, video=${videoResult.success}, text=${textResult.success}`
  );

  return {
    audio: audioResult.success,
    video: videoResult.success,
    text: textResult.success,
    anySuccess,
  };
}

async function runBroadcast() {
  console.log('\n=== DAILY BROADCAST ===');
  console.log(`Time (UTC): ${new Date().toISOString()}`);
  console.log(`Israel date: ${getIsraelDate()}`);
  console.log(`Israel hour: ${getIsraelHour()}`);

  // Check if already sent today (prevents duplicates from dual cron)
  const alreadySent = await wasBroadcastSentToday();
  if (alreadySent && !FORCE_BROADCAST) {
    console.log('Broadcast already sent today (Israel time), skipping.');
    console.log('Use FORCE_BROADCAST=true to override.');
    process.exit(0);
  }

  // Time check (skip if not 6am Israel, unless forced)
  if (!FORCE_BROADCAST && !isIsrael6am()) {
    console.log(`Not 6am Israel time (hour=${getIsraelHour()}), skipping.`);
    console.log('Use FORCE_BROADCAST=true to override.');
    process.exit(0);
  }

  console.log(FORCE_BROADCAST ? 'FORCE_BROADCAST enabled - bypassing checks' : '6am Israel time confirmed, not yet sent today');

  // Get today's Nach Yomi
  const nachYomi = await getTodaysNachYomi();
  console.log(`\nToday's Nach Yomi: ${nachYomi.book} ${nachYomi.chapter}`);

  const shiurId = getShiurId(nachYomi.book, nachYomi.chapter);
  console.log(`Shiur ID: ${shiurId || 'NOT FOUND'}`);

  // Fetch chapter text once (shared by all recipients)
  let chapterText = null;
  try {
    chapterText = await getChapterText(nachYomi.book, nachYomi.chapter, { maxVerses: null });
    console.log('Chapter text fetched successfully');
  } catch (err) {
    console.warn('Chapter text fetch failed:', err.message);
  }

  const results = {
    channel: { attempted: false, success: false },
    torahYomi: { attempted: false, success: false },
    subscribers: { total: 0, success: 0, failed: 0 },
  };

  // 1. Send to main channel (if configured)
  if (CHANNEL_ID) {
    console.log(`\n=== CHANNEL BROADCAST: ${CHANNEL_ID} ===`);
    results.channel.attempted = true;
    try {
      const channelResult = await sendDailyContent(CHANNEL_ID, nachYomi, shiurId, chapterText);
      results.channel.success = channelResult.anySuccess;
    } catch (err) {
      console.error(`Channel broadcast failed: ${err.message}`);
    }
  } else {
    console.log('\n=== CHANNEL: Not configured, skipping ===');
  }

  // 2. Send to Torah Yomi unified channel (if configured)
  if (torahYomiBot && TORAH_YOMI_CHANNEL_ID) {
    console.log(`\n=== TORAH YOMI CHANNEL: ${TORAH_YOMI_CHANNEL_ID} ===`);
    results.torahYomi.attempted = true;
    try {
      const torahYomiResult = await sendDailyContent(
        TORAH_YOMI_CHANNEL_ID,
        nachYomi,
        shiurId,
        chapterText,
        torahYomiBot
      );
      results.torahYomi.success = torahYomiResult.anySuccess;
    } catch (err) {
      console.error(`Torah Yomi channel broadcast failed: ${err.message}`);
    }
  } else {
    console.log('\n=== TORAH YOMI CHANNEL: Not configured, skipping ===');
  }

  // 3. Build subscriber list
  console.log('\n=== SUBSCRIBER BROADCAST ===');
  let subscribers = await loadSubscribers();
  console.log(`Loaded ${subscribers.length} subscribers from file`);

  // Always include ADMIN_CHAT_ID for private chat broadcast
  if (ADMIN_CHAT_ID) {
    const adminId = Number(ADMIN_CHAT_ID);
    if (!subscribers.includes(adminId)) {
      subscribers = [adminId, ...subscribers];
      console.log(`Added admin chat ${adminId} to subscriber list`);
    } else {
      console.log(`Admin chat ${adminId} already in subscriber list`);
    }
  }

  console.log(`Total subscribers to broadcast: ${subscribers.length}`);
  results.subscribers.total = subscribers.length;

  if (subscribers.length === 0) {
    console.log('WARNING: No subscribers to broadcast to!');
  }

  // 4. Send to each subscriber
  for (const chatId of subscribers) {
    try {
      const result = await sendDailyContent(chatId, nachYomi, shiurId, chapterText);
      if (result.anySuccess) {
        results.subscribers.success++;
      } else {
        results.subscribers.failed++;
        console.error(`All sends failed for ${chatId}`);
      }
      // Rate limit: small delay between users
      await new Promise((r) => setTimeout(r, 100));
    } catch (err) {
      console.error(`Unexpected error for ${chatId}: ${err.message}`);
      results.subscribers.failed++;
    }
  }

  // 5. Mark broadcast as sent (prevents duplicate from second cron)
  const anySuccess =
    results.channel.success || results.torahYomi.success || results.subscribers.success > 0;
  if (anySuccess) {
    await markBroadcastSent();
    console.log(`\nBroadcast state updated for ${getIsraelDate()}`);
  }

  // 6. Summary (logged only, no message sent to users)
  console.log('\n=== BROADCAST SUMMARY ===');
  console.log(`Nach Yomi: ${nachYomi.book} ${nachYomi.chapter}`);
  if (results.channel.attempted) {
    console.log(`Channel: ${results.channel.success ? 'SUCCESS' : 'FAILED'}`);
  }
  if (results.torahYomi.attempted) {
    console.log(`Torah Yomi: ${results.torahYomi.success ? 'SUCCESS' : 'FAILED'}`);
  }
  console.log(
    `Subscribers: ${results.subscribers.success}/${results.subscribers.total} successful, ${results.subscribers.failed} failed`
  );

  console.log('=== BROADCAST COMPLETE ===');
  process.exit(0);
}

runBroadcast().catch((err) => {
  console.error('FATAL ERROR:', err.message);
  console.error(err.stack);
  process.exit(1);
});

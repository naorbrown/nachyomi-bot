#!/usr/bin/env node
/**
 * Daily Broadcast Script
 *
 * Sends today's Nach Yomi to:
 * 1. The Telegram channel (TELEGRAM_CHANNEL_ID) - optional
 * 2. All private bot subscribers
 *
 * Content: Audio (embedded) + Video Link + Text
 *
 * Usage: node scripts/broadcast.js
 * Requires: TELEGRAM_BOT_TOKEN
 * Optional: TELEGRAM_CHANNEL_ID (for channel broadcast)
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

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const FORCE_BROADCAST = process.env.FORCE_BROADCAST === 'true';

if (!BOT_TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN required');
  process.exit(1);
}

// CHANNEL_ID is optional - broadcast will still go to subscribers

const bot = new TelegramBot(BOT_TOKEN, { polling: false });

/**
 * Send audio shiur (embedded)
 */
async function sendAudio(chatId, nachYomi, shiurId) {
  if (!shiurId) return false;

  try {
    const audioUrl = getShiurAudioUrl(shiurId);
    await bot.sendAudio(chatId, audioUrl, {
      title: `${nachYomi.book} ${nachYomi.chapter}`,
      performer: 'Rav Yitzchok Breitowitz',
      caption: buildMediaCaption(nachYomi, 'audio'),
      parse_mode: 'Markdown',
      reply_markup: buildMediaKeyboard(nachYomi.book, nachYomi.chapter),
    });
    return true;
  } catch (err) {
    console.warn(`Audio failed for ${chatId}:`, err.message);
    return false;
  }
}

/**
 * Send video link
 */
async function sendVideoLink(chatId, nachYomi) {
  const shiurPageUrl = getShiurUrl(nachYomi.book, nachYomi.chapter);

  try {
    await bot.sendMessage(
      chatId,
      `🎬 [Watch Video Shiur](${shiurPageUrl})`,
      {
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }
    );
    return true;
  } catch (err) {
    console.warn(`Video link failed for ${chatId}:`, err.message);
    return false;
  }
}

/**
 * Send chapter text
 */
async function sendText(chatId, nachYomi, chapterText) {
  try {
    const messages = buildDailyMessages(nachYomi, chapterText);

    for (let i = 0; i < messages.length; i++) {
      const isLast = i === messages.length - 1;
      await bot.sendMessage(chatId, messages[i], {
        parse_mode: 'Markdown',
        reply_markup: isLast ? buildKeyboard(nachYomi.book, nachYomi.chapter) : undefined,
        disable_web_page_preview: true,
      });
    }
    return true;
  } catch (err) {
    console.warn(`Text failed for ${chatId}:`, err.message);
    return false;
  }
}

/**
 * Send full daily content to a single chat
 * NO RETRY: Prevents duplicates if partial failure
 */
async function sendDailyContent(chatId, nachYomi, shiurId, chapterText) {
  // Audio first (primary content)
  await sendAudio(chatId, nachYomi, shiurId);

  // Video link
  await sendVideoLink(chatId, nachYomi);

  // Text
  await sendText(chatId, nachYomi, chapterText);
}

async function runBroadcast() {
  console.log('=== DAILY BROADCAST ===');
  console.log(`Time (UTC): ${new Date().toISOString()}`);
  console.log(`Israel hour: ${getIsraelHour()}`);

  // Time check (skip if not 6am Israel, unless forced)
  if (!FORCE_BROADCAST && !isIsrael6am()) {
    console.log(`Not 6am Israel time, skipping. Use FORCE_BROADCAST=true to override.`);
    process.exit(0);
  }

  // Get today's Nach Yomi
  const nachYomi = await getTodaysNachYomi();
  console.log(`Today: ${nachYomi.book} ${nachYomi.chapter}`);

  const shiurId = getShiurId(nachYomi.book, nachYomi.chapter);

  // Fetch chapter text once (shared by all recipients)
  let chapterText = null;
  try {
    chapterText = await getChapterText(nachYomi.book, nachYomi.chapter, { maxVerses: null });
  } catch (err) {
    console.warn('Text fetch failed:', err.message);
  }

  // 1. Send to channel (if configured)
  if (CHANNEL_ID) {
    console.log(`\n--- Channel: ${CHANNEL_ID} ---`);
    await sendDailyContent(CHANNEL_ID, nachYomi, shiurId, chapterText);
    console.log('Channel broadcast complete');
  } else {
    console.log('\n--- No channel configured, skipping channel broadcast ---');
  }

  // 2. Send to all subscribers (always)
  let subscribers = await loadSubscribers();

  // Include ADMIN_CHAT_ID as a subscriber if configured (for testing/admin)
  if (ADMIN_CHAT_ID && !subscribers.includes(Number(ADMIN_CHAT_ID))) {
    subscribers = [Number(ADMIN_CHAT_ID), ...subscribers];
    console.log(`Added admin (${ADMIN_CHAT_ID}) to subscriber list for broadcast`);
  }

  console.log(`\n--- Subscribers: ${subscribers.length} ---`);

  let sent = 0;
  let failed = 0;

  for (const chatId of subscribers) {
    try {
      await sendDailyContent(chatId, nachYomi, shiurId, chapterText);
      sent++;
      // Rate limit: small delay between users
      await new Promise((r) => setTimeout(r, 100));
    } catch (err) {
      console.warn(`Failed for ${chatId}:`, err.message);
      failed++;
    }
  }

  console.log(`\nSubscriber results: ${sent} sent, ${failed} failed`);
  console.log('=== BROADCAST COMPLETE ===');

  if (ADMIN_CHAT_ID) {
    const channelMsg = CHANNEL_ID ? 'Channel + ' : '';
    await bot
      .sendMessage(
        ADMIN_CHAT_ID,
        `✅ Broadcast: ${nachYomi.book} ${nachYomi.chapter}\n${channelMsg}${sent} subscribers`
      )
      .catch(() => {});
  }

  process.exit(0);
}

runBroadcast().catch((err) => {
  console.error('Broadcast failed:', err.message);
  process.exit(1);
});

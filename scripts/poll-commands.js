#!/usr/bin/env node
/**
 * Command Polling Script for GitHub Actions
 *
 * Responds to /start command and subscribes users to daily broadcasts.
 * State tracked in .github/state/last_update_id.json
 *
 * Usage: node scripts/poll-commands.js
 * Requires: TELEGRAM_BOT_TOKEN
 */

import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import { getTodaysNachYomi } from '../src/hebcalService.js';
import { getChapterText } from '../src/sefariaService.js';
import {
  buildDailyMessages,
  buildKeyboard,
  buildMediaCaption,
  buildMediaKeyboard,
  buildWelcomeMessage,
} from '../src/messageBuilder.js';
import { getShiurId, getShiurAudioUrl, getShiurUrl } from '../src/data/shiurMapping.js';
import { parseCommand } from '../src/utils/commandParser.js';
import { addSubscriber } from '../src/utils/subscribers.js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const STATE_FILE = '.github/state/last_update_id.json';

if (!BOT_TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN required');
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: false });

async function loadLastUpdateId() {
  try {
    const content = await readFile(STATE_FILE, 'utf-8');
    return JSON.parse(content).lastUpdateId || 0;
  } catch {
    return 0;
  }
}

async function saveLastUpdateId(updateId) {
  try {
    await mkdir(dirname(STATE_FILE), { recursive: true });
    await writeFile(STATE_FILE, JSON.stringify({ lastUpdateId: updateId }, null, 2));
  } catch (err) {
    console.error('Failed to save state:', err.message);
  }
}

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
    console.warn('Audio failed:', err.message);
    return false;
  }
}

/**
 * Send video link
 */
async function sendVideoLink(chatId, nachYomi) {
  const shiurPageUrl = getShiurUrl(nachYomi.book, nachYomi.chapter);

  try {
    await bot.sendMessage(chatId, `🎬 [Watch Video Shiur](${shiurPageUrl})`, {
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
    });
    return true;
  } catch (err) {
    console.warn('Video link failed:', err.message);
    return false;
  }
}

/**
 * Send chapter text
 */
async function sendText(chatId, nachYomi, chapterText) {
  const messages = buildDailyMessages(nachYomi, chapterText);

  for (let i = 0; i < messages.length; i++) {
    const isLast = i === messages.length - 1;
    await bot.sendMessage(chatId, messages[i], {
      parse_mode: 'Markdown',
      reply_markup: isLast ? buildKeyboard(nachYomi.book, nachYomi.chapter) : undefined,
      disable_web_page_preview: true,
    });
  }
}

/**
 * Handle /start command
 * Subscribes user and sends today's shiur
 */
async function handleStart(chatId) {
  // Subscribe user for daily broadcasts
  const isNew = await addSubscriber(chatId);
  if (isNew) {
    console.log(`New subscriber: ${chatId}`);
  }

  // Send welcome message
  await bot.sendMessage(chatId, buildWelcomeMessage(), { parse_mode: 'Markdown' });

  // Get today's shiur
  const nachYomi = await getTodaysNachYomi();
  const shiurId = getShiurId(nachYomi.book, nachYomi.chapter);

  // Audio first (primary)
  await sendAudio(chatId, nachYomi, shiurId);

  // Video link
  await sendVideoLink(chatId, nachYomi);

  // Text
  let chapterText = null;
  try {
    chapterText = await getChapterText(nachYomi.book, nachYomi.chapter, { maxVerses: null });
  } catch (err) {
    console.warn('Text fetch failed:', err.message);
  }
  await sendText(chatId, nachYomi, chapterText);
}

async function pollCommands() {
  console.log(`[${new Date().toISOString()}] Polling for commands...`);

  let lastUpdateId = await loadLastUpdateId();
  console.log(`Last update ID: ${lastUpdateId}`);

  const updates = await bot.getUpdates({
    offset: lastUpdateId + 1,
    limit: 100,
    timeout: 0,
  });

  console.log(`Received ${updates.length} updates`);

  for (const update of updates) {
    lastUpdateId = Math.max(lastUpdateId, update.update_id);

    if (!update.message?.text) continue;

    const chatId = update.message.chat.id;
    const parsed = parseCommand(update.message.text);

    if (!parsed) continue;

    console.log(`Command: /${parsed.command} from ${chatId}`);

    try {
      // All commands route to /start (simplified)
      await handleStart(chatId);
    } catch (err) {
      console.error(`Error handling command:`, err.message);
      await bot.sendMessage(chatId, '❌ Error. Please try again.').catch(() => {});
    }
  }

  if (updates.length > 0) {
    await saveLastUpdateId(lastUpdateId);
    console.log(`Saved last update ID: ${lastUpdateId}`);
  }

  console.log('Polling complete');
  process.exit(0);
}

pollCommands().catch((err) => {
  console.error('Poll failed:', err.message);
  process.exit(1);
});

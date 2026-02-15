/**
 * Nach Yomi Telegram Bot
 *
 * Daily Nach chapters with Rav Breitowitz's shiurim from Kol Halashon.
 * Audio embedded, video as link. Two chapters per day.
 *
 * /start - Subscribe and get today's shiurim
 */

import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';
import { getTodaysChapters } from './scheduleService.js';
import {
  buildDayHeader,
  buildMediaCaption,
  buildMediaKeyboard,
  buildKeyboard,
  buildWelcomeMessage,
} from './messageBuilder.js';
import { getShiurAudioUrl, getShiurUrl } from './data/shiurMapping.js';
import { addSubscriber } from './utils/subscribers.js';
import { createRateLimiter } from './utils/rateLimiter.js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN required');
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

const limiter = createRateLimiter();

// Initialize
(async () => {
  await bot.setMyCommands([{ command: 'start', description: "Today's Nach Yomi shiurim" }]);
  console.log('Nach Yomi Bot started');
})();

/**
 * Send audio (embedded)
 */
async function sendAudio(chatId, chapter) {
  if (!chapter.shiurId) return false;

  try {
    await bot.sendAudio(chatId, getShiurAudioUrl(chapter.shiurId), {
      title: `${chapter.book} ${chapter.chapter}`,
      performer: 'Rav Yitzchok Breitowitz',
      caption: buildMediaCaption(chapter, 'audio'),
      parse_mode: 'Markdown',
      reply_markup: buildMediaKeyboard(chapter.book, chapter.chapter),
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
async function sendVideoLink(chatId, chapter, isLast = false) {
  try {
    await bot.sendMessage(
      chatId,
      `🎬 [Watch Video Shiur — ${chapter.book} ${chapter.chapter}](${getShiurUrl(chapter.book, chapter.chapter)})`,
      {
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
        reply_markup: isLast ? buildKeyboard(chapter.book, chapter.chapter) : undefined,
      }
    );
    return true;
  } catch (err) {
    console.warn('Video link failed:', err.message);
    return false;
  }
}

/**
 * Send full daily content to a chat
 */
async function sendDailyContent(chatId, todaysSchedule) {
  // Day header
  await bot.sendMessage(chatId, buildDayHeader(todaysSchedule), { parse_mode: 'Markdown' });

  // Audio + video for each chapter
  for (let i = 0; i < todaysSchedule.chapters.length; i++) {
    const chapter = todaysSchedule.chapters[i];
    const isLast = i === todaysSchedule.chapters.length - 1;
    await sendAudio(chatId, chapter);
    await sendVideoLink(chatId, chapter, isLast);
  }
}

// Command handler
bot.on('message', async msg => {
  if (!msg.text?.startsWith('/')) return;

  const chatId = msg.chat.id;
  const command = msg.text.split('@')[0].slice(1).split(' ')[0].toLowerCase();

  if (command !== 'start') return;

  if (limiter.isRateLimited(chatId)) {
    return bot.sendMessage(chatId, '_Please wait._', { parse_mode: 'Markdown' });
  }

  try {
    // Subscribe user
    const isNew = await addSubscriber(chatId);
    if (isNew) console.log(`New subscriber: ${chatId}`);

    // Welcome
    await bot.sendMessage(chatId, buildWelcomeMessage(), { parse_mode: 'Markdown' });

    // Get today's content
    const todaysSchedule = getTodaysChapters();
    await sendDailyContent(chatId, todaysSchedule);
  } catch (err) {
    console.error('Command failed:', err.message);
    await bot.sendMessage(chatId, '❌ Error. Please try again.').catch(() => {});
  }
});

// Daily broadcasts are handled exclusively by GitHub Actions (scripts/broadcast.js)
// which has deduplication, state tracking, and DST-aware scheduling.
// This process only handles interactive commands via polling.
console.log('Daily broadcasts delegated to GitHub Actions');

bot.on('polling_error', err => console.error('Polling error:', err.message));
bot.on('error', err => console.error('Bot error:', err.message));

process.on('SIGTERM', () => {
  bot.stopPolling();
  process.exit(0);
});
process.on('SIGINT', () => {
  bot.stopPolling();
  process.exit(0);
});

/**
 * Nach Yomi Telegram Bot
 *
 * Daily Nach Yomi chapter with Rav Breitowitz's shiurim from Kol Halashon.
 * Audio embedded, video as link, full Hebrew + English text.
 *
 * /start - Subscribe and get today's shiur
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
import { addSubscriber, loadSubscribers } from './utils/subscribers.js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || process.env.TELEGRAM_CHAT_ID;

if (!BOT_TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN required');
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Rate limiting
const rateLimits = new Map();

function isRateLimited(chatId) {
  const now = Date.now();
  const history = rateLimits.get(chatId) || [];
  const recent = history.filter(t => now - t < 60000);

  if (recent.length >= 5) return true;

  recent.push(now);
  rateLimits.set(chatId, recent);
  return false;
}

// Initialize
(async () => {
  await bot.setMyCommands([{ command: 'start', description: "Today's Nach Yomi shiur" }]);
  console.log('Nach Yomi Bot started');
})();

/**
 * Send audio (embedded)
 */
async function sendAudio(chatId, nachYomi, shiurId) {
  if (!shiurId) return false;

  try {
    await bot.sendAudio(chatId, getShiurAudioUrl(shiurId), {
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
  try {
    await bot.sendMessage(
      chatId,
      `🎬 [Watch Video Shiur](${getShiurUrl(nachYomi.book, nachYomi.chapter)})`,
      {
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }
    );
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
    await bot.sendMessage(chatId, messages[i], {
      parse_mode: 'Markdown',
      reply_markup:
        i === messages.length - 1 ? buildKeyboard(nachYomi.book, nachYomi.chapter) : undefined,
      disable_web_page_preview: true,
    });
  }
}

/**
 * Send full daily content to a chat
 */
async function sendDailyContent(chatId, nachYomi, shiurId, chapterText) {
  await sendAudio(chatId, nachYomi, shiurId);
  await sendVideoLink(chatId, nachYomi);
  await sendText(chatId, nachYomi, chapterText);
}

// Command handler
bot.on('message', async msg => {
  if (!msg.text?.startsWith('/')) return;

  const chatId = msg.chat.id;
  const command = msg.text.split('@')[0].slice(1).split(' ')[0].toLowerCase();

  if (command !== 'start') return;

  if (isRateLimited(chatId)) {
    return bot.sendMessage(chatId, '_Please wait._', { parse_mode: 'Markdown' });
  }

  try {
    // Subscribe user
    const isNew = await addSubscriber(chatId);
    if (isNew) console.log(`New subscriber: ${chatId}`);

    // Welcome
    await bot.sendMessage(chatId, buildWelcomeMessage(), { parse_mode: 'Markdown' });

    // Get today's content
    const nachYomi = await getTodaysNachYomi();
    const shiurId = getShiurId(nachYomi.book, nachYomi.chapter);
    let chapterText = null;
    try {
      chapterText = await getChapterText(nachYomi.book, nachYomi.chapter, { maxVerses: null });
    } catch {
      // Text fetch failed, continue without it
    }

    await sendDailyContent(chatId, nachYomi, shiurId, chapterText);
  } catch (err) {
    console.error('Command failed:', err.message);
    await bot.sendMessage(chatId, '❌ Error. Please try again.').catch(() => {});
  }
});

// Daily broadcast at 6am Israel (always schedule, even without channel)
cron.schedule(
  '0 6 * * *',
  async () => {
    console.log('Running daily broadcast...');

    try {
      const nachYomi = await getTodaysNachYomi();
      const shiurId = getShiurId(nachYomi.book, nachYomi.chapter);
      let chapterText = null;
      try {
        chapterText = await getChapterText(nachYomi.book, nachYomi.chapter, { maxVerses: null });
      } catch {
        // Text fetch failed, continue without it
      }

      // Channel (only if configured)
      if (CHANNEL_ID) {
        await sendDailyContent(CHANNEL_ID, nachYomi, shiurId, chapterText);
        console.log('Channel broadcast done');
      }

      // Subscribers (always broadcast to private subscribers)
      let subscribers = await loadSubscribers();

      // Include ADMIN_CHAT_ID as a subscriber if configured (for testing/admin)
      if (ADMIN_CHAT_ID && !subscribers.includes(Number(ADMIN_CHAT_ID))) {
        subscribers = [Number(ADMIN_CHAT_ID), ...subscribers];
        console.log(`Added admin (${ADMIN_CHAT_ID}) to subscriber list`);
      }

      console.log(`Broadcasting to ${subscribers.length} subscribers...`);

      for (const id of subscribers) {
        try {
          await sendDailyContent(id, nachYomi, shiurId, chapterText);
          await new Promise(r => setTimeout(r, 100));
        } catch (err) {
          console.warn(`Failed for ${id}:`, err.message);
        }
      }

      console.log('Broadcast complete');
      if (ADMIN_CHAT_ID) {
        bot
          .sendMessage(ADMIN_CHAT_ID, `✅ Broadcast: ${nachYomi.book} ${nachYomi.chapter}`)
          .catch(() => {});
      }
    } catch (err) {
      console.error('Broadcast failed:', err.message);
      if (ADMIN_CHAT_ID) {
        bot.sendMessage(ADMIN_CHAT_ID, `❌ Broadcast failed: ${err.message}`).catch(() => {});
      }
    }
  },
  { timezone: 'Asia/Jerusalem' }
);
console.log('Daily broadcast scheduled at 6am Israel');

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

/**
 * Nach Yomi Telegram Bot
 *
 * Daily Nach Yomi chapter with Rav Breitowitz's shiurim from Kol Halashon.
 * Run with: node src/index.js
 */

import TelegramBot from 'node-telegram-bot-api';
import cron from 'node-cron';
import { createReadStream } from 'fs';
import { getTodaysNachYomi, getNachYomiForDate } from './hebcalService.js';
import { getChapterText } from './sefariaService.js';
import {
  buildDailyMessage,
  buildKeyboard,
  buildMediaCaption,
  buildMediaKeyboard,
  buildWelcomeMessage,
  buildAboutMessage
} from './messageBuilder.js';
import { getShiurId, getShiurAudioUrl, getShiurVideoUrl, getShiurThumbnailUrl } from './data/shiurMapping.js';
import { prepareVideoForTelegram, cleanupVideo, checkFfmpeg } from './videoService.js';

// Configuration
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const ENABLE_VIDEO = process.env.ENABLE_VIDEO !== 'false';

if (!BOT_TOKEN) {
  console.error('Error: TELEGRAM_BOT_TOKEN is required');
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Check FFmpeg availability on startup
let ffmpegAvailable = false;

async function init() {
  ffmpegAvailable = await checkFfmpeg();
  console.log(`FFmpeg: ${ffmpegAvailable ? 'available' : 'not found'}`);
  console.log('Nach Yomi Bot running');
  console.log(`Video mode: ${ENABLE_VIDEO && ffmpegAvailable ? 'enabled' : 'disabled (audio fallback)'}`);
  console.log('Send /start to test');
}

init();

console.log('Nach Yomi Bot starting...');

/**
 * Send daily Nach Yomi - VIDEO FIRST, then text with full content
 */
async function sendDailyNachYomi(chatId) {
  try {
    const nachYomi = await getTodaysNachYomi();
    console.log(`Sending: ${nachYomi.book} ${nachYomi.chapter}`);

    const shiurId = getShiurId(nachYomi.book, nachYomi.chapter);
    let mediaSuccess = false;

    // 1. SEND VIDEO FIRST (if available)
    if (ENABLE_VIDEO && ffmpegAvailable && shiurId) {
      const videoUrl = getShiurVideoUrl(shiurId);

      try {
        console.log('Preparing video...');
        const videoFile = await prepareVideoForTelegram(videoUrl, shiurId);

        if (videoFile) {
          await bot.sendVideo(chatId, createReadStream(videoFile.path), {
            caption: buildMediaCaption(nachYomi),
            parse_mode: 'Markdown',
            reply_markup: buildMediaKeyboard(nachYomi.book, nachYomi.chapter),
            supports_streaming: true
          });
          await cleanupVideo(videoFile.path);
          mediaSuccess = true;
          console.log('Sent video');
        }
      } catch (videoErr) {
        console.warn('Video failed:', videoErr.message);
      }
    }

    // 2. FALLBACK TO AUDIO if video failed
    if (!mediaSuccess && shiurId) {
      const audioUrl = getShiurAudioUrl(shiurId);
      if (audioUrl) {
        try {
          await bot.sendAudio(chatId, audioUrl, {
            title: `${nachYomi.book} ${nachYomi.chapter}`,
            performer: 'Rav Yitzchok Breitowitz',
            caption: buildMediaCaption(nachYomi),
            parse_mode: 'Markdown',
            reply_markup: buildMediaKeyboard(nachYomi.book, nachYomi.chapter)
          });
          mediaSuccess = true;
          console.log('Sent audio');
        } catch (audioErr) {
          console.warn('Audio failed:', audioErr.message);
        }
      }
    }

    // 3. GET FULL CHAPTER TEXT (all verses)
    let chapterText = null;
    try {
      chapterText = await getChapterText(nachYomi.book, nachYomi.chapter, { maxVerses: null });
    } catch (err) {
      console.warn('Text fetch failed:', err.message);
    }

    // 4. SEND TEXT MESSAGE with all verses
    const textMessage = buildDailyMessage(nachYomi, chapterText);
    await bot.sendMessage(chatId, textMessage, {
      parse_mode: 'Markdown',
      reply_markup: buildKeyboard(nachYomi.book, nachYomi.chapter),
      disable_web_page_preview: true
    });

    return true;

  } catch (error) {
    console.error('Send failed:', error.message);
    if (ADMIN_CHAT_ID) {
      bot.sendMessage(ADMIN_CHAT_ID, `Error: ${error.message}`).catch(() => {});
    }
    throw error;
  }
}

// Command: /start
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    await bot.sendMessage(chatId, buildWelcomeMessage(), { parse_mode: 'Markdown' });
    await sendDailyNachYomi(chatId);
  } catch (err) {
    await bot.sendMessage(chatId, 'Welcome! Use /today for today\'s Nach Yomi.');
  }
});

// Command: /today
bot.onText(/\/today/, async (msg) => {
  try {
    await sendDailyNachYomi(msg.chat.id);
  } catch (err) {
    await bot.sendMessage(msg.chat.id, 'Could not fetch today\'s Nach Yomi. Try again later.');
  }
});

// Command: /tomorrow
bot.onText(/\/tomorrow/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nachYomi = await getNachYomiForDate(tomorrow);

    if (!nachYomi) {
      await bot.sendMessage(chatId, 'Could not find tomorrow\'s Nach Yomi.');
      return;
    }

    let chapterText = null;
    try {
      chapterText = await getChapterText(nachYomi.book, nachYomi.chapter, { maxVerses: null });
    } catch (err) {}

    const message = `*Tomorrow*\n\n` + buildDailyMessage(nachYomi, chapterText);
    await bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: buildKeyboard(nachYomi.book, nachYomi.chapter),
      disable_web_page_preview: true
    });
  } catch (err) {
    await bot.sendMessage(chatId, 'Could not fetch tomorrow\'s Nach Yomi.');
  }
});

// Command: /video (force video)
bot.onText(/\/video/, async (msg) => {
  const chatId = msg.chat.id;

  if (!ffmpegAvailable) {
    await bot.sendMessage(chatId, 'Video conversion requires FFmpeg. Audio mode active.');
    return;
  }

  try {
    const nachYomi = await getTodaysNachYomi();
    const shiurId = getShiurId(nachYomi.book, nachYomi.chapter);

    if (!shiurId) {
      await bot.sendMessage(chatId, 'No video available for this chapter.');
      return;
    }

    await bot.sendMessage(chatId, 'Preparing video... (this may take a moment)');

    const videoUrl = getShiurVideoUrl(shiurId);
    const videoFile = await prepareVideoForTelegram(videoUrl, shiurId);

    if (videoFile) {
      await bot.sendVideo(chatId, createReadStream(videoFile.path), {
        caption: buildMediaCaption(nachYomi),
        parse_mode: 'Markdown',
        reply_markup: buildMediaKeyboard(nachYomi.book, nachYomi.chapter),
        supports_streaming: true
      });
      await cleanupVideo(videoFile.path);
    } else {
      await bot.sendMessage(chatId, 'Video is too large or conversion failed.');
    }
  } catch (err) {
    await bot.sendMessage(chatId, `Video failed: ${err.message}`);
  }
});

// Command: /help
bot.onText(/\/help/, async (msg) => {
  await bot.sendMessage(msg.chat.id, buildWelcomeMessage(), { parse_mode: 'Markdown' });
});

// Command: /about
bot.onText(/\/about/, async (msg) => {
  await bot.sendMessage(msg.chat.id, buildAboutMessage(), { parse_mode: 'Markdown' });
});

// Command: /broadcast (admin only)
bot.onText(/\/broadcast/, async (msg) => {
  if (ADMIN_CHAT_ID && msg.chat.id.toString() !== ADMIN_CHAT_ID) return;
  if (!CHANNEL_ID) {
    await bot.sendMessage(msg.chat.id, 'No channel configured.');
    return;
  }
  try {
    await sendDailyNachYomi(CHANNEL_ID);
    await bot.sendMessage(msg.chat.id, 'Broadcast sent.');
  } catch (err) {
    await bot.sendMessage(msg.chat.id, `Broadcast failed: ${err.message}`);
  }
});

// Schedule: 6:00 AM Israel time
if (CHANNEL_ID) {
  cron.schedule('0 4 * * *', async () => {
    console.log('Scheduled post');
    try {
      await sendDailyNachYomi(CHANNEL_ID);
    } catch (err) {
      console.error('Scheduled post failed:', err.message);
    }
  }, { timezone: 'UTC' });
  console.log(`Scheduled: ${CHANNEL_ID} at 6:00 AM Israel`);
}

// Error handlers
bot.on('polling_error', (err) => console.error('Polling error:', err.message));
bot.on('error', (err) => console.error('Bot error:', err.message));

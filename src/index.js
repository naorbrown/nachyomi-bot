/**
 * Nach Yomi Telegram Bot
 *
 * Daily Nach Yomi chapter with Rav Breitowitz's shiurim from Kol Halashon.
 * Features: Embedded video, full Hebrew + English text
 */

import TelegramBot from 'node-telegram-bot-api';
import cron from 'node-cron';
import { createReadStream } from 'fs';
import { getTodaysNachYomi, getNachYomiForDate } from './hebcalService.js';
import { getChapterText } from './sefariaService.js';
import {
  buildDailyMessages,
  buildKeyboard,
  buildMediaCaption,
  buildMediaKeyboard,
  buildWelcomeMessage,
  buildAboutMessage
} from './messageBuilder.js';
import { getShiurId, getShiurAudioUrl, getShiurVideoUrl } from './data/shiurMapping.js';
import { prepareVideoForTelegram, cleanupVideo, checkFfmpeg } from './videoService.js';

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

// Initialize
(async () => {
  ffmpegAvailable = await checkFfmpeg();
  console.log('Nach Yomi Bot started');
  console.log(`FFmpeg: ${ffmpegAvailable ? 'yes' : 'no'}`);
})();

/**
 * Send daily Nach Yomi - VIDEO first, then ALL text
 */
async function sendDailyNachYomi(chatId) {
  try {
    const nachYomi = await getTodaysNachYomi();
    console.log(`Sending: ${nachYomi.book} ${nachYomi.chapter}`);

    const shiurId = getShiurId(nachYomi.book, nachYomi.chapter);
    let videoSent = false;

    // 1. TRY VIDEO FIRST
    if (ffmpegAvailable && shiurId) {
      try {
        console.log('Converting video...');
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
          videoSent = true;
          console.log('Video sent');
        }
      } catch (err) {
        console.warn('Video failed:', err.message);
      }
    }

    // 2. FALLBACK TO AUDIO
    if (!videoSent && shiurId) {
      try {
        const audioUrl = getShiurAudioUrl(shiurId);
        await bot.sendAudio(chatId, audioUrl, {
          title: `${nachYomi.book} ${nachYomi.chapter}`,
          performer: 'Rav Yitzchok Breitowitz',
          caption: buildMediaCaption(nachYomi),
          parse_mode: 'Markdown',
          reply_markup: buildMediaKeyboard(nachYomi.book, nachYomi.chapter)
        });
        console.log('Audio sent');
      } catch (err) {
        console.warn('Audio failed:', err.message);
      }
    }

    // 3. GET ALL CHAPTER TEXT
    let chapterText = null;
    try {
      chapterText = await getChapterText(nachYomi.book, nachYomi.chapter, { maxVerses: null });
    } catch (err) {
      console.warn('Text fetch failed:', err.message);
    }

    // 4. SEND ALL TEXT MESSAGES (split if needed)
    const messages = buildDailyMessages(nachYomi, chapterText);

    for (let i = 0; i < messages.length; i++) {
      const isLastMessage = i === messages.length - 1;
      await bot.sendMessage(chatId, messages[i], {
        parse_mode: 'Markdown',
        reply_markup: isLastMessage ? buildKeyboard(nachYomi.book, nachYomi.chapter) : undefined,
        disable_web_page_preview: true
      });
    }

    console.log(`Sent ${messages.length} text message(s)`);
    return true;

  } catch (error) {
    console.error('Send failed:', error.message);
    if (ADMIN_CHAT_ID) {
      bot.sendMessage(ADMIN_CHAT_ID, `Error: ${error.message}`).catch(() => {});
    }
    throw error;
  }
}

// /start
bot.onText(/\/start/, async (msg) => {
  try {
    await bot.sendMessage(msg.chat.id, buildWelcomeMessage(), { parse_mode: 'Markdown' });
    await sendDailyNachYomi(msg.chat.id);
  } catch (err) {
    await bot.sendMessage(msg.chat.id, 'Error. Try /today');
  }
});

// /today
bot.onText(/\/today/, async (msg) => {
  try {
    await sendDailyNachYomi(msg.chat.id);
  } catch (err) {
    await bot.sendMessage(msg.chat.id, 'Error fetching Nach Yomi.');
  }
});

// /tomorrow
bot.onText(/\/tomorrow/, async (msg) => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nachYomi = await getNachYomiForDate(tomorrow);

    if (!nachYomi) {
      await bot.sendMessage(msg.chat.id, 'Not found.');
      return;
    }

    const chapterText = await getChapterText(nachYomi.book, nachYomi.chapter, { maxVerses: null }).catch(() => null);
    const messages = buildDailyMessages(nachYomi, chapterText);
    messages[0] = `*Tomorrow*\n\n` + messages[0];

    for (let i = 0; i < messages.length; i++) {
      const isLastMessage = i === messages.length - 1;
      await bot.sendMessage(msg.chat.id, messages[i], {
        parse_mode: 'Markdown',
        reply_markup: isLastMessage ? buildKeyboard(nachYomi.book, nachYomi.chapter) : undefined,
        disable_web_page_preview: true
      });
    }
  } catch (err) {
    await bot.sendMessage(msg.chat.id, 'Error.');
  }
});

// /video
bot.onText(/\/video/, async (msg) => {
  if (!ffmpegAvailable) {
    await bot.sendMessage(msg.chat.id, 'FFmpeg not available.');
    return;
  }

  try {
    await bot.sendMessage(msg.chat.id, 'Converting video...');

    const nachYomi = await getTodaysNachYomi();
    const shiurId = getShiurId(nachYomi.book, nachYomi.chapter);

    if (!shiurId) {
      await bot.sendMessage(msg.chat.id, 'No shiur mapped for this chapter.');
      return;
    }

    const videoUrl = getShiurVideoUrl(shiurId);
    const videoFile = await prepareVideoForTelegram(videoUrl, shiurId);

    if (videoFile) {
      await bot.sendVideo(msg.chat.id, createReadStream(videoFile.path), {
        caption: buildMediaCaption(nachYomi),
        parse_mode: 'Markdown',
        reply_markup: buildMediaKeyboard(nachYomi.book, nachYomi.chapter),
        supports_streaming: true
      });
      await cleanupVideo(videoFile.path);
    } else {
      await bot.sendMessage(msg.chat.id, 'Video conversion failed.');
    }
  } catch (err) {
    await bot.sendMessage(msg.chat.id, `Error: ${err.message}`);
  }
});

// /help
bot.onText(/\/help/, async (msg) => {
  await bot.sendMessage(msg.chat.id, buildWelcomeMessage(), { parse_mode: 'Markdown' });
});

// /about
bot.onText(/\/about/, async (msg) => {
  await bot.sendMessage(msg.chat.id, buildAboutMessage(), { parse_mode: 'Markdown' });
});

// /broadcast (admin)
bot.onText(/\/broadcast/, async (msg) => {
  if (ADMIN_CHAT_ID && msg.chat.id.toString() !== ADMIN_CHAT_ID) return;
  if (!CHANNEL_ID) {
    await bot.sendMessage(msg.chat.id, 'No channel configured.');
    return;
  }
  try {
    await sendDailyNachYomi(CHANNEL_ID);
    await bot.sendMessage(msg.chat.id, 'Sent.');
  } catch (err) {
    await bot.sendMessage(msg.chat.id, `Failed: ${err.message}`);
  }
});

// Schedule: 6:00 AM Israel (4:00 UTC)
if (CHANNEL_ID) {
  cron.schedule('0 4 * * *', () => sendDailyNachYomi(CHANNEL_ID).catch(console.error), { timezone: 'UTC' });
  console.log(`Scheduled daily post to ${CHANNEL_ID}`);
}

// Error handlers
bot.on('polling_error', (err) => console.error('Poll error:', err.message));
bot.on('error', (err) => console.error('Bot error:', err.message));

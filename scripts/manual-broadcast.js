#!/usr/bin/env node
/**
 * Manual broadcast script - sends today's Nach Yomi to a channel
 *
 * Usage:
 *   TELEGRAM_BOT_TOKEN=xxx TELEGRAM_CHANNEL_ID=@channel node scripts/manual-broadcast.js
 */

import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';
import { createReadStream } from 'fs';
import { getTodaysNachYomi } from '../src/hebcalService.js';
import { getChapterText } from '../src/sefariaService.js';
import {
  buildDailyMessages,
  buildKeyboard,
  buildMediaCaption,
  buildMediaKeyboard
} from '../src/messageBuilder.js';
import { getShiurId, getShiurAudioUrl, getShiurVideoUrl, getShiurUrl } from '../src/data/shiurMapping.js';
import { prepareVideoForTelegram, cleanupVideo, cleanupVideoParts, checkFfmpeg } from '../src/videoService.js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;

if (!BOT_TOKEN || !CHANNEL_ID) {
  console.error('Required: TELEGRAM_BOT_TOKEN and TELEGRAM_CHANNEL_ID');
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN);

async function sendVideoShiur(chatId, nachYomi, shiurId, ffmpegAvailable) {
  if (!ffmpegAvailable || !shiurId) {
    console.log('Skipping video (FFmpeg unavailable or no shiur ID)');
    return false;
  }

  try {
    console.log('Preparing video...');
    const videoUrl = getShiurVideoUrl(shiurId);
    const videoResult = await prepareVideoForTelegram(videoUrl, shiurId);

    if (!videoResult || videoResult.tooLarge) {
      console.log('Video too large or failed to prepare');
      return false;
    }

    if (videoResult.parts) {
      const { parts, totalDuration } = videoResult;
      const totalMins = Math.round(totalDuration / 60);

      await bot.sendMessage(chatId,
        `🎬 *${nachYomi.book} ${nachYomi.chapter}* — Full Video Shiur\n\n` +
        `_Total duration: ~${totalMins} minutes_\n` +
        `_Sending in ${parts.length} parts..._`,
        { parse_mode: 'Markdown' }
      );

      for (const part of parts) {
        const partCaption = `🎬 *Part ${part.partNumber}/${part.totalParts}*\n` +
          `_${nachYomi.book} ${nachYomi.chapter}_ · Rav Yitzchok Breitowitz`;

        await bot.sendVideo(chatId, createReadStream(part.path), {
          caption: partCaption,
          parse_mode: 'Markdown',
          supports_streaming: true,
          reply_markup: part.partNumber === part.totalParts
            ? buildMediaKeyboard(nachYomi.book, nachYomi.chapter)
            : undefined
        });
      }

      await cleanupVideoParts(parts);
      console.log(`Video sent in ${parts.length} parts`);
      return true;
    }

    if (videoResult.path) {
      await bot.sendVideo(chatId, createReadStream(videoResult.path), {
        caption: buildMediaCaption(nachYomi, 'video'),
        parse_mode: 'Markdown',
        reply_markup: buildMediaKeyboard(nachYomi.book, nachYomi.chapter),
        supports_streaming: true
      });
      await cleanupVideo(videoResult.path);
      console.log('Video sent');
      return true;
    }
  } catch (err) {
    console.warn('Video failed:', err.message);
  }
  return false;
}

async function sendAudioShiur(chatId, nachYomi, shiurId) {
  if (!shiurId) return false;

  try {
    const audioUrl = getShiurAudioUrl(shiurId);
    await bot.sendAudio(chatId, audioUrl, {
      title: `${nachYomi.book} ${nachYomi.chapter}`,
      performer: 'Rav Yitzchok Breitowitz',
      caption: buildMediaCaption(nachYomi, 'audio'),
      parse_mode: 'Markdown',
      reply_markup: buildMediaKeyboard(nachYomi.book, nachYomi.chapter)
    });
    console.log('Audio sent');
    return true;
  } catch (err) {
    console.warn('Audio failed:', err.message);
    return false;
  }
}

async function sendChapterText(chatId, nachYomi, chapterText) {
  const messages = buildDailyMessages(nachYomi, chapterText);

  for (let i = 0; i < messages.length; i++) {
    const isLastMessage = i === messages.length - 1;
    await bot.sendMessage(chatId, messages[i], {
      parse_mode: 'Markdown',
      reply_markup: isLastMessage ? buildKeyboard(nachYomi.book, nachYomi.chapter) : undefined,
      disable_web_page_preview: true
    });
  }

  console.log(`Text sent: ${messages.length} message(s)`);
  return messages.length;
}

async function main() {
  console.log('=== Manual Nach Yomi Broadcast ===\n');

  const ffmpegAvailable = await checkFfmpeg();
  console.log(`FFmpeg: ${ffmpegAvailable ? 'available' : 'not available'}`);

  const nachYomi = await getTodaysNachYomi();
  console.log(`Today's chapter: ${nachYomi.book} ${nachYomi.chapter}\n`);

  const shiurId = getShiurId(nachYomi.book, nachYomi.chapter);

  // Video
  await sendVideoShiur(CHANNEL_ID, nachYomi, shiurId, ffmpegAvailable);

  // Audio
  if (shiurId) {
    await sendAudioShiur(CHANNEL_ID, nachYomi, shiurId);
  }

  // Text
  let chapterText = null;
  try {
    chapterText = await getChapterText(nachYomi.book, nachYomi.chapter, { maxVerses: null });
  } catch (err) {
    console.warn('Text fetch failed:', err.message);
  }
  await sendChapterText(CHANNEL_ID, nachYomi, chapterText);

  console.log('\n✅ Broadcast complete!');
  process.exit(0);
}

main().catch(err => {
  console.error('Broadcast failed:', err.message);
  process.exit(1);
});

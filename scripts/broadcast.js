#!/usr/bin/env node
/**
 * Standalone broadcast script for GitHub Actions
 *
 * Sends the daily Nach Yomi message to the configured channel.
 * Designed to run as a one-shot job, not a long-running process.
 *
 * Usage: node scripts/broadcast.js
 * Requires: TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID environment variables
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
  buildMediaKeyboard,
} from '../src/messageBuilder.js';
import {
  getShiurId,
  getShiurAudioUrl,
  getShiurVideoUrl,
  getShiurUrl,
} from '../src/data/shiurMapping.js';
import {
  prepareVideoForTelegram,
  cleanupVideo,
  cleanupVideoParts,
  checkFfmpeg,
} from '../src/videoService.js';
import { isIsrael6am, getIsraelHour } from '../src/utils/israelTime.js';
import { isUnifiedChannelEnabled, publishTextToUnified } from '../src/unified/index.js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const FORCE_BROADCAST = process.env.FORCE_BROADCAST === 'true';

if (!BOT_TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN required');
  process.exit(1);
}

if (!CHANNEL_ID) {
  console.error('TELEGRAM_CHANNEL_ID required');
  process.exit(1);
}

// Create bot without polling (one-shot mode)
const bot = new TelegramBot(BOT_TOKEN, { polling: false });

async function sendVideoShiur(chatId, nachYomi, shiurId, ffmpegAvailable) {
  if (!ffmpegAvailable) {
    console.log('FFmpeg not available, skipping video');
    return false;
  }

  if (!shiurId) {
    console.log('No shiur ID for video');
    return false;
  }

  try {
    const statusMsg = await bot.sendMessage(
      chatId,
      '🎬 _Converting full video shiur (this may take several minutes)..._',
      { parse_mode: 'Markdown' }
    );

    const videoUrl = getShiurVideoUrl(shiurId);
    const videoResult = await prepareVideoForTelegram(videoUrl, shiurId);

    await bot.deleteMessage(chatId, statusMsg.message_id).catch(() => {});

    if (!videoResult) {
      throw new Error('Video preparation failed');
    }

    if (videoResult.tooLarge) {
      const shiurPageUrl = getShiurUrl(nachYomi.book, nachYomi.chapter);
      await bot.sendMessage(
        chatId,
        `🎬 *Video Shiur*\n\n` +
          `The video could not be processed for Telegram.\n\n` +
          `[Watch on Kol Halashon](${shiurPageUrl})`,
        { parse_mode: 'Markdown', disable_web_page_preview: true }
      );
      return false;
    }

    if (videoResult.parts) {
      const { parts, totalDuration } = videoResult;
      const totalMins = Math.round(totalDuration / 60);

      await bot.sendMessage(
        chatId,
        `🎬 *${nachYomi.book} ${nachYomi.chapter}* — Full Video Shiur\n\n` +
          `_Total duration: ~${totalMins} minutes_\n` +
          `_Sending in ${parts.length} parts..._`,
        { parse_mode: 'Markdown' }
      );

      for (const part of parts) {
        const partCaption =
          `🎬 *Part ${part.partNumber}/${part.totalParts}*\n` +
          `_${nachYomi.book} ${nachYomi.chapter}_ · Rav Yitzchok Breitowitz`;

        await bot.sendVideo(chatId, createReadStream(part.path), {
          caption: partCaption,
          parse_mode: 'Markdown',
          supports_streaming: true,
          reply_markup:
            part.partNumber === part.totalParts
              ? buildMediaKeyboard(nachYomi.book, nachYomi.chapter)
              : undefined,
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
        supports_streaming: true,
      });
      await cleanupVideo(videoResult.path);
      console.log('Video sent');
      return true;
    }
  } catch (err) {
    console.warn('Video failed:', err.message);
    const shiurPageUrl = getShiurUrl(nachYomi.book, nachYomi.chapter);
    await bot
      .sendMessage(
        chatId,
        `🎬 *Video Shiur*\n\n` +
          `Video conversion failed. Watch on Kol Halashon instead:\n\n` +
          `[Watch Full Shiur](${shiurPageUrl})`,
        { parse_mode: 'Markdown', disable_web_page_preview: true }
      )
      .catch(() => {});
  }
  return false;
}

async function sendAudioShiur(chatId, nachYomi, shiurId) {
  if (!shiurId) {
    const shiurPageUrl = getShiurUrl(nachYomi.book, nachYomi.chapter);
    await bot.sendMessage(
      chatId,
      `🎧 *Audio Shiur*\n\n` +
        `No embedded audio available for ${nachYomi.book} ${nachYomi.chapter}.\n\n` +
        `[Listen on Kol Halashon](${shiurPageUrl})`,
      { parse_mode: 'Markdown', disable_web_page_preview: true }
    );
    return false;
  }

  try {
    const audioUrl = getShiurAudioUrl(shiurId);
    await bot.sendAudio(chatId, audioUrl, {
      title: `${nachYomi.book} ${nachYomi.chapter}`,
      performer: 'Rav Yitzchok Breitowitz',
      caption: buildMediaCaption(nachYomi, 'audio'),
      parse_mode: 'Markdown',
      reply_markup: buildMediaKeyboard(nachYomi.book, nachYomi.chapter),
    });
    console.log('Audio sent');
    return true;
  } catch (err) {
    console.warn('Audio failed:', err.message);
    const shiurPageUrl = getShiurUrl(nachYomi.book, nachYomi.chapter);
    await bot
      .sendMessage(
        chatId,
        `🎧 *Audio Shiur*\n\n` +
          `Audio loading failed. Listen on Kol Halashon instead:\n\n` +
          `[Listen to Full Shiur](${shiurPageUrl})`,
        { parse_mode: 'Markdown', disable_web_page_preview: true }
      )
      .catch(() => {});
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
      disable_web_page_preview: true,
    });
  }

  console.log(`Text sent: ${messages.length} message(s)`);
  return messages.length;
}

async function runBroadcast() {
  // Check if it's actually 6am Israel time (handles DST automatically)
  // This allows us to schedule at both 3am and 4am UTC and skip the wrong one
  // FORCE_BROADCAST=true bypasses this check for manual triggers
  if (!FORCE_BROADCAST && !isIsrael6am()) {
    const israelHour = getIsraelHour();
    console.log(`Not 6am Israel time (currently ${israelHour}:00), skipping broadcast`);
    console.log('Use FORCE_BROADCAST=true to bypass this check');
    process.exit(0);
  }

  if (FORCE_BROADCAST) {
    console.log('FORCE_BROADCAST enabled, bypassing time check');
  }

  // NO RETRY LOOP: Retrying would cause duplicate messages if video/audio
  // succeeded but text failed. Each send function handles its own errors.

  console.log(`[${new Date().toISOString()}] Starting broadcast to ${CHANNEL_ID}...`);

  const ffmpegAvailable = await checkFfmpeg();
  console.log(`FFmpeg available: ${ffmpegAvailable}`);

  // Get today's Nach Yomi - fail fast if this doesn't work
  const nachYomi = await getTodaysNachYomi();
  console.log(`Today's Nach Yomi: ${nachYomi.book} ${nachYomi.chapter}`);

  const shiurId = getShiurId(nachYomi.book, nachYomi.chapter);

  // Send video (function handles its own errors, but wrap just in case)
  try {
    await sendVideoShiur(CHANNEL_ID, nachYomi, shiurId, ffmpegAvailable);
  } catch (err) {
    console.error('Video send failed unexpectedly:', err.message);
  }

  // Send audio (function handles its own errors, but wrap just in case)
  if (shiurId) {
    try {
      await sendAudioShiur(CHANNEL_ID, nachYomi, shiurId);
    } catch (err) {
      console.error('Audio send failed unexpectedly:', err.message);
    }
  }

  // Send text
  let chapterText = null;
  try {
    chapterText = await getChapterText(nachYomi.book, nachYomi.chapter, { maxVerses: null });
  } catch (err) {
    console.warn('Text fetch failed:', err.message);
  }
  try {
    await sendChapterText(CHANNEL_ID, nachYomi, chapterText);
  } catch (err) {
    console.error('Text send failed:', err.message);
  }

  // Publish to unified Torah Yomi channel
  if (isUnifiedChannelEnabled()) {
    try {
      const summaryText = `📖 *${nachYomi.book} ${nachYomi.chapter}*\n` +
        `_${nachYomi.hebrewBook || ''}_\n\n` +
        `🎧 Audio & 🎬 Video shiurim by Rav Yitzchok Breitowitz\n` +
        `📚 Full chapter with Hebrew/English text\n\n` +
        `_Use @NachYomiBot for the complete experience_`;
      await publishTextToUnified(summaryText);
      console.log('[TorahYomi] Published to unified channel');
    } catch (unifiedErr) {
      console.error('[TorahYomi] Unified channel publish failed:', unifiedErr.message);
      // Don't fail the main broadcast
    }
  }

  console.log(`[${new Date().toISOString()}] Broadcast completed successfully`);

  if (ADMIN_CHAT_ID) {
    await bot
      .sendMessage(ADMIN_CHAT_ID, `✅ Daily broadcast sent: ${nachYomi.book} ${nachYomi.chapter}`)
      .catch(() => {});
  }

  process.exit(0);
}

runBroadcast().catch((err) => {
  console.error('Broadcast failed:', err.message);
  process.exit(1);
});

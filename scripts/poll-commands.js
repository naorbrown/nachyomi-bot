#!/usr/bin/env node
/**
 * Command polling script for GitHub Actions
 *
 * Fetches pending Telegram messages and responds to commands.
 * Uses getUpdates API with offset to track processed messages.
 * State is stored in .github/state/last_update_id.json
 *
 * Usage: node scripts/poll-commands.js
 * Requires: TELEGRAM_BOT_TOKEN environment variable
 *
 * Note: This has inherent latency (up to poll interval, e.g., 5 minutes).
 * For real-time responses, use a continuously running bot instead.
 */

import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';
import { createReadStream } from 'fs';
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
import { parseCommand } from '../src/utils/commandParser.js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;
const STATE_FILE = '.github/state/last_update_id.json';

if (!BOT_TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN required');
  process.exit(1);
}

// Create bot without polling (we use getUpdates manually)
const bot = new TelegramBot(BOT_TOKEN, { polling: false });

// Rate limiting (per-run, not persistent)
const rateLimits = new Map();
const RATE_LIMIT = 5;
const RATE_WINDOW = 60000;

function isRateLimited(chatId) {
  const now = Date.now();
  const userHistory = rateLimits.get(chatId) || [];
  const recentRequests = userHistory.filter((t) => now - t < RATE_WINDOW);

  if (recentRequests.length >= RATE_LIMIT) {
    return true;
  }

  recentRequests.push(now);
  rateLimits.set(chatId, recentRequests);
  return false;
}

async function loadLastUpdateId() {
  try {
    const data = await readFile(STATE_FILE, 'utf-8');
    const state = JSON.parse(data);
    return state.lastUpdateId || 0;
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

let ffmpegAvailable = false;

async function sendVideoShiur(chatId, nachYomi, shiurId) {
  if (!ffmpegAvailable) {
    await bot.sendMessage(chatId, '_Video requires FFmpeg. Use /audio instead._', {
      parse_mode: 'Markdown',
    });
    return false;
  }

  if (!shiurId) {
    await bot.sendMessage(
      chatId,
      '_No video mapped for this chapter yet. Use /audio for the full shiur._',
      { parse_mode: 'Markdown' }
    );
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

  return messages.length;
}

async function sendDailyNachYomi(chatId) {
  const nachYomi = await getTodaysNachYomi();
  const shiurId = getShiurId(nachYomi.book, nachYomi.chapter);

  await sendVideoShiur(chatId, nachYomi, shiurId);

  if (shiurId) {
    await sendAudioShiur(chatId, nachYomi, shiurId);
  }

  let chapterText = null;
  try {
    chapterText = await getChapterText(nachYomi.book, nachYomi.chapter, { maxVerses: null });
  } catch (err) {
    console.warn('Text fetch failed:', err.message);
  }
  await sendChapterText(chatId, nachYomi, chapterText);

  return nachYomi;
}

async function handleCommand(command, chatId) {
  console.log(`Processing /${command} from chat ${chatId}`);

  try {
    switch (command) {
      case 'start':
      case 'today': {
        await bot.sendMessage(chatId, buildWelcomeMessage(), { parse_mode: 'Markdown' });
        await sendDailyNachYomi(chatId);
        break;
      }

      case 'video': {
        const nachYomi = await getTodaysNachYomi();
        const shiurId = getShiurId(nachYomi.book, nachYomi.chapter);
        await sendVideoShiur(chatId, nachYomi, shiurId);
        break;
      }

      case 'audio': {
        const nachYomi = await getTodaysNachYomi();
        const shiurId = getShiurId(nachYomi.book, nachYomi.chapter);
        await sendAudioShiur(chatId, nachYomi, shiurId);
        break;
      }

      case 'text': {
        const nachYomi = await getTodaysNachYomi();
        const chapterText = await getChapterText(nachYomi.book, nachYomi.chapter, {
          maxVerses: null,
        }).catch(() => null);
        await sendChapterText(chatId, nachYomi, chapterText);
        break;
      }

      case 'broadcast': {
        if (ADMIN_CHAT_ID && chatId.toString() !== ADMIN_CHAT_ID) {
          console.log(`Unauthorized broadcast attempt from ${chatId}`);
          return;
        }
        if (!CHANNEL_ID) {
          await bot.sendMessage(chatId, 'No channel configured.');
          return;
        }
        await sendDailyNachYomi(CHANNEL_ID);
        await bot.sendMessage(chatId, '✅ Broadcast sent.');
        break;
      }

      default:
        return;
    }
  } catch (err) {
    console.error(`Command /${command} failed:`, err.message);

    const errorMessages = {
      start: '❌ Error loading chapter. Please try again.',
      today: '❌ Error loading chapter. Please try again.',
      video: `❌ Error: ${err.message}`,
      audio: `❌ Error: ${err.message}`,
      text: '❌ Error fetching text.',
      broadcast: `❌ Broadcast failed: ${err.message}`,
    };

    await bot.sendMessage(chatId, errorMessages[command] || '❌ An error occurred.').catch(() => {});
  }
}

async function pollCommands() {
  console.log(`[${new Date().toISOString()}] Polling for commands...`);

  ffmpegAvailable = await checkFfmpeg();
  console.log(`FFmpeg available: ${ffmpegAvailable}`);

  let lastUpdateId = await loadLastUpdateId();
  console.log(`Last update ID: ${lastUpdateId}`);

  try {
    // Fetch updates with offset to get only new messages
    const updates = await bot.getUpdates({
      offset: lastUpdateId + 1,
      limit: 100,
      timeout: 0,
    });

    console.log(`Received ${updates.length} update(s)`);

    if (updates.length === 0) {
      console.log('No new messages');
      process.exit(0);
    }

    for (const update of updates) {
      lastUpdateId = Math.max(lastUpdateId, update.update_id);

      if (!update.message || !update.message.text) {
        continue;
      }

      const msg = update.message;
      const chatId = msg.chat.id;

      const parsed = parseCommand(msg.text);
      if (!parsed) continue;

      const { command } = parsed;

      if (command !== 'broadcast' && isRateLimited(chatId)) {
        await bot.sendMessage(chatId, '_Please wait a moment before trying again._', {
          parse_mode: 'Markdown',
        });
        continue;
      }

      await handleCommand(command, chatId);
    }

    // Save state for next run
    await saveLastUpdateId(lastUpdateId);
    console.log(`Saved last update ID: ${lastUpdateId}`);

    console.log(`[${new Date().toISOString()}] Polling complete`);
    process.exit(0);
  } catch (err) {
    console.error('Polling failed:', err.message);
    process.exit(1);
  }
}

pollCommands();

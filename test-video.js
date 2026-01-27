/**
 * Test video embedding with a known shiur ID
 */
import TelegramBot from 'node-telegram-bot-api';
import { createReadStream } from 'fs';
import { prepareVideoForTelegram, cleanupVideo, checkFfmpeg } from './src/videoService.js';
import { getShiurVideoUrl } from './src/data/shiurMapping.js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TEST_CHAT_ID = process.env.ADMIN_CHAT_ID || process.env.TELEGRAM_CHANNEL_ID;

if (!BOT_TOKEN || !TEST_CHAT_ID) {
  console.error('Required: TELEGRAM_BOT_TOKEN and ADMIN_CHAT_ID');
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN);

async function testVideo() {
  // Test with Joshua 1 - shiur ID 31470133
  const shiurId = 31470133;
  const videoUrl = getShiurVideoUrl(shiurId);

  console.log('Testing video embedding...');
  console.log('Shiur ID:', shiurId);
  console.log('Video URL:', videoUrl);

  const ffmpegOk = await checkFfmpeg();
  console.log('FFmpeg available:', ffmpegOk);

  if (!ffmpegOk) {
    console.error('FFmpeg not available');
    process.exit(1);
  }

  console.log('Converting video (this may take 30-60 seconds)...');
  const videoFile = await prepareVideoForTelegram(videoUrl, shiurId);

  if (!videoFile) {
    console.error('Video conversion failed');
    process.exit(1);
  }

  console.log('Video ready:', videoFile.path, `(${(videoFile.size / 1024 / 1024).toFixed(1)}MB)`);

  console.log('Sending to Telegram...');
  try {
    await bot.sendVideo(TEST_CHAT_ID, createReadStream(videoFile.path), {
      caption: '🎬 *Test Video* - Joshua 1\n_Rav Yitzchok Breitowitz · Kol Halashon_',
      parse_mode: 'Markdown',
      supports_streaming: true
    });
    console.log('✅ Video sent successfully!');
  } catch (err) {
    console.error('Failed to send video:', err.message);
  }

  await cleanupVideo(videoFile.path);
  process.exit(0);
}

testVideo().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

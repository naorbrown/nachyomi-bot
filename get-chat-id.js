/**
 * Simple script to discover your Telegram chat ID
 * Run this, then send a message to your bot
 */
import TelegramBot from 'node-telegram-bot-api';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN required');
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

console.log('Bot started. Send any message to the bot to see your chat ID...');

bot.on('message', (msg) => {
  console.log('');
  console.log('='.repeat(50));
  console.log('YOUR CHAT ID:', msg.chat.id);
  console.log('Chat type:', msg.chat.type);
  console.log('From:', msg.from.first_name, msg.from.last_name || '');
  console.log('Username:', msg.from.username || 'none');
  console.log('='.repeat(50));
  console.log('');
  console.log('Use this in your .env:');
  console.log(`ADMIN_CHAT_ID=${msg.chat.id}`);
  console.log('');
});

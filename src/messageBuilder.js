/**
 * Message Builder
 * Constructs formatted Telegram messages for Nach Yomi posts
 */

import { hebrewNames, getShiurUrl, getSefariaUrl } from './data/shiurMapping.js';

/**
 * Convert number to Hebrew numerals (gematria)
 * Handles 1-999 using standard Hebrew numeral conventions
 */
export function toHebrewNumerals(num) {
  const ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
  const tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
  const hundreds = ['', 'ק', 'ר', 'ש', 'ת', 'תק', 'תר', 'תש', 'תת', 'תתק'];

  if (num <= 0 || num > 999) return num.toString();

  let result = '';
  const h = Math.floor(num / 100);
  if (h > 0) {
    result += hundreds[h];
  }

  num = num % 100;
  if (num === 15) return result + 'ט״ו';
  if (num === 16) return result + 'ט״ז';

  const t = Math.floor(num / 10);
  if (t > 0) result += tens[t];

  const o = num % 10;
  if (o > 0) result += ones[o];

  if (result.length > 1 && !result.includes('״')) {
    result = result.slice(0, -1) + '״' + result.slice(-1);
  }

  return result || 'א';
}

/**
 * Build header message for the day's 2 chapters
 * @param {{ dayNumber: number, chapters: Array<{book: string, chapter: number}> }} todaysSchedule
 */
export function buildDayHeader(todaysSchedule) {
  const { dayNumber, chapters } = todaysSchedule;
  let header = `📖 *Nach Yomi — Day ${dayNumber}*\n\n`;

  for (const { book, chapter } of chapters) {
    const hebrewName = hebrewNames[book] || book;
    header += `*${book} ${chapter}* · ${hebrewName} ${toHebrewNumerals(chapter)}\n`;
  }

  return header.trim();
}

/**
 * Build a compact caption for media messages (video/audio)
 */
export function buildMediaCaption(nachYomi, mediaType = 'video') {
  const { book, chapter } = nachYomi;
  const hebrewName = hebrewNames[book] || book;
  const icon = mediaType === 'video' ? '🎬' : '🎧';

  return (
    `${icon} *${book} ${chapter}* · ${hebrewName} ${toHebrewNumerals(chapter)}\n` +
    `_Rav Yitzchok Breitowitz_`
  );
}

/**
 * Build inline keyboard for the last message
 */
export function buildKeyboard(book, chapter) {
  const shiurUrl = getShiurUrl(book, chapter);
  const sefariaUrl = getSefariaUrl(book, chapter);

  return {
    inline_keyboard: [
      [
        { text: '🎬 Full Shiur', url: shiurUrl },
        { text: '📖 Sefaria', url: sefariaUrl },
      ],
      [{ text: '📤 Share', switch_inline_query: `Nach Yomi: ${book} ${chapter}` }],
    ],
  };
}

/**
 * Build keyboard for media messages
 */
export function buildMediaKeyboard(book, chapter) {
  const shiurUrl = getShiurUrl(book, chapter);
  const sefariaUrl = getSefariaUrl(book, chapter);

  return {
    inline_keyboard: [
      [
        { text: '🌐 Full Shiur', url: shiurUrl },
        { text: '📖 Sefaria', url: sefariaUrl },
      ],
    ],
  };
}

/**
 * Build welcome message for new users
 */
export function buildWelcomeMessage() {
  return `📖 *Nach Yomi*

Two chapters of Nevi'im and Ketuvim, every day.

🎧 Audio shiur by Rav Yitzchok Breitowitz
🎬 Video link to full shiur

_You're subscribed! New chapters daily at 6 AM Israel time._`;
}

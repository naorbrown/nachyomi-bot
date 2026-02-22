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
 * Build caption for audio messages.
 * Performer is already in the audio metadata, so keep the caption minimal.
 */
export function buildAudioCaption(chapter) {
  const { book, chapter: ch } = chapter;
  const hebrewName = hebrewNames[book] || book;
  return `*${book} ${ch}* · ${hebrewName} ${toHebrewNumerals(ch)}`;
}

/**
 * Build inline keyboard for a chapter's audio message.
 * Last chapter in the day includes a Share button.
 */
export function buildChapterKeyboard(book, chapter, isLast = false) {
  const rows = [
    [
      { text: '📖 Sefaria', url: getSefariaUrl(book, chapter) },
      { text: '🔗 Full Shiur', url: getShiurUrl(book, chapter) },
    ],
  ];

  if (isLast) {
    rows.push([{ text: '📤 Share', switch_inline_query: `Nach Yomi: ${book} ${chapter}` }]);
  }

  return { inline_keyboard: rows };
}

/**
 * Build welcome message for new users
 */
export function buildWelcomeMessage() {
  return `📖 *Nach Yomi*

Two chapters of Nevi'im and Ketuvim, every day.
Audio shiurim by Rav Yitzchok Breitowitz.

_You're subscribed! Daily at 6 AM Israel time._`;
}

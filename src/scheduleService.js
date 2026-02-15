/**
 * Schedule Service
 *
 * Self-managed 2-chapter-per-day Nach schedule starting from Isaiah.
 * Replaces the Hebcal API with pure date arithmetic.
 *
 * Order: Nevi'im Acharonim → Trei Asar → Ketuvim → Nevi'im Rishonim
 * Starting from Isaiah, cycling forever.
 */

import { getIsraelDate } from './utils/broadcastState.js';
import { getShiurId } from './data/shiurMapping.js';

export const START_DATE = '2026-02-15';
export const CHAPTERS_PER_DAY = 2;

/**
 * Nach books in broadcast order (Isaiah-first, canonical Tanakh order)
 */
export const NACH_ORDER = [
  // Nevi'im Acharonim
  { name: 'Isaiah', chapters: 66 },
  { name: 'Jeremiah', chapters: 52 },
  { name: 'Ezekiel', chapters: 48 },
  // Trei Asar
  { name: 'Hosea', chapters: 14 },
  { name: 'Joel', chapters: 4 },
  { name: 'Amos', chapters: 9 },
  { name: 'Obadiah', chapters: 1 },
  { name: 'Jonah', chapters: 4 },
  { name: 'Micah', chapters: 7 },
  { name: 'Nahum', chapters: 3 },
  { name: 'Habakkuk', chapters: 3 },
  { name: 'Zephaniah', chapters: 3 },
  { name: 'Haggai', chapters: 2 },
  { name: 'Zechariah', chapters: 14 },
  { name: 'Malachi', chapters: 3 },
  // Ketuvim (canonical Tanakh order)
  { name: 'Psalms', chapters: 150 },
  { name: 'Proverbs', chapters: 31 },
  { name: 'Job', chapters: 42 },
  { name: 'Song of Songs', chapters: 8 },
  { name: 'Ruth', chapters: 4 },
  { name: 'Lamentations', chapters: 5 },
  { name: 'Ecclesiastes', chapters: 12 },
  { name: 'Esther', chapters: 10 },
  { name: 'Daniel', chapters: 12 },
  { name: 'Ezra', chapters: 10 },
  { name: 'Nehemiah', chapters: 13 },
  { name: 'I Chronicles', chapters: 29 },
  { name: 'II Chronicles', chapters: 36 },
  // Nevi'im Rishonim
  { name: 'Joshua', chapters: 24 },
  { name: 'Judges', chapters: 21 },
  { name: 'I Samuel', chapters: 31 },
  { name: 'II Samuel', chapters: 24 },
  { name: 'I Kings', chapters: 22 },
  { name: 'II Kings', chapters: 25 },
];

/**
 * Flat list of all chapters in order: [{book, chapter}, ...]
 */
export const ALL_CHAPTERS = NACH_ORDER.flatMap(({ name, chapters }) =>
  Array.from({ length: chapters }, (_, i) => ({ book: name, chapter: i + 1 }))
);

export const TOTAL_CHAPTERS = ALL_CHAPTERS.length;
export const DAYS_PER_CYCLE = TOTAL_CHAPTERS / CHAPTERS_PER_DAY;

/**
 * Calculate days between two YYYY-MM-DD date strings.
 * Uses UTC to avoid DST issues.
 */
function diffDays(startStr, endStr) {
  const [sy, sm, sd] = startStr.split('-').map(Number);
  const [ey, em, ed] = endStr.split('-').map(Number);
  const start = Date.UTC(sy, sm - 1, sd);
  const end = Date.UTC(ey, em - 1, ed);
  return Math.round((end - start) / 86400000);
}

/**
 * Get today's 2 chapters based on the schedule.
 * @param {string} [dateStr] - YYYY-MM-DD in Israel timezone. Defaults to today.
 * @returns {{ dayNumber: number, cycleNumber: number, chapters: Array<{book: string, chapter: number, shiurId: number|null}> }}
 */
export function getTodaysChapters(dateStr) {
  const date = dateStr || getIsraelDate();
  const daysSinceStart = diffDays(START_DATE, date);

  if (daysSinceStart < 0) {
    throw new Error(`Schedule has not started yet (starts ${START_DATE}, requested ${date})`);
  }

  const cycleNumber = Math.floor(daysSinceStart / DAYS_PER_CYCLE) + 1;
  const dayInCycle = daysSinceStart % DAYS_PER_CYCLE;
  const startIndex = dayInCycle * CHAPTERS_PER_DAY;

  const chapters = [];
  for (let i = 0; i < CHAPTERS_PER_DAY; i++) {
    const entry = ALL_CHAPTERS[startIndex + i];
    chapters.push({
      book: entry.book,
      chapter: entry.chapter,
      shiurId: getShiurId(entry.book, entry.chapter),
    });
  }

  return {
    dayNumber: daysSinceStart + 1,
    cycleNumber,
    chapters,
  };
}

/**
 * Get chapters for a specific date.
 * Alias for getTodaysChapters with explicit date.
 */
export function getChaptersForDate(dateStr) {
  return getTodaysChapters(dateStr);
}

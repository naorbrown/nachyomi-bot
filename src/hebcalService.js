/**
 * Hebcal Nach Yomi Service
 *
 * Fetches the Nach Yomi schedule from Hebcal API
 */

import fetch from 'node-fetch';

/**
 * Parse the Nach Yomi title from Hebcal format
 * Example: "II Chronicles 6" -> { book: "II Chronicles", chapter: 6 }
 */
export function parseNachYomiTitle(title) {
  // Match patterns like "II Chronicles 6", "Joshua 1", "Song of Songs 3"
  const match = title.match(/^(.+?)\s+(\d+)$/);
  if (match) {
    return {
      book: match[1],
      chapter: parseInt(match[2], 10),
    };
  }
  return null;
}

/**
 * Get today's Nach Yomi from Hebcal
 */
export async function getTodaysNachYomi() {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

  try {
    const url = `https://www.hebcal.com/hebcal?v=1&cfg=json&nyomi=on&start=${dateStr}&end=${dateStr}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Hebcal API error: ${response.status}`);
    }

    const data = await response.json();

    // Find the nachyomi item
    const nachYomiItem = data.items?.find(item => item.category === 'nachyomi');

    if (!nachYomiItem) {
      throw new Error('No Nach Yomi found for today');
    }

    const parsed = parseNachYomiTitle(nachYomiItem.title);

    if (!parsed) {
      throw new Error(`Could not parse Nach Yomi title: ${nachYomiItem.title}`);
    }

    return {
      book: parsed.book,
      chapter: parsed.chapter,
      hebrew: nachYomiItem.hebrew,
      hebrewDate: nachYomiItem.hdate,
      date: nachYomiItem.date,
      sefariaLink: nachYomiItem.link,
    };
  } catch (error) {
    console.error('Error fetching Nach Yomi:', error);
    throw error;
  }
}

/**
 * Get Nach Yomi for a specific date
 */
export async function getNachYomiForDate(date) {
  const dateStr = date instanceof Date ? date.toISOString().split('T')[0] : date;

  try {
    const url = `https://www.hebcal.com/hebcal?v=1&cfg=json&nyomi=on&start=${dateStr}&end=${dateStr}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Hebcal API error: ${response.status}`);
    }

    const data = await response.json();
    const nachYomiItem = data.items?.find(item => item.category === 'nachyomi');

    if (!nachYomiItem) {
      return null;
    }

    const parsed = parseNachYomiTitle(nachYomiItem.title);

    if (!parsed) {
      return null;
    }

    return {
      book: parsed.book,
      chapter: parsed.chapter,
      hebrew: nachYomiItem.hebrew,
      hebrewDate: nachYomiItem.hdate,
      date: nachYomiItem.date,
      sefariaLink: nachYomiItem.link,
    };
  } catch (error) {
    console.error('Error fetching Nach Yomi for date:', error);
    return null;
  }
}

/**
 * Get the Nach Yomi schedule for a date range
 */
export async function getNachYomiRange(startDate, endDate) {
  const startStr = startDate instanceof Date ? startDate.toISOString().split('T')[0] : startDate;
  const endStr = endDate instanceof Date ? endDate.toISOString().split('T')[0] : endDate;

  try {
    const url = `https://www.hebcal.com/hebcal?v=1&cfg=json&nyomi=on&start=${startStr}&end=${endStr}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Hebcal API error: ${response.status}`);
    }

    const data = await response.json();

    return (
      data.items
        ?.filter(item => item.category === 'nachyomi')
        .map(item => {
          const parsed = parseNachYomiTitle(item.title);
          return parsed
            ? {
                book: parsed.book,
                chapter: parsed.chapter,
                hebrew: item.hebrew,
                hebrewDate: item.hdate,
                date: item.date,
                sefariaLink: item.link,
              }
            : null;
        })
        .filter(Boolean) || []
    );
  } catch (error) {
    console.error('Error fetching Nach Yomi range:', error);
    return [];
  }
}

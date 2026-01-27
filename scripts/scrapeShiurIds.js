/**
 * Shiur ID Scraper for Kol Halashon
 *
 * This script scrapes all shiur IDs from Rav Breitowitz's Nach shiurim on Kol Halashon.
 * Run this in a browser console on the Kol Halashon website.
 *
 * Usage:
 * 1. Go to https://www2.kolhalashon.com/en/regularSite/ravs/9991?urlFilters=25:288648|
 * 2. Open browser developer console (F12)
 * 3. Copy and paste this entire script
 * 4. Run: await scrapeAllNachShiurim()
 * 5. Copy the output JSON
 */

// Book filter IDs from Kol Halashon
const bookFilterIds = {
  "Joshua": 288649,
  "Judges": 288650,
  "I Samuel": 288651,
  "II Samuel": 288652,
  "I Kings": 288653,
  "II Kings": 288654,
  "Isaiah": 288655,
  "Jeremiah": 288656,
  "Ezekiel": 288657,
  "Hosea": 288658,
  "Joel": 288659,
  "Amos": 288660,
  "Obadiah": 288661,
  "Jonah": 288662,
  "Micah": 288663,
  "Nahum": 288664,
  "Habakkuk": 288665,
  "Zephaniah": 288666,
  "Haggai": 288667,
  "Zechariah": 288668,
  "Malachi": 288669,
  "Psalms": 288670,
  "Proverbs": 288671,
  "Job": 288672,
  "Song of Songs": 288673,
  "Ruth": 288674,
  "Lamentations": 288675,
  "Ecclesiastes": 288676,
  "Esther": 288677,
  "Daniel": 288678,
  "Ezra": 288679,
  "Nehemiah": 288680,
  "I Chronicles": 288681,
  "II Chronicles": 288682
};

// Expected chapter counts for each book
const chapterCounts = {
  "Joshua": 24,
  "Judges": 21,
  "I Samuel": 31,
  "II Samuel": 24,
  "I Kings": 22,
  "II Kings": 25,
  "Isaiah": 66,
  "Jeremiah": 52,
  "Ezekiel": 48,
  "Hosea": 14,
  "Joel": 4,
  "Amos": 9,
  "Obadiah": 1,
  "Jonah": 4,
  "Micah": 7,
  "Nahum": 3,
  "Habakkuk": 3,
  "Zephaniah": 3,
  "Haggai": 2,
  "Zechariah": 14,
  "Malachi": 3,
  "Psalms": 150,
  "Proverbs": 31,
  "Job": 42,
  "Song of Songs": 8,
  "Ruth": 4,
  "Lamentations": 5,
  "Ecclesiastes": 12,
  "Esther": 10,
  "Daniel": 12,
  "Ezra": 10,
  "Nehemiah": 13,
  "I Chronicles": 29,
  "II Chronicles": 36
};

/**
 * Extract shiur IDs from the current page
 */
function extractShiurIdsFromPage() {
  const shiurIds = [];
  const links = document.querySelectorAll('a');

  for (const link of links) {
    const href = link.href || '';
    if (href.includes('playShiur')) {
      const parts = href.split('/');
      const playShiurIndex = parts.indexOf('playShiur');
      if (playShiurIndex !== -1 && parts[playShiurIndex + 1]) {
        const id = parts[playShiurIndex + 1];
        if (!shiurIds.includes(id)) {
          shiurIds.push(id);
        }
      }
    }
  }

  return shiurIds;
}

/**
 * Extract shiur IDs with chapter info by parsing titles
 */
function extractShiurIdsWithChapters() {
  const results = [];
  const items = document.querySelectorAll('[class*="shiur-item"], [class*="card"], article');

  // Try to find shiur cards with title and ID
  const allLinks = document.querySelectorAll('a[href*="playShiur"]');

  for (const link of allLinks) {
    const href = link.href || '';
    const match = href.match(/playShiur\/(\d+)/);
    if (match) {
      const shiurId = match[1];

      // Try to find the chapter number from nearby text
      const parent = link.closest('div, article, section') || link.parentElement;
      const text = parent ? parent.innerText : '';

      // Look for chapter patterns like "Chapter 5" or "פרק ה"
      const chapterMatch = text.match(/Chapter (\d+)/i) ||
                          text.match(/chapter(\d+)/i) ||
                          text.match(/פרק ([א-ת]+)/);

      results.push({
        shiurId,
        text: text.substring(0, 200),
        chapterMatch: chapterMatch ? chapterMatch[1] : null
      });
    }
  }

  return results;
}

/**
 * Main scraper function
 * Call this from the browser console
 */
async function scrapeAllNachShiurim() {
  console.log('Starting Nach shiurim scrape...');

  const allShiurim = {};

  // Get current shiur IDs on page
  const currentIds = extractShiurIdsFromPage();
  console.log(`Found ${currentIds.length} shiur IDs on current page`);

  // Get detailed info
  const detailed = extractShiurIdsWithChapters();
  console.log('Detailed results:', detailed);

  return {
    shiurIds: currentIds,
    detailed: detailed
  };
}

// Instructions for manual use
console.log(`
=== Kol Halashon Nach Shiurim Scraper ===

To scrape shiur IDs:
1. Navigate to a book's page (e.g., Judges filter)
2. Make sure all shiurim are visible (scroll or load more)
3. Run: scrapeAllNachShiurim()
4. Copy the results

The shiur IDs can be used with the MP3 API:
https://www2.kolhalashon.com/api/files/GetMp3FileToPlay/{SHIUR_ID}
`);

// Export for use
if (typeof module !== 'undefined') {
  module.exports = { scrapeAllNachShiurim, extractShiurIdsFromPage, bookFilterIds, chapterCounts };
}

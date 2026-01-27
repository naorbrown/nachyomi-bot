/**
 * Kol Halashon Shiur Scraper
 *
 * INSTRUCTIONS:
 * 1. Open https://www.kolhalashon.com/en in Chrome
 * 2. Open Developer Tools (Cmd+Option+I or F12)
 * 3. Go to Console tab
 * 4. Copy and paste this entire script
 * 5. Press Enter and wait for results
 * 6. Copy the JSON output
 */

const BOOK_FILTERS = {
  "Isaiah": 9,
  "Ezekiel": 10,
  "Hosea": 11,
  "Joel": 12,
  "Amos": 13,
  "Obadiah": 14,
  "Jonah": 15,
  "Micah": 16,
  "Nahum": 17,
  "Habakkuk": 18,
  "Zephaniah": 19,
  "Zechariah": 21,
  "Malachi": 22,
  "Psalms": 23,
  "Proverbs": 24,
  "Job": 25,
  "Song of Songs": 26,
  "Ruth": 27,
  "Lamentations": 28,
  "Ecclesiastes": 29,
  "Esther": 30,
  "Daniel": 31,
  "Ezra": 32,
  "Nehemiah": 33,
  "I Chronicles": 34,
  "I Samuel": 4,
  "II Kings": 7
};

const CHAPTER_COUNTS = {
  "Isaiah": 66,
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
  "I Samuel": 31,
  "II Kings": 25
};

function hebrewToNumber(hebrew) {
  const values = {'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
    'י': 10, 'כ': 20, 'ל': 30, 'מ': 40, 'נ': 50, 'ס': 60, 'ע': 70, 'פ': 80, 'צ': 90,
    'ק': 100, 'ר': 200, 'ש': 300, 'ת': 400};
  let total = 0;
  for (const char of hebrew.replace(/[״׳]/g, '')) total += values[char] || 0;
  return total || null;
}

function extractChapter(title) {
  // Try Hebrew chapter number
  let match = title.match(/פרק\s*([א-ת״׳]+)/);
  if (match) return hebrewToNumber(match[1]);
  // Try English chapter number
  match = title.match(/Chapter\s+(\d+)/i);
  if (match) return parseInt(match[1], 10);
  return null;
}

async function fetchBookShiurim(bookName, filterId, maxChapters) {
  const allShiurim = [];
  let page = 1;
  const maxPages = Math.ceil(maxChapters / 24) + 1;

  while (page <= maxPages) {
    try {
      const response = await fetch('https://www.kolhalashon.com/api/Search/WebSite_GetRavShiurim/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ravId: 9991,
          languageId: 1,
          pageNumber: page,
          pageSize: 100,
          filters: [{ filterId: 15, valueId: filterId }]
        })
      });

      if (!response.ok) {
        console.log(`  API returned ${response.status} for ${bookName} page ${page}`);
        break;
      }

      const data = await response.json();
      if (!data.shiurim || data.shiurim.length === 0) break;

      allShiurim.push(...data.shiurim);
      if (data.shiurim.length < 100) break;
      page++;
    } catch (err) {
      console.log(`  Error fetching ${bookName} page ${page}: ${err.message}`);
      break;
    }
  }

  // Parse chapters from shiur names
  const chapterMap = {};
  for (const shiur of allShiurim) {
    const chapter = extractChapter(shiur.shiurName || '');
    if (chapter && chapter >= 1 && chapter <= maxChapters && !chapterMap[chapter]) {
      chapterMap[chapter] = shiur.shiurId;
    }
  }

  return chapterMap;
}

async function scrapeAllBooks() {
  console.log('Starting scrape of all books...\n');
  const results = {};

  for (const [bookName, filterId] of Object.entries(BOOK_FILTERS)) {
    const maxChapters = CHAPTER_COUNTS[bookName];
    console.log(`Fetching ${bookName} (${maxChapters} chapters)...`);

    const chapterMap = await fetchBookShiurim(bookName, filterId, maxChapters);
    const mappedCount = Object.keys(chapterMap).length;

    console.log(`  Found ${mappedCount}/${maxChapters} chapters`);

    if (mappedCount > 0) {
      results[bookName] = chapterMap;
    }

    // Small delay between books
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('\n\n========== RESULTS ==========\n');
  console.log(JSON.stringify(results, null, 2));
  console.log('\n========== END ==========\n');

  return results;
}

// Run the scraper
scrapeAllBooks();

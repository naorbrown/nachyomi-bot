/**
 * Comprehensive Shiur ID Scraper for Kol Halashon
 *
 * This script scrapes all Nach Yomi shiur IDs from Rav Breitowitz's shiurim.
 * It visits each shiur page to get the exact chapter mapping.
 *
 * Usage: node scripts/scrapeAllShiurim.js
 *
 * Note: This requires puppeteer to be installed: npm install puppeteer
 */

import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';

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

async function scrapeBookShiurim(browser, bookName, bookFilterId) {
  const page = await browser.newPage();

  try {
    console.log(`Scraping ${bookName}...`);

    // Navigate to the book's filter page
    const url = `https://www2.kolhalashon.com/en/regularSite/ravs/9991?urlFilters=26:${bookFilterId}|`;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // Wait for shiurim to load
    await page.waitForSelector('a[href*="playShiur"]', { timeout: 30000 });

    // Extract all shiur IDs from the page
    const shiurIds = await page.evaluate(() => {
      const ids = [];
      const links = document.querySelectorAll('a[href*="playShiur"]');
      for (const link of links) {
        const match = link.href.match(/playShiur\/(\d+)/);
        if (match && !ids.includes(match[1])) {
          ids.push(match[1]);
        }
      }
      return ids;
    });

    console.log(`Found ${shiurIds.length} shiur IDs for ${bookName}`);

    // Now visit each shiur page to get the chapter number
    const chapterMapping = {};

    for (const shiurId of shiurIds) {
      try {
        const shiurUrl = `https://www2.kolhalashon.com/en/regularSite/playShiur/${shiurId}`;
        await page.goto(shiurUrl, { waitUntil: 'networkidle2', timeout: 30000 });

        // Extract chapter number from the page title
        const chapterInfo = await page.evaluate(() => {
          const text = document.body.innerText;
          const match = text.match(/Chapter (\d+)/i);
          return match ? parseInt(match[1]) : null;
        });

        if (chapterInfo) {
          chapterMapping[chapterInfo] = parseInt(shiurId);
          console.log(`  Chapter ${chapterInfo}: ${shiurId}`);
        }

        // Small delay to be respectful to the server
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.warn(`  Error getting chapter for shiur ${shiurId}:`, error.message);
      }
    }

    return chapterMapping;
  } catch (error) {
    console.error(`Error scraping ${bookName}:`, error.message);
    return {};
  } finally {
    await page.close();
  }
}

async function main() {
  console.log('Starting comprehensive Nach shiurim scrape...');
  console.log('This may take a while...\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const allMappings = {};

  for (const [bookName, bookFilterId] of Object.entries(bookFilterIds)) {
    const mapping = await scrapeBookShiurim(browser, bookName, bookFilterId);
    if (Object.keys(mapping).length > 0) {
      allMappings[bookName] = mapping;
    }

    // Delay between books
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  await browser.close();

  // Output the results
  console.log('\n=== COMPLETE SHIUR MAPPING ===\n');
  console.log(JSON.stringify(allMappings, null, 2));

  // Save to file
  const outputPath = './src/data/scrapedShiurMapping.json';
  writeFileSync(outputPath, JSON.stringify(allMappings, null, 2));
  console.log(`\nSaved to ${outputPath}`);

  // Generate JavaScript code
  console.log('\n=== JAVASCRIPT CODE FOR shiurMapping.js ===\n');
  for (const [bookName, chapters] of Object.entries(allMappings)) {
    const chapterEntries = Object.entries(chapters)
      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
      .map(([ch, id]) => `${ch}: ${id}`)
      .join(', ');
    console.log(`  "${bookName}": {`);
    console.log(`    ${chapterEntries}`);
    console.log(`  },`);
  }
}

main().catch(console.error);

/**
 * Sefaria Service
 *
 * Fetches the text of Nach chapters from Sefaria API
 */

import fetch from 'node-fetch';

/**
 * Fetch the text of a Nach chapter from Sefaria
 */
export async function getChapterText(book, chapter, options = {}) {
  const {
    includeHebrew = true,
    includeEnglish = true,
    maxVerses = null, // Limit number of verses (for long chapters)
  } = options;

  // Convert book name to Sefaria format
  const sefariaBook = book.replace(/ /g, '_');
  const url = `https://www.sefaria.org/api/texts/${sefariaBook}.${chapter}?context=0&pad=0`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'NachYomiBot/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Sefaria API error: ${response.status}`);
    }

    const data = await response.json();

    let hebrewText = [];
    let englishText = [];

    // Handle Hebrew text
    if (includeHebrew && data.he) {
      hebrewText = Array.isArray(data.he) ? data.he : [data.he];
    }

    // Handle English text
    if (includeEnglish && data.text) {
      englishText = Array.isArray(data.text) ? data.text : [data.text];
    }

    // Apply verse limit if specified
    if (maxVerses && maxVerses > 0) {
      hebrewText = hebrewText.slice(0, maxVerses);
      englishText = englishText.slice(0, maxVerses);
    }

    return {
      book: data.book || book,
      chapter: chapter,
      hebrewTitle: data.heTitle,
      hebrewText,
      englishText,
      totalVerses: Math.max(
        Array.isArray(data.he) ? data.he.length : 1,
        Array.isArray(data.text) ? data.text.length : 1
      ),
      sefariaUrl: `https://www.sefaria.org/${sefariaBook}.${chapter}`,
    };
  } catch (error) {
    console.error(`Error fetching text for ${book} ${chapter}:`, error);
    throw error;
  }
}

/**
 * Format chapter text for Telegram message
 */
export function formatChapterForTelegram(chapterData, options = {}) {
  const {
    maxLength = 4000, // Telegram message limit is ~4096
    showHebrew = true,
    showEnglish = true,
    versesPreview = 3, // Show first N verses as preview
  } = options;

  let message = '';

  // Hebrew preview
  if (showHebrew && chapterData.hebrewText?.length > 0) {
    message += '📜 *עברית:*\n\n';

    const versesToShow = chapterData.hebrewText.slice(0, versesPreview);
    versesToShow.forEach((verse, index) => {
      // Clean HTML tags from verse text
      const cleanVerse = stripHtml(verse);
      message += `(${index + 1}) ${cleanVerse}\n`;
    });

    if (chapterData.hebrewText.length > versesPreview) {
      message += `\n_...ועוד ${chapterData.hebrewText.length - versesPreview} פסוקים_\n`;
    }
    message += '\n';
  }

  // English preview
  if (showEnglish && chapterData.englishText?.length > 0) {
    message += '📖 *English:*\n\n';

    const versesToShow = chapterData.englishText.slice(0, versesPreview);
    versesToShow.forEach((verse, index) => {
      // Clean HTML tags from verse text
      const cleanVerse = stripHtml(verse);
      message += `(${index + 1}) ${cleanVerse}\n`;
    });

    if (chapterData.englishText.length > versesPreview) {
      message += `\n_...and ${chapterData.englishText.length - versesPreview} more verses_\n`;
    }
  }

  // Trim if too long
  if (message.length > maxLength) {
    message = message.substring(0, maxLength - 50) + '\n\n_[Message truncated]_';
  }

  return message;
}

/**
 * Strip HTML tags from text
 */
function stripHtml(text) {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

/**
 * Get a summary of the chapter
 */
export async function getChapterSummary(book, chapter) {
  const sefariaBook = book.replace(/ /g, '_');
  const sheetUrl = `https://www.sefaria.org/api/related/${sefariaBook}.${chapter}`;

  try {
    const response = await fetch(sheetUrl);
    if (!response.ok) {
      return null;
    }
    // For now, we don't parse the related content
    // This could be expanded to pull in commentary summaries
    return null;
  } catch {
    return null;
  }
}

/**
 * Message Builder
 * Constructs formatted Telegram messages for Nach Yomi posts
 */

import { hebrewNames, getShiurUrl, getSefariaUrl } from './data/shiurMapping.js';

// Telegram message limit
const MAX_MESSAGE_LENGTH = 4000;

/**
 * Build the main Nach Yomi daily message with ALL Hebrew and English text
 */
export function buildDailyMessage(nachYomi, chapterText = null) {
  const { book, chapter, hebrew, hebrewDate } = nachYomi;
  const hebrewName = hebrewNames[book] || book;

  let message = `📖 *${book} ${chapter}* · ${hebrewName} ${toHebrewNumerals(chapter)}\n`;
  message += `${hebrewDate}\n\n`;

  // Add ALL verses (Hebrew + English)
  if (chapterText?.hebrewText?.length > 0) {
    const totalVerses = chapterText.hebrewText.length;

    for (let i = 0; i < totalVerses; i++) {
      const verseNum = toHebrewNumerals(i + 1);

      // Hebrew text
      const hebrewVerse = stripHtml(chapterText.hebrewText[i] || '');

      // English translation
      const englishVerse = chapterText.englishText?.[i]
        ? stripHtml(chapterText.englishText[i])
        : '';

      // Check if adding this verse would exceed limit
      const verseBlock = `*${verseNum}.* ${hebrewVerse}\n_${englishVerse}_\n\n`;

      if (message.length + verseBlock.length > MAX_MESSAGE_LENGTH - 100) {
        const remaining = totalVerses - i;
        message += `\n_...${remaining} more verses - see full text on Sefaria_`;
        break;
      }

      message += `*${verseNum}.* ${hebrewVerse}\n`;
      if (englishVerse) {
        message += `_${englishVerse}_\n`;
      }
      message += '\n';
    }
  }

  return message.trim();
}

/**
 * Build a compact caption for media messages (video/audio)
 */
export function buildMediaCaption(nachYomi) {
  const { book, chapter } = nachYomi;
  const hebrewName = hebrewNames[book] || book;

  return `🎬 *${book} ${chapter}* · ${hebrewName} ${toHebrewNumerals(chapter)}\n` +
         `_Rav Yitzchok Breitowitz · Kol Halashon_`;
}

/**
 * Build inline keyboard for the text message
 */
export function buildKeyboard(book, chapter) {
  const shiurUrl = getShiurUrl(book, chapter);
  const sefariaUrl = getSefariaUrl(book, chapter);

  return {
    inline_keyboard: [
      [
        { text: '🎬 Shiur', url: shiurUrl },
        { text: '📖 Full Text', url: sefariaUrl }
      ],
      [
        { text: '📤 Share', switch_inline_query: `Nach Yomi: ${book} ${chapter}` }
      ]
    ]
  };
}

/**
 * Build keyboard for media messages (more compact)
 */
export function buildMediaKeyboard(book, chapter) {
  const shiurUrl = getShiurUrl(book, chapter);
  const sefariaUrl = getSefariaUrl(book, chapter);

  return {
    inline_keyboard: [
      [
        { text: '🌐 Kol Halashon', url: shiurUrl },
        { text: '📖 Sefaria', url: sefariaUrl }
      ]
    ]
  };
}

/**
 * Build a welcome message for new users
 */
export function buildWelcomeMessage() {
  return `📖 *Nach Yomi Bot*

Daily Nach chapter with Rav Breitowitz's shiur.

*Commands*
/today — Today's chapter
/tomorrow — Tomorrow's chapter
/video — Force video mode
/about — About this bot

_One chapter of Nevi'im or Kesuvim each day._`;
}

/**
 * Build the about message
 */
export function buildAboutMessage() {
  return `*Nach Yomi Bot*

Daily Nach Yomi with shiurim by Harav Yitzchok Breitowitz שליט״א from Kol Halashon.

*Features*
• Embedded video/audio shiurim
• Hebrew text with English translation
• Daily scheduled posts

*Sources*
• Schedule — Hebcal
• Shiurim — Kol Halashon
• Text — Sefaria

*About Rav Breitowitz*
Rav of Kehillat Ohr Somayach, Jerusalem. Renowned for depth, clarity, and practical wisdom.

_לעילוי נשמת כל לומדי התורה_`;
}

/**
 * Convert number to Hebrew numerals
 */
function toHebrewNumerals(num) {
  const ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
  const tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
  const hundreds = ['', 'ק', 'ר', 'ש', 'ת'];

  if (num <= 0 || num > 999) return num.toString();

  let result = '';

  const h = Math.floor(num / 100);
  if (h > 0) {
    if (h <= 4) {
      result += hundreds[h];
    } else {
      result += 'ת' + hundreds[h - 4];
    }
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
 * Strip HTML tags and decode all HTML entities from text
 */
function stripHtml(text) {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, '')
    // Common HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&thinsp;/g, '')
    .replace(/&ensp;/g, ' ')
    .replace(/&emsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&lsquo;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&hellip;/g, '...')
    // Numeric entities
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    // Any remaining entities
    .replace(/&[a-zA-Z0-9#]+;/g, '')
    // Clean up whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

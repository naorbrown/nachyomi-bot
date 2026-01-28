/**
 * Message Builder
 * Constructs formatted Telegram messages for Nach Yomi posts
 */

import { hebrewNames, getShiurUrl, getSefariaUrl } from './data/shiurMapping.js';

// Telegram message limit (with buffer for safety)
const MAX_MESSAGE_LENGTH = 3800;

/**
 * Build daily messages with ALL Hebrew and English text
 * Returns an array of messages if text is too long
 */
export function buildDailyMessages(nachYomi, chapterText = null) {
  const { book, chapter, hebrewDate } = nachYomi;
  const hebrewName = hebrewNames[book] || book;

  const messages = [];
  let currentMessage = `📖 *${book} ${chapter}* · ${hebrewName} ${toHebrewNumerals(chapter)}\n`;
  currentMessage += `${hebrewDate}\n\n`;

  if (!chapterText?.hebrewText?.length) {
    messages.push(currentMessage.trim());
    return messages;
  }

  const totalVerses = chapterText.hebrewText.length;

  for (let i = 0; i < totalVerses; i++) {
    const verseNum = toHebrewNumerals(i + 1);
    const hebrewVerse = stripHtml(chapterText.hebrewText[i] || '');
    const englishVerse = chapterText.englishText?.[i] ? stripHtml(chapterText.englishText[i]) : '';

    let verseBlock = `*${verseNum}.* ${hebrewVerse}\n`;
    if (englishVerse) {
      verseBlock += `_${englishVerse}_\n`;
    }
    verseBlock += '\n';

    // If adding this verse exceeds limit, start new message
    if (currentMessage.length + verseBlock.length > MAX_MESSAGE_LENGTH) {
      messages.push(currentMessage.trim());
      currentMessage = verseBlock;
    } else {
      currentMessage += verseBlock;
    }
  }

  // Add remaining content
  if (currentMessage.trim()) {
    messages.push(currentMessage.trim());
  }

  return messages;
}

/**
 * Build single message (backward compatibility) - truncates if too long
 */
export function buildDailyMessage(nachYomi, chapterText = null) {
  const messages = buildDailyMessages(nachYomi, chapterText);
  return messages[0] || '';
}

/**
 * Build a compact caption for media messages (video/audio)
 */
export function buildMediaCaption(nachYomi, mediaType = 'video') {
  const { book, chapter } = nachYomi;
  const hebrewName = hebrewNames[book] || book;
  const icon = mediaType === 'video' ? '🎬' : '🎧';

  return `${icon} *${book} ${chapter}* · ${hebrewName} ${toHebrewNumerals(chapter)}\n` +
         `_Rav Yitzchok Breitowitz_`;
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
        { text: '🎬 Full Shiur', url: shiurUrl },
        { text: '📖 Sefaria', url: sefariaUrl }
      ],
      [
        { text: '📤 Share', switch_inline_query: `Nach Yomi: ${book} ${chapter}` }
      ]
    ]
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
        { text: '📖 Sefaria', url: sefariaUrl }
      ]
    ]
  };
}

/**
 * Build welcome message for new users
 */
export function buildWelcomeMessage() {
  return `📖 *Nach Yomi*

Daily chapter with Rav Breitowitz's shiurim.

/start — Full chapter (video + audio + text)
/video — Video only
/audio — Audio only
/text — Text only

_Posts daily at 6 AM Israel time._`;
}

/**
 * Convert number to Hebrew numerals (gematria)
 * Handles 1-999 using standard Hebrew numeral conventions
 */
function toHebrewNumerals(num) {
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
 * Strip HTML tags and decode all HTML entities
 */
function stripHtml(text) {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, '')
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
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&[a-zA-Z0-9#]+;/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

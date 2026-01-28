/**
 * Mapping of Nach books to Kol Halashon shiur IDs for Rav Breitowitz's shiurim
 *
 * Data source: https://www2.kolhalashon.com/en/regularSite/ravs/9991
 *
 * The Nach Yomi cycle covers all books of Nevi'im (Prophets) and Kesuvim (Writings)
 * with one chapter per day over a 2-year cycle.
 */

// Shiur IDs mapped by book and chapter
// Format: bookName -> { chapterNumber: shiurId }
export const shiurMapping = {
  // === NEVI'IM RISHONIM (Early Prophets) ===

  "Joshua": {
    1: 31470133, 2: 31470135, 3: 31470137, 4: 31470138, 5: 31470139,
    6: 31472601, 7: 31472602, 8: 31472604, 9: 31472606, 10: 31472607,
    11: 31574538, 12: 31574542, 13: 31574543, 14: 31574549, 15: 31574550,
    16: 31576723, 17: 31576724, 18: 31576725, 19: 31576726, 20: 31576727,
    21: 31576728, 22: 31576729, 23: 31576732, 24: 31576735
  },

  // Note: The following books need their shiur IDs mapped by scraping the Kol Halashon pages
  // For now, we'll use null to indicate the shiur exists but needs ID lookup
  // The bot will fall back to the book's main page when specific shiur ID is not available

  "Judges": {
    1: 31593902, 2: 31593904, 3: 31593905, 4: 31593906, 5: 31594825,
    6: 31598992, 7: 31598993, 8: 31598995, 9: 31598998, 10: 31627039,
    11: 31627040, 12: 31627041, 13: 31627042, 14: 31627043, 15: 31627045,
    16: 31643376, 17: 31644590, 18: 31644591, 19: 31644611, 20: 31644595,
    21: 31644596
  },

  "I Samuel": {
    // Chapters 1-7 need manual lookup from page 2
    8: 31645701, 9: 31646164, 10: 31650841, 11: 31650842, 12: 31650843,
    13: 31650844, 14: 31650845, 15: 31650846, 16: 31653363, 17: 31656285,
    18: 31660293, 19: 31660763, 20: 31661290, 21: 31695626, 22: 31695738,
    23: 31698099, 24: 31698100, 25: 31698767, 26: 31698768, 27: 31698792,
    28: 31700641, 29: 31701207, 30: 31701208, 31: 31701209
  },

  "II Samuel": {
    1: 31716183, 2: 31716184, 3: 31716185, 4: 31716186, 5: 31716187,
    6: 31716188, 7: 31716189, 8: 31716607, 9: 31716190, 10: 31714618,
    11: 31716191, 12: 31716192, 13: 31714619, 14: 31714620, 15: 31714617,
    16: 31716608, 17: 31716609, 18: 31716610, 19: 31718786, 20: 31718794,
    21: 31718787, 22: 31720080, 23: 31720082, 24: 31720931
  },

  "I Kings": {
    1: 31753952, 2: 31754564, 3: 31756403, 4: 31756404, 5: 31757618,
    6: 32438273, 7: 32438641, 8: 32439301, 9: 32439239, 10: 32440484,
    11: 32441116, 12: 32442218, 13: 32442750, 14: 32463897, 15: 32463898,
    16: 32465944, 17: 32466317, 18: 32467083, 19: 32467217, 20: 32483465,
    21: 32483580, 22: 32506026
  },

  "II Kings": {
    // Chapter 1 needs manual lookup from page 2
    2: 32506261, 3: 32508968, 4: 32509364, 5: 32511699, 6: 32512404,
    7: 32512520, 8: 32513321, 9: 32513716, 10: 32515046, 11: 32517523,
    12: 32517562, 13: 32517563, 14: 32519361, 15: 32520309, 16: 32520310,
    17: 32521174, 18: 32521809, 19: 32975111, 20: 32978061, 21: 32980441,
    22: 32980442, 23: 32980878, 24: 32981353, 25: 32981757
  },

  // === NEVI'IM ACHARONIM (Later Prophets) ===

  "Isaiah": {
    1: 32996326, 2: 32996737, 3: 32997189, 4: 32997190, 5: 32998927,
    6: 32999902, 7: 33001162, 8: 33002466, 9: 33002628, 10: 33003012,
    11: 33015251, 12: 33015252, 13: 33015925, 14: 33015926, 15: 33018119,
    16: 33018121, 17: 33018693, 18: 33018702, 19: 33019195, 20: 33022319,
    21: 33022979, 22: 33022981, 23: 33033503, 24: 33035677, 25: 33036397,
    26: 33036401, 27: 33284023, 28: 33285177, 29: 33286144, 30: 33287362,
    31: 33287947, 32: 33287972, 33: 33288916, 34: 33288917, 35: 33288918,
    36: 33291013, 37: 33291018, 38: 33292130, 39: 33292926, 40: 33292927,
    41: 33304338, 42: 33304339, 43: 33306137, 44: 33307679, 45: 33307681,
    46: 33307686, 47: 33307687, 48: 33309938, 49: 33309939, 50: 33309940,
    51: 33312084, 52: 33312085, 53: 33312130, 54: 33312131, 55: 33312132,
    56: 33312133, 57: 33312134, 58: 33312135, 59: 33326833, 60: 33326834,
    61: 33327661, 62: 33327662, 63: 33328265, 64: 33328270, 65: 33328272,
    66: 33328319
  },
  "Jeremiah": {
    1: 33355674, 2: 33355728, 3: 33357192, 4: 33357194, 5: 33357195,
    6: 33357196, 7: 33361919, 8: 33361941, 9: 33361942, 10: 33375048,
    11: 33375547, 12: 33375548, 13: 33378317, 14: 33378764, 15: 33379892,
    16: 33380412, 17: 33380413, 18: 33380414, 19: 33380415, 20: 33394128,
    21: 33394129, 22: 33394130, 23: 33396848, 24: 33396849, 25: 33397417,
    26: 33397523, 27: 33397524, 28: 33398102, 29: 33401479, 30: 33401480,
    31: 33401481, 32: 33424624, 33: 33424625, 34: 33424626, 35: 33424627,
    36: 33427939, 37: 33427943, 38: 33427947, 39: 33427949, 40: 33427951,
    41: 33432209, 42: 33432210, 43: 33432211, 44: 33432212, 45: 33432213,
    46: 33447040, 47: 33447041, 48: 33447042, 49: 33447043, 50: 33464289,
    51: 33464290, 52: 33464291
  },
  "Ezekiel": { totalChapters: 48, available: true },

  // === TREI ASAR (Twelve Minor Prophets) ===

  "Hosea": { totalChapters: 14, available: true },
  "Joel": { totalChapters: 4, available: true },
  "Amos": { totalChapters: 9, available: true },
  "Obadiah": { totalChapters: 1, available: true },
  "Jonah": { totalChapters: 4, available: true },
  "Micah": { totalChapters: 7, available: true },
  "Nahum": { totalChapters: 3, available: true },
  "Habakkuk": { totalChapters: 3, available: true },
  "Zephaniah": { totalChapters: 3, available: true },
  "Haggai": {
    1: 34348826, 2: 34348827
  },
  "Zechariah": { totalChapters: 14, available: true },
  "Malachi": { totalChapters: 3, available: true },

  // === KESUVIM (Writings) ===

  "Psalms": { totalChapters: 150, available: true }, // 155 shiurim (some chapters have multiple)
  "Proverbs": { totalChapters: 31, available: true },
  "Job": { totalChapters: 42, available: true },
  "Song of Songs": { totalChapters: 8, available: true },
  "Ruth": { totalChapters: 4, available: true },
  "Lamentations": { totalChapters: 5, available: true },
  "Ecclesiastes": { totalChapters: 12, available: true },
  "Esther": { totalChapters: 10, available: true },
  "Daniel": { totalChapters: 12, available: true },
  "Ezra": { totalChapters: 10, available: true },
  "Nehemiah": { totalChapters: 13, available: true },
  "I Chronicles": { totalChapters: 29, available: true },
  "II Chronicles": {
    1: 38417802, 2: 38417803, 3: 38417804, 4: 38419488, 5: 38419569,
    6: 38419570, 7: 38419571, 8: 38423221, 9: 38423222, 10: 38423223,
    11: 38436828, 12: 38436829, 13: 38436830, 14: 38436831, 15: 38436832,
    16: 38441389, 17: 38441390, 18: 38441391, 19: 38445822, 20: 38445823,
    21: 38445824, 22: 38445846, 23: 38445847, 24: 38465475,
    25: 38465483, 26: 38465487, 27: 38465512, 28: 38465525, 29: 38488986,
    30: 38489585, 31: 38489589, 32: 38489591, 33: 38507874, 34: 38507918,
    35: 38508108, 36: 38512436
  }
};

// Name mappings between Hebcal format and our internal format
export const hebcalToInternal = {
  "Joshua": "Joshua",
  "Judges": "Judges",
  "I Samuel": "I Samuel",
  "II Samuel": "II Samuel",
  "I Kings": "I Kings",
  "II Kings": "II Kings",
  "Isaiah": "Isaiah",
  "Jeremiah": "Jeremiah",
  "Ezekiel": "Ezekiel",
  "Hosea": "Hosea",
  "Joel": "Joel",
  "Amos": "Amos",
  "Obadiah": "Obadiah",
  "Jonah": "Jonah",
  "Micah": "Micah",
  "Nahum": "Nahum",
  "Habakkuk": "Habakkuk",
  "Zephaniah": "Zephaniah",
  "Haggai": "Haggai",
  "Zechariah": "Zechariah",
  "Malachi": "Malachi",
  "Psalms": "Psalms",
  "Proverbs": "Proverbs",
  "Job": "Job",
  "Song of Songs": "Song of Songs",
  "Ruth": "Ruth",
  "Lamentations": "Lamentations",
  "Ecclesiastes": "Ecclesiastes",
  "Esther": "Esther",
  "Daniel": "Daniel",
  "Ezra": "Ezra",
  "Nehemiah": "Nehemiah",
  "I Chronicles": "I Chronicles",
  "II Chronicles": "II Chronicles"
};

// Hebrew names for display
export const hebrewNames = {
  "Joshua": "יהושע",
  "Judges": "שופטים",
  "I Samuel": "שמואל א",
  "II Samuel": "שמואל ב",
  "I Kings": "מלכים א",
  "II Kings": "מלכים ב",
  "Isaiah": "ישעיהו",
  "Jeremiah": "ירמיהו",
  "Ezekiel": "יחזקאל",
  "Hosea": "הושע",
  "Joel": "יואל",
  "Amos": "עמוס",
  "Obadiah": "עובדיה",
  "Jonah": "יונה",
  "Micah": "מיכה",
  "Nahum": "נחום",
  "Habakkuk": "חבקוק",
  "Zephaniah": "צפניה",
  "Haggai": "חגי",
  "Zechariah": "זכריה",
  "Malachi": "מלאכי",
  "Psalms": "תהלים",
  "Proverbs": "משלי",
  "Job": "איוב",
  "Song of Songs": "שיר השירים",
  "Ruth": "רות",
  "Lamentations": "איכה",
  "Ecclesiastes": "קהלת",
  "Esther": "אסתר",
  "Daniel": "דניאל",
  "Ezra": "עזרא",
  "Nehemiah": "נחמיה",
  "I Chronicles": "דברי הימים א",
  "II Chronicles": "דברי הימים ב"
};

// Kol Halashon filter IDs for each Nach book (used for searching/filtering)
export const kolHalashonBookIds = {
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

/**
 * Get the Kol Halashon shiur URL for a specific chapter
 */
export function getShiurUrl(book, chapter) {
  const bookData = shiurMapping[book];

  if (bookData && typeof bookData === 'object' && bookData[chapter]) {
    // We have a specific shiur ID
    return `https://www2.kolhalashon.com/en/regularSite/playShiur/${bookData[chapter]}`;
  }

  // Fallback to Rav Breitowitz's Nach page with book filter
  const bookId = kolHalashonBookIds[book];
  if (bookId) {
    return `https://www2.kolhalashon.com/en/regularSite/ravs/9991?urlFilters=26:${bookId}|`;
  }

  // Ultimate fallback - Rav Breitowitz's main Nach page
  return "https://www2.kolhalashon.com/en/regularSite/ravs/9991?urlFilters=25:288648|";
}

/**
 * Get Sefaria URL for the chapter text
 */
export function getSefariaUrl(book, chapter) {
  const sefariaBook = book.replace(/ /g, "_");
  return `https://www.sefaria.org/${sefariaBook}.${chapter}`;
}

/**
 * Get Sefaria API URL for fetching text
 */
export function getSefariaApiUrl(book, chapter) {
  const sefariaBook = book.replace(/ /g, "_");
  return `https://www.sefaria.org/api/texts/${sefariaBook}.${chapter}?context=0&pad=0`;
}

/**
 * Get the shiur ID for a specific book and chapter
 */
export function getShiurId(book, chapter) {
  const bookData = shiurMapping[book];
  if (bookData && typeof bookData === 'object' && bookData[chapter]) {
    return bookData[chapter];
  }
  return null;
}

/**
 * Get the thumbnail URL for a shiur
 */
export function getShiurThumbnailUrl(shiurId) {
  if (!shiurId) return null;
  // Thumbnail URL pattern: /imgs/VideoThumbNails/{first5digits}/{shiurId}.jpg
  const prefix = String(shiurId).substring(0, 5);
  return `https://www2.kolhalashon.com/imgs/VideoThumbNails/${prefix}/${shiurId}.jpg`;
}

/**
 * Get the MP3 audio URL for a shiur (for embedding in Telegram)
 * This URL is used in the "Listen" mode of Kol Halashon
 */
export function getShiurAudioUrl(shiurId) {
  if (!shiurId) return null;
  return `https://www2.kolhalashon.com/api/files/GetMp3FileToPlay/${shiurId}`;
}

/**
 * Get the HLS video stream URL for a shiur
 * Pattern: https://media2.kolhalashon.com:9001/KHL_Video/_definst_/amlst:NewArchive/HD/{prefix}/{shiurId}/playlist.m3u8
 */
export function getShiurVideoUrl(shiurId) {
  if (!shiurId) return null;
  const prefix = String(shiurId).substring(0, 5);
  return `https://media2.kolhalashon.com:9001/KHL_Video/_definst_/amlst:NewArchive/HD/${prefix}/${shiurId}/playlist.m3u8`;
}

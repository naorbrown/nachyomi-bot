import { describe, it, expect } from 'vitest';
import {
  buildDailyMessages,
  buildDailyMessage,
  buildMediaCaption,
  buildKeyboard,
  buildMediaKeyboard,
  buildWelcomeMessage,
} from '../../src/messageBuilder.js';

describe('buildDailyMessages', () => {
  const mockNachYomi = {
    book: 'Joshua',
    chapter: 1,
    hebrewDate: '5 Shevat 5784',
  };

  describe('basic functionality', () => {
    it('should return array with header when no chapter text provided', () => {
      const messages = buildDailyMessages(mockNachYomi);
      expect(Array.isArray(messages)).toBe(true);
      expect(messages.length).toBe(1);
      expect(messages[0]).toContain('Joshua 1');
    });

    it('should format book and chapter in header', () => {
      const messages = buildDailyMessages(mockNachYomi);
      expect(messages[0]).toContain('Joshua 1');
    });

    it('should include Hebrew date in header', () => {
      const messages = buildDailyMessages(mockNachYomi);
      expect(messages[0]).toContain('5 Shevat 5784');
    });

    it('should include Hebrew book name', () => {
      const messages = buildDailyMessages(mockNachYomi);
      expect(messages[0]).toContain('יהושע'); // Hebrew name for Joshua
    });
  });

  describe('with chapter text', () => {
    const mockChapterText = {
      hebrewText: ['פסוק ראשון', 'פסוק שני', 'פסוק שלישי'],
      englishText: ['First verse', 'Second verse', 'Third verse'],
    };

    it('should combine Hebrew and English verses', () => {
      const messages = buildDailyMessages(mockNachYomi, mockChapterText);
      expect(messages[0]).toContain('פסוק ראשון');
      expect(messages[0]).toContain('First verse');
    });

    it('should number verses with Hebrew numerals', () => {
      const messages = buildDailyMessages(mockNachYomi, mockChapterText);
      expect(messages[0]).toContain('א.');
      expect(messages[0]).toContain('ב.');
      expect(messages[0]).toContain('ג.');
    });

    it('should handle missing English text', () => {
      const hebrewOnlyText = {
        hebrewText: ['פסוק ראשון'],
        englishText: [],
      };
      const messages = buildDailyMessages(mockNachYomi, hebrewOnlyText);
      expect(messages[0]).toContain('פסוק ראשון');
    });
  });

  describe('message splitting', () => {
    it('should split messages when content exceeds limit', () => {
      const longChapterText = {
        hebrewText: Array(100).fill('פסוק ארוך מאוד '.repeat(20)),
        englishText: Array(100).fill('This is a very long verse '.repeat(20)),
      };
      const messages = buildDailyMessages(mockNachYomi, longChapterText);
      expect(messages.length).toBeGreaterThan(1);
    });
  });

  describe('edge cases', () => {
    it('should handle empty hebrewText array', () => {
      const emptyText = { hebrewText: [], englishText: [] };
      const messages = buildDailyMessages(mockNachYomi, emptyText);
      expect(messages.length).toBe(1);
    });

    it('should handle null chapterText', () => {
      const messages = buildDailyMessages(mockNachYomi, null);
      expect(messages.length).toBe(1);
    });

    it('should handle undefined chapterText', () => {
      const messages = buildDailyMessages(mockNachYomi, undefined);
      expect(messages.length).toBe(1);
    });
  });
});

describe('buildDailyMessage', () => {
  it('should return single message string', () => {
    const nachYomi = { book: 'Joshua', chapter: 1, hebrewDate: '5 Shevat' };
    const result = buildDailyMessage(nachYomi);
    expect(typeof result).toBe('string');
  });

  it('should return first message when multiple exist', () => {
    const nachYomi = { book: 'Joshua', chapter: 1, hebrewDate: '5 Shevat' };
    const result = buildDailyMessage(nachYomi);
    expect(result).toContain('Joshua');
  });
});

describe('buildMediaCaption', () => {
  const mockNachYomi = { book: 'Joshua', chapter: 1 };

  it('should use video icon for video mediaType', () => {
    const caption = buildMediaCaption(mockNachYomi, 'video');
    expect(caption).toContain('🎬');
  });

  it('should use audio icon for audio mediaType', () => {
    const caption = buildMediaCaption(mockNachYomi, 'audio');
    expect(caption).toContain('🎧');
  });

  it('should include book and chapter', () => {
    const caption = buildMediaCaption(mockNachYomi, 'video');
    expect(caption).toContain('Joshua 1');
  });

  it('should include Hebrew book name', () => {
    const caption = buildMediaCaption(mockNachYomi, 'video');
    expect(caption).toContain('יהושע');
  });

  it('should include Rav attribution', () => {
    const caption = buildMediaCaption(mockNachYomi, 'video');
    expect(caption).toContain('Rav Yitzchok Breitowitz');
  });

  it('should default to video icon', () => {
    const caption = buildMediaCaption(mockNachYomi);
    expect(caption).toContain('🎬');
  });
});

describe('buildKeyboard', () => {
  it('should generate valid inline keyboard structure', () => {
    const keyboard = buildKeyboard('Joshua', 1);
    expect(keyboard).toHaveProperty('inline_keyboard');
    expect(Array.isArray(keyboard.inline_keyboard)).toBe(true);
  });

  it('should include Full Shiur button', () => {
    const keyboard = buildKeyboard('Joshua', 1);
    const buttons = keyboard.inline_keyboard.flat();
    const shiurButton = buttons.find(b => b.text.includes('Full Shiur'));
    expect(shiurButton).toBeTruthy();
    expect(shiurButton.url).toContain('kolhalashon');
  });

  it('should include Sefaria button', () => {
    const keyboard = buildKeyboard('Joshua', 1);
    const buttons = keyboard.inline_keyboard.flat();
    const sefariaButton = buttons.find(b => b.text.includes('Sefaria'));
    expect(sefariaButton).toBeTruthy();
    expect(sefariaButton.url).toContain('sefaria.org');
  });

  it('should include Share button with switch_inline_query', () => {
    const keyboard = buildKeyboard('Joshua', 1);
    const buttons = keyboard.inline_keyboard.flat();
    const shareButton = buttons.find(b => b.text.includes('Share'));
    expect(shareButton).toBeTruthy();
    expect(shareButton.switch_inline_query).toContain('Joshua 1');
  });
});

describe('buildMediaKeyboard', () => {
  it('should have two buttons', () => {
    const keyboard = buildMediaKeyboard('Joshua', 1);
    const buttons = keyboard.inline_keyboard.flat();
    expect(buttons.length).toBe(2);
  });

  it('should generate correct URLs', () => {
    const keyboard = buildMediaKeyboard('Joshua', 1);
    const buttons = keyboard.inline_keyboard.flat();
    expect(buttons[0].url).toContain('kolhalashon');
    expect(buttons[1].url).toContain('sefaria');
  });
});

describe('buildWelcomeMessage', () => {
  it('should include all command descriptions', () => {
    const message = buildWelcomeMessage();
    expect(message).toContain('/start');
    expect(message).toContain('/video');
    expect(message).toContain('/audio');
    expect(message).toContain('/text');
  });

  it('should mention 6 AM Israel time', () => {
    const message = buildWelcomeMessage();
    expect(message).toContain('6 AM Israel');
  });

  it('should be valid Markdown', () => {
    const message = buildWelcomeMessage();
    expect(message).toContain('*Nach Yomi*');
    expect(message).toContain('_New chapter');
  });

  it('should mention Rav Breitowitz', () => {
    const message = buildWelcomeMessage();
    expect(message).toContain('Rav Breitowitz');
  });
});

describe('Hebrew numerals (tested indirectly)', () => {
  it('should convert chapter 1 to א', () => {
    const nachYomi = { book: 'Joshua', chapter: 1, hebrewDate: 'test' };
    const messages = buildDailyMessages(nachYomi);
    expect(messages[0]).toContain('א');
  });

  it('should convert chapter 10 to י', () => {
    const nachYomi = { book: 'Joshua', chapter: 10, hebrewDate: 'test' };
    const messages = buildDailyMessages(nachYomi);
    expect(messages[0]).toContain('י');
  });

  it('should handle special case 15 as ט״ו', () => {
    const nachYomi = { book: 'Joshua', chapter: 15, hebrewDate: 'test' };
    const messages = buildDailyMessages(nachYomi);
    expect(messages[0]).toContain('ט״ו');
  });

  it('should handle special case 16 as ט״ז', () => {
    const nachYomi = { book: 'Joshua', chapter: 16, hebrewDate: 'test' };
    const messages = buildDailyMessages(nachYomi);
    expect(messages[0]).toContain('ט״ז');
  });
});

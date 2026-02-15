import { describe, it, expect } from 'vitest';
import {
  buildDayHeader,
  buildMediaCaption,
  buildKeyboard,
  buildMediaKeyboard,
  buildWelcomeMessage,
  toHebrewNumerals,
} from '../../src/messageBuilder.js';

describe('buildDayHeader', () => {
  const mockSchedule = {
    dayNumber: 1,
    cycleNumber: 1,
    chapters: [
      { book: 'Isaiah', chapter: 1, shiurId: 32996326 },
      { book: 'Isaiah', chapter: 2, shiurId: 32996737 },
    ],
  };

  it('should include the day number', () => {
    const header = buildDayHeader(mockSchedule);
    expect(header).toContain('Day 1');
  });

  it('should include both chapters', () => {
    const header = buildDayHeader(mockSchedule);
    expect(header).toContain('Isaiah 1');
    expect(header).toContain('Isaiah 2');
  });

  it('should include Hebrew book name', () => {
    const header = buildDayHeader(mockSchedule);
    expect(header).toContain('ישעיהו');
  });

  it('should include Hebrew numerals for chapters', () => {
    const header = buildDayHeader(mockSchedule);
    expect(header).toContain('א');
    expect(header).toContain('ב');
  });

  it('should handle cross-book chapters', () => {
    const crossBook = {
      dayNumber: 34,
      cycleNumber: 1,
      chapters: [
        { book: 'Jeremiah', chapter: 1, shiurId: 33355674 },
        { book: 'Jeremiah', chapter: 2, shiurId: 33355728 },
      ],
    };
    const header = buildDayHeader(crossBook);
    expect(header).toContain('Jeremiah 1');
    expect(header).toContain('Jeremiah 2');
    expect(header).toContain('ירמיהו');
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
  it('should include Nach Yomi title', () => {
    const message = buildWelcomeMessage();
    expect(message).toContain('*Nach Yomi*');
  });

  it('should mention two chapters', () => {
    const message = buildWelcomeMessage();
    expect(message).toMatch(/two chapters/i);
  });

  it('should mention audio shiur', () => {
    const message = buildWelcomeMessage();
    expect(message).toMatch(/audio/i);
  });

  it('should mention video', () => {
    const message = buildWelcomeMessage();
    expect(message).toMatch(/video/i);
  });

  it('should mention 6 AM Israel time', () => {
    const message = buildWelcomeMessage();
    expect(message).toContain('6 AM Israel');
  });

  it('should mention subscription', () => {
    const message = buildWelcomeMessage();
    expect(message).toMatch(/subscribed/i);
  });

  it('should mention Rav Breitowitz', () => {
    const message = buildWelcomeMessage();
    expect(message).toContain('Rav');
  });

  it('should not mention text or Hebrew/English', () => {
    const message = buildWelcomeMessage();
    expect(message).not.toMatch(/Hebrew \+ English/i);
  });
});

describe('toHebrewNumerals', () => {
  it('should convert 1 to א', () => {
    expect(toHebrewNumerals(1)).toBe('א');
  });

  it('should convert 10 to י', () => {
    expect(toHebrewNumerals(10)).toBe('י');
  });

  it('should handle special case 15 as ט״ו', () => {
    expect(toHebrewNumerals(15)).toBe('ט״ו');
  });

  it('should handle special case 16 as ט״ז', () => {
    expect(toHebrewNumerals(16)).toBe('ט״ז');
  });

  it('should convert 150 correctly', () => {
    const result = toHebrewNumerals(150);
    expect(result).toContain('ק');
    expect(result).toContain('נ');
  });
});

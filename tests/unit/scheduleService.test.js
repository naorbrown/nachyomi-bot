import { describe, it, expect } from 'vitest';
import {
  getTodaysChapters,
  getChaptersForDate,
  NACH_ORDER,
  ALL_CHAPTERS,
  TOTAL_CHAPTERS,
  CHAPTERS_PER_DAY,
  DAYS_PER_CYCLE,
  START_DATE,
} from '../../src/scheduleService.js';
import { getShiurId } from '../../src/data/shiurMapping.js';

describe('Constants', () => {
  it('should have 742 total chapters', () => {
    expect(TOTAL_CHAPTERS).toBe(742);
  });

  it('should have 2 chapters per day', () => {
    expect(CHAPTERS_PER_DAY).toBe(2);
  });

  it('should have 371 days per cycle', () => {
    expect(DAYS_PER_CYCLE).toBe(371);
  });

  it('should start on 2026-02-15', () => {
    expect(START_DATE).toBe('2026-02-15');
  });

  it('should start with Isaiah in NACH_ORDER', () => {
    expect(NACH_ORDER[0].name).toBe('Isaiah');
  });

  it('should end with II Kings in NACH_ORDER', () => {
    expect(NACH_ORDER[NACH_ORDER.length - 1].name).toBe('II Kings');
  });
});

describe('ALL_CHAPTERS', () => {
  it('should have 742 entries', () => {
    expect(ALL_CHAPTERS.length).toBe(742);
  });

  it('should start with Isaiah 1', () => {
    expect(ALL_CHAPTERS[0]).toEqual({ book: 'Isaiah', chapter: 1 });
  });

  it('should end with II Kings 25', () => {
    expect(ALL_CHAPTERS[741]).toEqual({ book: 'II Kings', chapter: 25 });
  });

  it('should have no duplicate entries', () => {
    const keys = ALL_CHAPTERS.map(c => `${c.book}:${c.chapter}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('should have a valid shiurId for every chapter', () => {
    for (const { book, chapter } of ALL_CHAPTERS) {
      const id = getShiurId(book, chapter);
      expect(id, `Missing shiurId for ${book} ${chapter}`).toBeTruthy();
      expect(typeof id).toBe('number');
    }
  });

  it('should transition correctly from Isaiah 66 to Jeremiah 1', () => {
    // Isaiah has 66 chapters, so index 65 = Isaiah 66, index 66 = Jeremiah 1
    expect(ALL_CHAPTERS[65]).toEqual({ book: 'Isaiah', chapter: 66 });
    expect(ALL_CHAPTERS[66]).toEqual({ book: 'Jeremiah', chapter: 1 });
  });
});

describe('getTodaysChapters', () => {
  it('should return Isaiah 1 + Isaiah 2 on Day 1 (2026-02-15)', () => {
    const result = getTodaysChapters('2026-02-15');
    expect(result.dayNumber).toBe(1);
    expect(result.cycleNumber).toBe(1);
    expect(result.chapters).toHaveLength(2);
    expect(result.chapters[0].book).toBe('Isaiah');
    expect(result.chapters[0].chapter).toBe(1);
    expect(result.chapters[1].book).toBe('Isaiah');
    expect(result.chapters[1].chapter).toBe(2);
  });

  it('should return Isaiah 3 + Isaiah 4 on Day 2 (2026-02-16)', () => {
    const result = getTodaysChapters('2026-02-16');
    expect(result.dayNumber).toBe(2);
    expect(result.chapters[0]).toMatchObject({ book: 'Isaiah', chapter: 3 });
    expect(result.chapters[1]).toMatchObject({ book: 'Isaiah', chapter: 4 });
  });

  it('should return Isaiah 65 + Isaiah 66 on Day 33 (2026-03-19)', () => {
    const result = getTodaysChapters('2026-03-19');
    expect(result.dayNumber).toBe(33);
    expect(result.chapters[0]).toMatchObject({ book: 'Isaiah', chapter: 65 });
    expect(result.chapters[1]).toMatchObject({ book: 'Isaiah', chapter: 66 });
  });

  it('should cross from Isaiah to Jeremiah on Day 34 (2026-03-20)', () => {
    const result = getTodaysChapters('2026-03-20');
    expect(result.dayNumber).toBe(34);
    expect(result.chapters[0]).toMatchObject({ book: 'Jeremiah', chapter: 1 });
    expect(result.chapters[1]).toMatchObject({ book: 'Jeremiah', chapter: 2 });
  });

  it('should return II Kings 24 + II Kings 25 on last day of cycle (Day 371)', () => {
    // Day 371 = 370 days after start = 2026-02-15 + 370 = 2027-02-20
    const result = getTodaysChapters('2027-02-20');
    expect(result.dayNumber).toBe(371);
    expect(result.cycleNumber).toBe(1);
    expect(result.chapters[0]).toMatchObject({ book: 'II Kings', chapter: 24 });
    expect(result.chapters[1]).toMatchObject({ book: 'II Kings', chapter: 25 });
  });

  it('should wrap to cycle 2 on Day 372 (2027-02-21)', () => {
    const result = getTodaysChapters('2027-02-21');
    expect(result.dayNumber).toBe(372);
    expect(result.cycleNumber).toBe(2);
    expect(result.chapters[0]).toMatchObject({ book: 'Isaiah', chapter: 1 });
    expect(result.chapters[1]).toMatchObject({ book: 'Isaiah', chapter: 2 });
  });

  it('should throw for dates before the start date', () => {
    expect(() => getTodaysChapters('2026-02-14')).toThrow('Schedule has not started yet');
  });

  it('should include shiurId for each chapter', () => {
    const result = getTodaysChapters('2026-02-15');
    for (const ch of result.chapters) {
      expect(ch.shiurId).toBeTruthy();
      expect(typeof ch.shiurId).toBe('number');
    }
  });
});

describe('getChaptersForDate', () => {
  it('should be an alias for getTodaysChapters', () => {
    const a = getTodaysChapters('2026-02-15');
    const b = getChaptersForDate('2026-02-15');
    expect(a).toEqual(b);
  });
});

describe('NACH_ORDER integrity', () => {
  it('should sum chapter counts to 742', () => {
    const total = NACH_ORDER.reduce((sum, book) => sum + book.chapters, 0);
    expect(total).toBe(742);
  });

  it('should have even total chapters (divisible by CHAPTERS_PER_DAY)', () => {
    const total = NACH_ORDER.reduce((sum, book) => sum + book.chapters, 0);
    expect(total % CHAPTERS_PER_DAY).toBe(0);
  });

  it('should contain all 34 Nach books', () => {
    expect(NACH_ORDER.length).toBe(34);
  });
});

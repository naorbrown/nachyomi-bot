import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isIsrael6am, getIsraelHour } from '../../src/utils/israelTime.js';

describe('isIsrael6am', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return true at 6am Israel time (winter - UTC+2)', () => {
    // 4:00 UTC = 6:00 Israel (winter time, UTC+2)
    vi.setSystemTime(new Date('2025-01-15T04:00:00Z'));
    expect(isIsrael6am()).toBe(true);
  });

  it('should return true at 6am Israel time (summer - UTC+3)', () => {
    // 3:00 UTC = 6:00 Israel (summer time, UTC+3)
    vi.setSystemTime(new Date('2025-07-15T03:00:00Z'));
    expect(isIsrael6am()).toBe(true);
  });

  it('should return false at 5am Israel time', () => {
    // 3:00 UTC = 5:00 Israel (winter time)
    vi.setSystemTime(new Date('2025-01-15T03:00:00Z'));
    expect(isIsrael6am()).toBe(false);
  });

  it('should return false at 7am Israel time', () => {
    // 5:00 UTC = 7:00 Israel (winter time)
    vi.setSystemTime(new Date('2025-01-15T05:00:00Z'));
    expect(isIsrael6am()).toBe(false);
  });

  it('should return false at noon Israel time', () => {
    // 10:00 UTC = 12:00 Israel (winter time)
    vi.setSystemTime(new Date('2025-01-15T10:00:00Z'));
    expect(isIsrael6am()).toBe(false);
  });

  it('should return false at midnight Israel time', () => {
    // 22:00 UTC = 00:00 Israel (winter time)
    vi.setSystemTime(new Date('2025-01-15T22:00:00Z'));
    expect(isIsrael6am()).toBe(false);
  });

  it('should return a boolean', () => {
    const result = isIsrael6am();
    expect(typeof result).toBe('boolean');
  });
});

describe('getIsraelHour', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return 6 at 6am Israel time', () => {
    vi.setSystemTime(new Date('2025-01-15T04:00:00Z'));
    expect(getIsraelHour()).toBe(6);
  });

  it('should return 12 at noon Israel time', () => {
    vi.setSystemTime(new Date('2025-01-15T10:00:00Z'));
    expect(getIsraelHour()).toBe(12);
  });

  it('should return 0 at midnight Israel time', () => {
    vi.setSystemTime(new Date('2025-01-15T22:00:00Z'));
    expect(getIsraelHour()).toBe(0);
  });

  it('should return a number', () => {
    const result = getIsraelHour();
    expect(typeof result).toBe('number');
  });
});

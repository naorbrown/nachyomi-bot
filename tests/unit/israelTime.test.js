import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isIsrael3am, getIsraelHour } from '../../src/utils/israelTime.js';

describe('isIsrael3am', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return true at 3am Israel time (winter - UTC+2)', () => {
    // 1:00 UTC = 3:00 Israel (winter time, UTC+2)
    vi.setSystemTime(new Date('2025-01-15T01:00:00Z'));
    expect(isIsrael3am()).toBe(true);
  });

  it('should return true at 3am Israel time (summer - UTC+3)', () => {
    // 0:00 UTC = 3:00 Israel (summer time, UTC+3)
    vi.setSystemTime(new Date('2025-07-15T00:00:00Z'));
    expect(isIsrael3am()).toBe(true);
  });

  it('should return false at 2am Israel time', () => {
    // 0:00 UTC = 2:00 Israel (winter time)
    vi.setSystemTime(new Date('2025-01-15T00:00:00Z'));
    expect(isIsrael3am()).toBe(false);
  });

  it('should return false at 4am Israel time', () => {
    // 2:00 UTC = 4:00 Israel (winter time)
    vi.setSystemTime(new Date('2025-01-15T02:00:00Z'));
    expect(isIsrael3am()).toBe(false);
  });

  it('should return false at noon Israel time', () => {
    // 10:00 UTC = 12:00 Israel (winter time)
    vi.setSystemTime(new Date('2025-01-15T10:00:00Z'));
    expect(isIsrael3am()).toBe(false);
  });

  it('should return false at midnight Israel time', () => {
    // 22:00 UTC = 00:00 Israel (winter time)
    vi.setSystemTime(new Date('2025-01-15T22:00:00Z'));
    expect(isIsrael3am()).toBe(false);
  });

  it('should return a boolean', () => {
    const result = isIsrael3am();
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

  it('should return 3 at 3am Israel time', () => {
    vi.setSystemTime(new Date('2025-01-15T01:00:00Z'));
    expect(getIsraelHour()).toBe(3);
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

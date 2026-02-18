import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isIsraelBroadcastWindow, getIsraelHour } from '../../src/utils/israelTime.js';

describe('isIsraelBroadcastWindow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return true at midnight Israel time (start of window)', () => {
    // 22:00 UTC = 0:00 Israel (winter time, UTC+2)
    vi.setSystemTime(new Date('2025-01-15T22:00:00Z'));
    expect(isIsraelBroadcastWindow()).toBe(true);
  });

  it('should return true at 3am Israel time', () => {
    // 1:00 UTC = 3:00 Israel (winter time, UTC+2)
    vi.setSystemTime(new Date('2025-01-15T01:00:00Z'));
    expect(isIsraelBroadcastWindow()).toBe(true);
  });

  it('should return true at 6am Israel time (end of window)', () => {
    // 4:00 UTC = 6:00 Israel (winter time, UTC+2)
    vi.setSystemTime(new Date('2025-01-15T04:00:00Z'));
    expect(isIsraelBroadcastWindow()).toBe(true);
  });

  it('should return true at 3am Israel time (summer - UTC+3)', () => {
    // 0:00 UTC = 3:00 Israel (summer time, UTC+3)
    vi.setSystemTime(new Date('2025-07-15T00:00:00Z'));
    expect(isIsraelBroadcastWindow()).toBe(true);
  });

  it('should return false at 7am Israel time (just outside window)', () => {
    // 5:00 UTC = 7:00 Israel (winter time, UTC+2)
    vi.setSystemTime(new Date('2025-01-15T05:00:00Z'));
    expect(isIsraelBroadcastWindow()).toBe(false);
  });

  it('should return false at noon Israel time', () => {
    // 10:00 UTC = 12:00 Israel (winter time)
    vi.setSystemTime(new Date('2025-01-15T10:00:00Z'));
    expect(isIsraelBroadcastWindow()).toBe(false);
  });

  it('should return false at 11pm Israel time', () => {
    // 21:00 UTC = 23:00 Israel (winter time)
    vi.setSystemTime(new Date('2025-01-15T21:00:00Z'));
    expect(isIsraelBroadcastWindow()).toBe(false);
  });

  it('should return a boolean', () => {
    const result = isIsraelBroadcastWindow();
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

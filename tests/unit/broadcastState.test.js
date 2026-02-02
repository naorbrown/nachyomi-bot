import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getIsraelDate,
  wasBroadcastSentToday,
  markBroadcastSent,
  loadBroadcastState,
} from '../../src/utils/broadcastState.js';
import { readFile, writeFile, mkdir } from 'fs/promises';

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
}));

describe('broadcastState', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getIsraelDate', () => {
    it('should return date in YYYY-MM-DD format', () => {
      vi.setSystemTime(new Date('2025-01-15T04:00:00Z'));
      const date = getIsraelDate();
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return Israel date at 4am UTC winter time', () => {
      // 4:00 UTC = 6:00 Israel (winter time, UTC+2) - still Jan 15
      vi.setSystemTime(new Date('2025-01-15T04:00:00Z'));
      expect(getIsraelDate()).toBe('2025-01-15');
    });

    it('should return Israel date at 3am UTC summer time', () => {
      // 3:00 UTC = 6:00 Israel (summer time, UTC+3) - still Jul 15
      vi.setSystemTime(new Date('2025-07-15T03:00:00Z'));
      expect(getIsraelDate()).toBe('2025-07-15');
    });

    it('should handle date boundary at midnight Israel', () => {
      // 22:00 UTC = 00:00 Israel (winter, next day)
      vi.setSystemTime(new Date('2025-01-15T22:00:00Z'));
      expect(getIsraelDate()).toBe('2025-01-16');
    });
  });

  describe('loadBroadcastState', () => {
    it('should return state from file', async () => {
      readFile.mockResolvedValue(JSON.stringify({ lastBroadcastDate: '2025-01-15' }));
      const state = await loadBroadcastState();
      expect(state.lastBroadcastDate).toBe('2025-01-15');
    });

    it('should return empty state if file does not exist', async () => {
      readFile.mockRejectedValue(new Error('ENOENT'));
      const state = await loadBroadcastState();
      expect(state.lastBroadcastDate).toBeNull();
    });
  });

  describe('wasBroadcastSentToday', () => {
    it('should return true if lastBroadcastDate matches today', async () => {
      vi.setSystemTime(new Date('2025-01-15T04:00:00Z'));
      readFile.mockResolvedValue(JSON.stringify({ lastBroadcastDate: '2025-01-15' }));

      const result = await wasBroadcastSentToday();
      expect(result).toBe(true);
    });

    it('should return false if lastBroadcastDate is yesterday', async () => {
      vi.setSystemTime(new Date('2025-01-15T04:00:00Z'));
      readFile.mockResolvedValue(JSON.stringify({ lastBroadcastDate: '2025-01-14' }));

      const result = await wasBroadcastSentToday();
      expect(result).toBe(false);
    });

    it('should return false if no previous broadcast', async () => {
      vi.setSystemTime(new Date('2025-01-15T04:00:00Z'));
      readFile.mockRejectedValue(new Error('ENOENT'));

      const result = await wasBroadcastSentToday();
      expect(result).toBe(false);
    });

    it('should handle Israel timezone date boundary correctly', async () => {
      // At 22:00 UTC on Jan 15, it's already Jan 16 in Israel
      vi.setSystemTime(new Date('2025-01-15T22:00:00Z'));
      readFile.mockResolvedValue(JSON.stringify({ lastBroadcastDate: '2025-01-15' }));

      const result = await wasBroadcastSentToday();
      // It's Jan 16 in Israel, so Jan 15 broadcast doesn't count as "today"
      expect(result).toBe(false);
    });
  });

  describe('markBroadcastSent', () => {
    it('should write state file with current Israel date', async () => {
      vi.setSystemTime(new Date('2025-01-15T04:00:00Z'));
      mkdir.mockResolvedValue();
      writeFile.mockResolvedValue();

      await markBroadcastSent();

      expect(mkdir).toHaveBeenCalled();
      expect(writeFile).toHaveBeenCalledWith(
        '.github/state/broadcast-state.json',
        expect.stringContaining('"lastBroadcastDate": "2025-01-15"')
      );
    });

    it('should include updatedAt timestamp', async () => {
      vi.setSystemTime(new Date('2025-01-15T04:00:00Z'));
      mkdir.mockResolvedValue();
      writeFile.mockResolvedValue();

      await markBroadcastSent();

      expect(writeFile).toHaveBeenCalledWith(
        '.github/state/broadcast-state.json',
        expect.stringContaining('"updatedAt"')
      );
    });
  });

  describe('duplicate prevention scenario', () => {
    it('should prevent second broadcast on same Israel day', async () => {
      // First run at 3am UTC (summer) = 6am Israel
      vi.setSystemTime(new Date('2025-07-15T03:00:00Z'));
      readFile.mockRejectedValue(new Error('ENOENT'));

      // First broadcast - not sent yet
      expect(await wasBroadcastSentToday()).toBe(false);

      // Mark as sent
      mkdir.mockResolvedValue();
      writeFile.mockResolvedValue();
      await markBroadcastSent();

      // Second run at 4am UTC = 7am Israel (same day)
      vi.setSystemTime(new Date('2025-07-15T04:00:00Z'));
      readFile.mockResolvedValue(JSON.stringify({ lastBroadcastDate: '2025-07-15' }));

      // Should be blocked
      expect(await wasBroadcastSentToday()).toBe(true);
    });

    it('should allow broadcast on next Israel day', async () => {
      // Yesterday's broadcast
      vi.setSystemTime(new Date('2025-07-16T03:00:00Z'));
      readFile.mockResolvedValue(JSON.stringify({ lastBroadcastDate: '2025-07-15' }));

      // Should allow today's broadcast
      expect(await wasBroadcastSentToday()).toBe(false);
    });
  });
});

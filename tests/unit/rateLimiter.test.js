import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRateLimiter } from '../../src/utils/rateLimiter.js';

describe('createRateLimiter', () => {
  let limiter;

  beforeEach(() => {
    limiter = createRateLimiter({ limit: 5, windowMs: 60000 });
  });

  describe('basic functionality', () => {
    it('should allow first request', () => {
      expect(limiter.isRateLimited(123)).toBe(false);
    });

    it('should allow up to limit requests within window', () => {
      const chatId = 123;
      for (let i = 0; i < 5; i++) {
        expect(limiter.isRateLimited(chatId)).toBe(false);
      }
    });

    it('should block request after limit exceeded', () => {
      const chatId = 123;
      // Make 5 requests (allowed)
      for (let i = 0; i < 5; i++) {
        limiter.isRateLimited(chatId);
      }
      // 6th request should be blocked
      expect(limiter.isRateLimited(chatId)).toBe(true);
    });

    it('should track limits per chatId independently', () => {
      // User 1 makes 5 requests
      for (let i = 0; i < 5; i++) {
        limiter.isRateLimited(111);
      }
      // User 1 is now limited
      expect(limiter.isRateLimited(111)).toBe(true);
      // User 2 should not be limited
      expect(limiter.isRateLimited(222)).toBe(false);
    });
  });

  describe('time window', () => {
    it('should allow requests after window expires', () => {
      vi.useFakeTimers();
      const chatId = 123;

      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        limiter.isRateLimited(chatId);
      }
      // Now limited
      expect(limiter.isRateLimited(chatId)).toBe(true);

      // Advance time past window
      vi.advanceTimersByTime(61000);

      // Should be allowed again
      expect(limiter.isRateLimited(chatId)).toBe(false);

      vi.useRealTimers();
    });
  });

  describe('reset', () => {
    it('should clear all history on reset', () => {
      const chatId = 123;
      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        limiter.isRateLimited(chatId);
      }
      // Now limited
      expect(limiter.isRateLimited(chatId)).toBe(true);

      // Reset
      limiter.reset();

      // Should be allowed again
      expect(limiter.isRateLimited(chatId)).toBe(false);
    });
  });

  describe('custom options', () => {
    it('should respect custom limit', () => {
      const customLimiter = createRateLimiter({ limit: 2, windowMs: 60000 });
      const chatId = 123;

      expect(customLimiter.isRateLimited(chatId)).toBe(false);
      expect(customLimiter.isRateLimited(chatId)).toBe(false);
      expect(customLimiter.isRateLimited(chatId)).toBe(true);
    });

    it('should use default values when no options provided', () => {
      const defaultLimiter = createRateLimiter();
      const chatId = 123;

      // Default limit is 5
      for (let i = 0; i < 5; i++) {
        expect(defaultLimiter.isRateLimited(chatId)).toBe(false);
      }
      expect(defaultLimiter.isRateLimited(chatId)).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('should cleanup old entries when maxEntries exceeded', () => {
      vi.useFakeTimers();
      const smallLimiter = createRateLimiter({ limit: 5, windowMs: 60000, maxEntries: 5 });

      // Create entries for 5 users
      for (let i = 1; i <= 5; i++) {
        smallLimiter.isRateLimited(i);
      }
      expect(smallLimiter.size()).toBe(5);

      // Advance time so all entries are old
      vi.advanceTimersByTime(61000);

      // Add one more user to trigger cleanup
      smallLimiter.isRateLimited(6);

      // Old entries should be cleaned up
      expect(smallLimiter.size()).toBeLessThanOrEqual(2);

      vi.useRealTimers();
    });
  });
});

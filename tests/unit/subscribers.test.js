import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  loadSubscribers,
  addSubscriber,
  removeSubscriber,
  isSubscribed,
} from '../../src/utils/subscribers.js';
import { readFile, writeFile, mkdir } from 'fs/promises';

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
}));

describe('subscribers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mkdir.mockResolvedValue();
    writeFile.mockResolvedValue();
  });

  describe('loadSubscribers', () => {
    it('should return empty array when file does not exist', async () => {
      readFile.mockRejectedValue(new Error('ENOENT'));
      const result = await loadSubscribers();
      expect(result).toEqual([]);
    });

    it('should return empty array when JSON has no subscribers key', async () => {
      readFile.mockResolvedValue(JSON.stringify({ updatedAt: '2025-01-01' }));
      const result = await loadSubscribers();
      expect(result).toEqual([]);
    });

    it('should return subscriber array from valid JSON', async () => {
      readFile.mockResolvedValue(JSON.stringify({ subscribers: [111, 222, 333] }));
      const result = await loadSubscribers();
      expect(result).toEqual([111, 222, 333]);
    });
  });

  describe('addSubscriber', () => {
    it('should add new subscriber and return true', async () => {
      readFile.mockResolvedValue(JSON.stringify({ subscribers: [111] }));
      const result = await addSubscriber(222);
      expect(result).toBe(true);
    });

    it('should return false for duplicate subscriber', async () => {
      readFile.mockResolvedValue(JSON.stringify({ subscribers: [111, 222] }));
      const result = await addSubscriber(222);
      expect(result).toBe(false);
    });

    it('should call writeFile with updated subscriber list', async () => {
      readFile.mockResolvedValue(JSON.stringify({ subscribers: [111] }));
      await addSubscriber(222);

      expect(mkdir).toHaveBeenCalled();
      expect(writeFile).toHaveBeenCalledWith('.github/state/subscribers.json', expect.any(String));

      const written = JSON.parse(writeFile.mock.calls[0][1]);
      expect(written.subscribers).toEqual([111, 222]);
      expect(written.updatedAt).toBeDefined();
    });

    it('should not call writeFile for duplicate subscriber', async () => {
      readFile.mockResolvedValue(JSON.stringify({ subscribers: [111] }));
      await addSubscriber(111);
      expect(writeFile).not.toHaveBeenCalled();
    });
  });

  describe('removeSubscriber', () => {
    it('should remove existing subscriber and return true', async () => {
      readFile.mockResolvedValue(JSON.stringify({ subscribers: [111, 222] }));
      const result = await removeSubscriber(222);
      expect(result).toBe(true);

      const written = JSON.parse(writeFile.mock.calls[0][1]);
      expect(written.subscribers).toEqual([111]);
    });

    it('should return false when subscriber not found', async () => {
      readFile.mockResolvedValue(JSON.stringify({ subscribers: [111] }));
      const result = await removeSubscriber(999);
      expect(result).toBe(false);
      expect(writeFile).not.toHaveBeenCalled();
    });
  });

  describe('isSubscribed', () => {
    it('should return true for existing subscriber', async () => {
      readFile.mockResolvedValue(JSON.stringify({ subscribers: [111, 222] }));
      const result = await isSubscribed(222);
      expect(result).toBe(true);
    });

    it('should return false for non-subscriber', async () => {
      readFile.mockResolvedValue(JSON.stringify({ subscribers: [111] }));
      const result = await isSubscribed(999);
      expect(result).toBe(false);
    });
  });
});

import { describe, it, expect } from 'vitest';
import { readFile } from 'fs/promises';
import { resolve } from 'path';

describe('Broadcast Script', () => {
  describe('No Retry (Prevents Duplicates)', () => {
    it('should not have a retry loop that causes duplicates', async () => {
      const broadcastPath = resolve('./scripts/broadcast.js');
      const content = await readFile(broadcastPath, 'utf-8');

      // Should NOT contain retry loop patterns that cause duplicates
      expect(content).not.toMatch(/for\s*\(\s*let\s+attempt/);
      expect(content).not.toMatch(/MAX_RETRIES\s*=/);
      expect(content).not.toMatch(/RETRY_DELAYS\s*=/);
    });

    it('should have a comment explaining why no retry loop', async () => {
      const broadcastPath = resolve('./scripts/broadcast.js');
      const content = await readFile(broadcastPath, 'utf-8');

      // Should have a comment explaining the design decision
      expect(content).toMatch(/NO RETRY|no retry|Prevents duplicates/i);
    });
  });

  describe('Schedule Service', () => {
    it('should use scheduleService instead of hebcalService', async () => {
      const broadcastPath = resolve('./scripts/broadcast.js');
      const content = await readFile(broadcastPath, 'utf-8');

      expect(content).toMatch(/scheduleService/);
      expect(content).not.toMatch(/hebcalService/);
    });

    it('should not use sefariaService', async () => {
      const broadcastPath = resolve('./scripts/broadcast.js');
      const content = await readFile(broadcastPath, 'utf-8');

      expect(content).not.toMatch(/sefariaService/);
    });

    it('should call getTodaysChapters', async () => {
      const broadcastPath = resolve('./scripts/broadcast.js');
      const content = await readFile(broadcastPath, 'utf-8');

      expect(content).toMatch(/getTodaysChapters/);
    });
  });

  describe('Dual Broadcast', () => {
    it('should broadcast to channel', async () => {
      const broadcastPath = resolve('./scripts/broadcast.js');
      const content = await readFile(broadcastPath, 'utf-8');

      expect(content).toMatch(/CHANNEL_ID/);
      expect(content).toMatch(/Channel.*broadcast|Send to channel/i);
    });

    it('should broadcast to subscribers', async () => {
      const broadcastPath = resolve('./scripts/broadcast.js');
      const content = await readFile(broadcastPath, 'utf-8');

      expect(content).toMatch(/loadSubscribers/);
      expect(content).toMatch(/subscribers/i);
    });
  });

  describe('Content', () => {
    it('should send audio', async () => {
      const broadcastPath = resolve('./scripts/broadcast.js');
      const content = await readFile(broadcastPath, 'utf-8');

      expect(content).toMatch(/sendAudio/);
    });

    it('should send video as link, not embedded', async () => {
      const broadcastPath = resolve('./scripts/broadcast.js');
      const content = await readFile(broadcastPath, 'utf-8');

      expect(content).toMatch(/sendVideoLink/);
      expect(content).not.toMatch(/sendVideoShiur/);
      expect(content).not.toMatch(/videoService/);
    });

    it('should not send Sefaria text', async () => {
      const broadcastPath = resolve('./scripts/broadcast.js');
      const content = await readFile(broadcastPath, 'utf-8');

      expect(content).not.toMatch(/sendText\s*\(/);
      expect(content).not.toMatch(/getChapterText/);
      expect(content).not.toMatch(/buildDailyMessages/);
    });
  });

  describe('Required Environment Variables', () => {
    it('should check for TELEGRAM_BOT_TOKEN', async () => {
      const broadcastPath = resolve('./scripts/broadcast.js');
      const content = await readFile(broadcastPath, 'utf-8');

      expect(content).toMatch(/TELEGRAM_BOT_TOKEN/);
      expect(content).toMatch(/process\.exit\(1\)/);
    });

    it('should check for TELEGRAM_CHANNEL_ID', async () => {
      const broadcastPath = resolve('./scripts/broadcast.js');
      const content = await readFile(broadcastPath, 'utf-8');

      expect(content).toMatch(/TELEGRAM_CHANNEL_ID/);
    });

    it('should support TELEGRAM_CHAT_ID as fallback for ADMIN_CHAT_ID', async () => {
      const broadcastPath = resolve('./scripts/broadcast.js');
      const content = await readFile(broadcastPath, 'utf-8');

      expect(content).toMatch(/ADMIN_CHAT_ID.*\|\|.*TELEGRAM_CHAT_ID/);
    });

    it('should support FORCE_BROADCAST for manual triggers', async () => {
      const broadcastPath = resolve('./scripts/broadcast.js');
      const content = await readFile(broadcastPath, 'utf-8');

      expect(content).toMatch(/FORCE_BROADCAST/);
    });
  });

  describe('Diagnostic Checks', () => {
    it('should warn if ADMIN_CHAT_ID equals CHANNEL_ID', async () => {
      const broadcastPath = resolve('./scripts/broadcast.js');
      const content = await readFile(broadcastPath, 'utf-8');

      expect(content).toMatch(/ADMIN_CHAT_ID.*===.*CHANNEL_ID/);
    });

    it('should warn if ADMIN_CHAT_ID is a group/channel ID', async () => {
      const broadcastPath = resolve('./scripts/broadcast.js');
      const content = await readFile(broadcastPath, 'utf-8');

      expect(content).toMatch(/startsWith.*'-'/);
    });
  });

  describe('Israel Time Check', () => {
    it('should check Israel time broadcast window before broadcasting', async () => {
      const broadcastPath = resolve('./scripts/broadcast.js');
      const content = await readFile(broadcastPath, 'utf-8');

      expect(content).toMatch(/isIsraelBroadcastWindow/);
      expect(content).toMatch(/getIsraelHour/);
    });

    it('should skip broadcast if outside broadcast window (unless forced)', async () => {
      const broadcastPath = resolve('./scripts/broadcast.js');
      const content = await readFile(broadcastPath, 'utf-8');

      expect(content).toMatch(/!FORCE_BROADCAST\s*&&\s*!isIsraelBroadcastWindow/);
    });
  });
});

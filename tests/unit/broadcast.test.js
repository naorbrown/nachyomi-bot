import { describe, it, expect } from 'vitest';
import { readFile } from 'fs/promises';
import { resolve } from 'path';

describe('Broadcast Script', () => {
  describe('No Retry Loop (Prevents Duplicate Messages)', () => {
    it('should not have a retry loop that causes duplicate messages', async () => {
      const broadcastPath = resolve('./scripts/broadcast.js');
      const content = await readFile(broadcastPath, 'utf-8');

      // Should NOT contain retry loop patterns that cause duplicates
      // The retry loop wraps all send operations, so if text fails after
      // audio/video link succeed, the retry resends everything causing duplicates
      expect(content).not.toMatch(/for\s*\(\s*let\s+attempt/);
      expect(content).not.toMatch(/MAX_RETRIES\s*=/);
      expect(content).not.toMatch(/RETRY_DELAYS\s*=/);
    });

    it('should have a comment explaining why no retry loop', async () => {
      const broadcastPath = resolve('./scripts/broadcast.js');
      const content = await readFile(broadcastPath, 'utf-8');

      // Should have a comment explaining the design decision
      expect(content).toMatch(/NO RETRY LOOP|no retry|don't retry/i);
    });
  });

  describe('Individual Error Handling', () => {
    it('should have try-catch in sendVideoLink for graceful fallback', async () => {
      const broadcastPath = resolve('./scripts/broadcast.js');
      const content = await readFile(broadcastPath, 'utf-8');

      // Extract sendVideoLink function
      const videoFnMatch = content.match(/async function sendVideoLink[\s\S]*?^}/m);
      expect(videoFnMatch).toBeTruthy();

      const videoFn = videoFnMatch[0];
      expect(videoFn).toMatch(/try\s*\{/);
      expect(videoFn).toMatch(/catch\s*\(/);
      expect(videoFn).toMatch(/Video.*failed|failed.*video/i);
    });

    it('should have try-catch in sendAudioShiur for graceful fallback', async () => {
      const broadcastPath = resolve('./scripts/broadcast.js');
      const content = await readFile(broadcastPath, 'utf-8');

      // Extract sendAudioShiur function
      const audioFnMatch = content.match(/async function sendAudioShiur[\s\S]*?^async function/m);
      expect(audioFnMatch).toBeTruthy();

      const audioFn = audioFnMatch[0];
      expect(audioFn).toMatch(/try\s*\{/);
      expect(audioFn).toMatch(/catch\s*\(/);
      expect(audioFn).toMatch(/Audio.*failed|failed.*audio/i);
    });
  });

  describe('Content Order', () => {
    it('should send audio first as primary content', async () => {
      const broadcastPath = resolve('./scripts/broadcast.js');
      const content = await readFile(broadcastPath, 'utf-8');

      // Audio should be sent before video link
      const audioIndex = content.indexOf('Sending audio (primary)');
      const videoIndex = content.indexOf('Sending video link');

      expect(audioIndex).toBeGreaterThan(-1);
      expect(videoIndex).toBeGreaterThan(-1);
      expect(audioIndex).toBeLessThan(videoIndex);
    });

    it('should send video as link, not embedded', async () => {
      const broadcastPath = resolve('./scripts/broadcast.js');
      const content = await readFile(broadcastPath, 'utf-8');

      // Should use sendVideoLink, not sendVideoShiur
      expect(content).toMatch(/sendVideoLink/);
      expect(content).not.toMatch(/sendVideoShiur/);

      // Should not import video service
      expect(content).not.toMatch(/videoService/);
      expect(content).not.toMatch(/prepareVideoForTelegram/);
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

    it('should support FORCE_BROADCAST for manual triggers', async () => {
      const broadcastPath = resolve('./scripts/broadcast.js');
      const content = await readFile(broadcastPath, 'utf-8');

      expect(content).toMatch(/FORCE_BROADCAST/);
    });
  });

  describe('Israel Time Check', () => {
    it('should check Israel time before broadcasting', async () => {
      const broadcastPath = resolve('./scripts/broadcast.js');
      const content = await readFile(broadcastPath, 'utf-8');

      expect(content).toMatch(/isIsrael6am/);
      expect(content).toMatch(/getIsraelHour/);
    });

    it('should skip broadcast if not 6am Israel time (unless forced)', async () => {
      const broadcastPath = resolve('./scripts/broadcast.js');
      const content = await readFile(broadcastPath, 'utf-8');

      expect(content).toMatch(/!FORCE_BROADCAST\s*&&\s*!isIsrael6am/);
    });
  });
});

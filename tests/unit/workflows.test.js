import { describe, it, expect } from 'vitest';
import { readFile } from 'fs/promises';
import { resolve } from 'path';

describe('GitHub Workflows', () => {
  describe('Poll Commands Workflow', () => {
    it('should have write permissions for state updates', async () => {
      const workflowPath = resolve('./.github/workflows/poll-commands.yml');
      const content = await readFile(workflowPath, 'utf-8');

      // Must have permissions block with contents: write
      expect(content).toMatch(/permissions:/);
      expect(content).toMatch(/contents:\s*write/);
    });

    it('should run every 5 minutes', async () => {
      const workflowPath = resolve('./.github/workflows/poll-commands.yml');
      const content = await readFile(workflowPath, 'utf-8');

      expect(content).toMatch(/cron:\s*'\*\/5 \* \* \* \*'/);
    });

    it('should support manual dispatch', async () => {
      const workflowPath = resolve('./.github/workflows/poll-commands.yml');
      const content = await readFile(workflowPath, 'utf-8');

      expect(content).toMatch(/workflow_dispatch/);
    });

    it('should install FFmpeg', async () => {
      const workflowPath = resolve('./.github/workflows/poll-commands.yml');
      const content = await readFile(workflowPath, 'utf-8');

      expect(content).toMatch(/install.*ffmpeg/i);
    });

    it('should commit state changes with skip ci', async () => {
      const workflowPath = resolve('./.github/workflows/poll-commands.yml');
      const content = await readFile(workflowPath, 'utf-8');

      expect(content).toMatch(/\[skip ci\]/);
    });

    it('should have concurrency control', async () => {
      const workflowPath = resolve('./.github/workflows/poll-commands.yml');
      const content = await readFile(workflowPath, 'utf-8');

      expect(content).toMatch(/concurrency:/);
      expect(content).toMatch(/group:\s*poll-commands/);
    });

    it('should have timeout to prevent hanging jobs', async () => {
      const workflowPath = resolve('./.github/workflows/poll-commands.yml');
      const content = await readFile(workflowPath, 'utf-8');

      expect(content).toMatch(/timeout-minutes:/);
    });
  });

  describe('Daily Broadcast Workflow', () => {
    it('should run at both 3am and 4am UTC for DST handling', async () => {
      const workflowPath = resolve('./.github/workflows/daily-broadcast.yml');
      const content = await readFile(workflowPath, 'utf-8');

      // Should have both cron schedules for DST
      expect(content).toMatch(/cron:\s*'0 3 \* \* \*'/);
      expect(content).toMatch(/cron:\s*'0 4 \* \* \*'/);
    });

    it('should support force broadcast input', async () => {
      const workflowPath = resolve('./.github/workflows/daily-broadcast.yml');
      const content = await readFile(workflowPath, 'utf-8');

      expect(content).toMatch(/FORCE_BROADCAST/);
      expect(content).toMatch(/workflow_dispatch/);
    });

    it('should have DST handling comment', async () => {
      const workflowPath = resolve('./.github/workflows/daily-broadcast.yml');
      const content = await readFile(workflowPath, 'utf-8');

      expect(content).toMatch(/DST|daylight/i);
    });

    it('should install FFmpeg', async () => {
      const workflowPath = resolve('./.github/workflows/daily-broadcast.yml');
      const content = await readFile(workflowPath, 'utf-8');

      expect(content).toMatch(/install.*ffmpeg/i);
    });

    it('should have concurrency control to prevent overlapping runs', async () => {
      const workflowPath = resolve('./.github/workflows/daily-broadcast.yml');
      const content = await readFile(workflowPath, 'utf-8');

      expect(content).toMatch(/concurrency:/);
      expect(content).toMatch(/group:\s*daily-broadcast/);
    });

    it('should have write permissions for state updates', async () => {
      const workflowPath = resolve('./.github/workflows/daily-broadcast.yml');
      const content = await readFile(workflowPath, 'utf-8');

      expect(content).toMatch(/permissions:/);
      expect(content).toMatch(/contents:\s*write/);
    });

    it('should commit broadcast state changes', async () => {
      const workflowPath = resolve('./.github/workflows/daily-broadcast.yml');
      const content = await readFile(workflowPath, 'utf-8');

      expect(content).toMatch(/Commit broadcast state/);
      expect(content).toMatch(/git add \.github\/state\//);
    });

    it('should mention duplicate prevention in comments', async () => {
      const workflowPath = resolve('./.github/workflows/daily-broadcast.yml');
      const content = await readFile(workflowPath, 'utf-8');

      expect(content).toMatch(/duplicate/i);
    });
  });

  describe('CI Workflow', () => {
    it('should run lint and format checks', async () => {
      const workflowPath = resolve('./.github/workflows/ci.yml');
      const content = await readFile(workflowPath, 'utf-8');

      expect(content).toMatch(/npm run lint/);
      expect(content).toMatch(/npm run format:check/);
    });

    it('should run tests with coverage', async () => {
      const workflowPath = resolve('./.github/workflows/ci.yml');
      const content = await readFile(workflowPath, 'utf-8');

      expect(content).toMatch(/npm run test:coverage/);
    });

    it('should run on push and pull requests to main', async () => {
      const workflowPath = resolve('./.github/workflows/ci.yml');
      const content = await readFile(workflowPath, 'utf-8');

      expect(content).toMatch(/push:/);
      expect(content).toMatch(/pull_request:/);
      expect(content).toMatch(/branches:\s*\[main\]/);
    });
  });
});

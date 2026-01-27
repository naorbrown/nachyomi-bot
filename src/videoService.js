/**
 * Video Service
 *
 * Converts HLS streams to MP4 for Telegram embedding.
 * Requires FFmpeg to be installed on the system.
 */

import { spawn } from 'child_process';
import { unlink, stat } from 'fs';
import { promisify } from 'util';
import path from 'path';
import os from 'os';

const unlinkAsync = promisify(unlink);
const statAsync = promisify(stat);

// Telegram limits
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const DEFAULT_DURATION = null; // Full video - no duration limit

/**
 * Check if FFmpeg is available
 */
export async function checkFfmpeg() {
  return new Promise((resolve) => {
    const proc = spawn('ffmpeg', ['-version']);
    proc.on('error', () => resolve(false));
    proc.on('close', (code) => resolve(code === 0));
  });
}

/**
 * Convert HLS stream to MP4 file
 */
export async function convertHlsToMp4(hlsUrl, outputPath, options = {}) {
  const {
    maxDuration = DEFAULT_DURATION,
    timeout = 300000, // 5 minute timeout for full videos
  } = options;

  return new Promise((resolve, reject) => {
    const args = [
      '-y',
      '-protocol_whitelist', 'file,http,https,tcp,tls,crypto',
      '-i', hlsUrl,
    ];

    // Only add duration limit if specified
    if (maxDuration) {
      args.push('-t', String(maxDuration));
    }

    args.push(
      '-c', 'copy',
      '-bsf:a', 'aac_adtstoasc',
      '-movflags', '+faststart',
      outputPath
    );

    console.log(`Converting HLS to MP4${maxDuration ? ` (${maxDuration}s)` : ' (full)'}: ${hlsUrl}`);
    const proc = spawn('ffmpeg', args);

    let stderr = '';
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error('FFmpeg timeout'));
    }, timeout);

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(new Error(`FFmpeg error: ${stderr.slice(-200)}`));
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/**
 * Download and convert a shiur video for Telegram
 */
export async function prepareVideoForTelegram(hlsUrl, shiurId) {
  const tempDir = os.tmpdir();
  const outputPath = path.join(tempDir, `shiur_${shiurId}.mp4`);

  try {
    // Convert HLS to MP4 (full video)
    await convertHlsToMp4(hlsUrl, outputPath);

    // Check file size
    const stats = await statAsync(outputPath);
    console.log(`Video converted: ${(stats.size / 1024 / 1024).toFixed(1)}MB`);

    if (stats.size > MAX_VIDEO_SIZE) {
      console.warn(`Video too large for Telegram (${(stats.size / 1024 / 1024).toFixed(1)}MB > 50MB)`);
      await unlinkAsync(outputPath).catch(() => {});
      return { tooLarge: true, size: stats.size };
    }

    return { path: outputPath, size: stats.size };
  } catch (error) {
    console.error('Video preparation failed:', error.message);
    await unlinkAsync(outputPath).catch(() => {});
    return null;
  }
}

/**
 * Clean up a temporary video file
 */
export async function cleanupVideo(filePath) {
  try {
    await unlinkAsync(filePath);
  } catch (error) {
    // Ignore
  }
}

/**
 * Video Service
 *
 * Converts HLS streams to MP4 for Telegram embedding.
 * Requires FFmpeg to be installed on the system.
 */

import { spawn } from 'child_process';
import { createWriteStream, unlink, stat } from 'fs';
import { promisify } from 'util';
import path from 'path';
import os from 'os';

const unlinkAsync = promisify(unlink);
const statAsync = promisify(stat);

// Telegram limits
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_DURATION = 600; // 10 minutes for initial chunk

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
 *
 * @param {string} hlsUrl - The HLS playlist URL
 * @param {string} outputPath - Path for the output MP4 file
 * @param {object} options - Conversion options
 * @returns {Promise<string>} - Path to the converted file
 */
export async function convertHlsToMp4(hlsUrl, outputPath, options = {}) {
  const {
    maxDuration = MAX_DURATION,
    timeout = 120000, // 2 minutes
  } = options;

  return new Promise((resolve, reject) => {
    const args = [
      '-y', // Overwrite output
      '-protocol_whitelist', 'file,http,https,tcp,tls,crypto',
      '-i', hlsUrl,
      '-c', 'copy', // Copy streams without re-encoding (fastest)
      '-bsf:a', 'aac_adtstoasc', // Fix AAC bitstream
      '-movflags', '+faststart', // Enable streaming
    ];

    // Limit duration if specified
    if (maxDuration) {
      args.push('-t', String(maxDuration));
    }

    args.push(outputPath);

    console.log(`Converting HLS to MP4: ${hlsUrl}`);
    const proc = spawn('ffmpeg', args);

    let stderr = '';
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error('FFmpeg conversion timeout'));
    }, timeout);

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(new Error(`FFmpeg exited with code ${code}: ${stderr.slice(-500)}`));
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
 *
 * @param {string} hlsUrl - The HLS playlist URL
 * @param {string} shiurId - The shiur ID for naming
 * @returns {Promise<{path: string, size: number} | null>} - File info or null if too large
 */
export async function prepareVideoForTelegram(hlsUrl, shiurId) {
  const tempDir = os.tmpdir();
  const outputPath = path.join(tempDir, `shiur_${shiurId}.mp4`);

  try {
    // Check if FFmpeg is available
    const hasFfmpeg = await checkFfmpeg();
    if (!hasFfmpeg) {
      console.warn('FFmpeg not available, skipping video conversion');
      return null;
    }

    // Convert HLS to MP4
    await convertHlsToMp4(hlsUrl, outputPath);

    // Check file size
    const stats = await statAsync(outputPath);

    if (stats.size > MAX_VIDEO_SIZE) {
      console.warn(`Video too large (${(stats.size / 1024 / 1024).toFixed(1)}MB), skipping`);
      await unlinkAsync(outputPath).catch(() => {});
      return null;
    }

    return {
      path: outputPath,
      size: stats.size
    };
  } catch (error) {
    console.error('Video preparation failed:', error.message);
    // Clean up on failure
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
    // Ignore cleanup errors
  }
}

/**
 * Get video duration using FFprobe
 */
export async function getVideoDuration(hlsUrl) {
  return new Promise((resolve) => {
    const args = [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      hlsUrl
    ];

    const proc = spawn('ffprobe', args);
    let output = '';

    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0 && output.trim()) {
        resolve(parseFloat(output.trim()));
      } else {
        resolve(null);
      }
    });

    proc.on('error', () => resolve(null));
  });
}

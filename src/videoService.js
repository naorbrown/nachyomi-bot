/**
 * Video Service
 *
 * Converts HLS streams to MP4 for Telegram embedding.
 * Splits large videos into multiple parts to stay under Telegram's 50MB limit.
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
const TARGET_PART_SIZE = 45 * 1024 * 1024; // 45MB target for safety margin

/**
 * Check if FFmpeg is available
 */
export async function checkFfmpeg() {
  return new Promise(resolve => {
    const proc = spawn('ffmpeg', ['-version']);
    proc.on('error', () => resolve(false));
    proc.on('close', code => resolve(code === 0));
  });
}

/**
 * Get video duration using ffprobe
 */
async function getVideoDuration(filePath) {
  return new Promise((resolve, _reject) => {
    const proc = spawn('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      filePath,
    ]);

    let stdout = '';
    proc.stdout.on('data', data => {
      stdout += data.toString();
    });

    proc.on('close', code => {
      if (code === 0) {
        const duration = parseFloat(stdout.trim());
        resolve(isNaN(duration) ? null : duration);
      } else {
        resolve(null);
      }
    });

    proc.on('error', () => resolve(null));
  });
}

/**
 * Convert HLS stream to MP4 file
 */
export async function convertHlsToMp4(hlsUrl, outputPath, options = {}) {
  const {
    startTime = null,
    duration = null,
    timeout = 600000, // 10 minute timeout for full videos
  } = options;

  return new Promise((resolve, reject) => {
    const args = ['-y', '-protocol_whitelist', 'file,http,https,tcp,tls,crypto'];

    // Add start time if specified (for splitting)
    if (startTime !== null) {
      args.push('-ss', String(startTime));
    }

    args.push('-i', hlsUrl);

    // Add duration limit if specified (for splitting)
    if (duration !== null) {
      args.push('-t', String(duration));
    }

    args.push('-c', 'copy', '-bsf:a', 'aac_adtstoasc', '-movflags', '+faststart', outputPath);

    const durationStr = duration ? `${duration}s` : 'full';
    const startStr = startTime ? ` from ${startTime}s` : '';
    console.log(`Converting HLS to MP4 (${durationStr}${startStr}): ${hlsUrl}`);

    const proc = spawn('ffmpeg', args);

    let stderr = '';
    proc.stderr.on('data', data => {
      stderr += data.toString();
    });

    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error('FFmpeg timeout'));
    }, timeout);

    proc.on('close', code => {
      clearTimeout(timer);
      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(new Error(`FFmpeg error: ${stderr.slice(-500)}`));
      }
    });

    proc.on('error', err => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/**
 * Split a video file into parts that fit under Telegram's limit
 */
async function splitVideo(inputPath, shiurId, timestamp, totalDuration, fileSize) {
  const parts = [];
  const tempDir = os.tmpdir();

  // Calculate how many parts we need
  const numParts = Math.ceil(fileSize / TARGET_PART_SIZE);
  const partDuration = Math.ceil(totalDuration / numParts);

  console.log(`Splitting video into ${numParts} parts of ~${partDuration}s each`);

  for (let i = 0; i < numParts; i++) {
    const startTime = i * partDuration;
    const partPath = path.join(tempDir, `shiur_${shiurId}_${timestamp}_part${i + 1}.mp4`);

    try {
      await new Promise((resolve, reject) => {
        const args = [
          '-y',
          '-ss',
          String(startTime),
          '-i',
          inputPath,
          '-t',
          String(partDuration),
          '-c',
          'copy',
          '-movflags',
          '+faststart',
          partPath,
        ];

        const proc = spawn('ffmpeg', args);
        let stderr = '';
        proc.stderr.on('data', data => {
          stderr += data.toString();
        });

        proc.on('close', code => {
          if (code === 0) resolve(partPath);
          else reject(new Error(`Split error: ${stderr.slice(-200)}`));
        });
        proc.on('error', reject);
      });

      const partStats = await statAsync(partPath);
      console.log(`Part ${i + 1}: ${(partStats.size / 1024 / 1024).toFixed(1)}MB`);

      parts.push({
        path: partPath,
        size: partStats.size,
        partNumber: i + 1,
        totalParts: numParts,
        startTime,
        duration: partDuration,
      });
    } catch (error) {
      console.error(`Failed to create part ${i + 1}:`, error.message);
      // Clean up any parts we created
      for (const part of parts) {
        await unlinkAsync(part.path).catch(() => {});
      }
      return null;
    }
  }

  return parts;
}

/**
 * Download and convert a shiur video for Telegram
 * Returns either a single video or multiple parts if the video is too large
 */
export async function prepareVideoForTelegram(hlsUrl, shiurId) {
  const tempDir = os.tmpdir();
  const timestamp = Date.now();
  const outputPath = path.join(tempDir, `shiur_${shiurId}_${timestamp}.mp4`);

  try {
    // Convert HLS to MP4 (full video)
    await convertHlsToMp4(hlsUrl, outputPath);

    // Check file size
    const stats = await statAsync(outputPath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(1);
    console.log(`Video converted: ${sizeMB}MB`);

    if (stats.size <= MAX_VIDEO_SIZE) {
      // Video fits in one message
      return { path: outputPath, size: stats.size };
    }

    // Video too large - need to split it
    console.log(`Video too large (${sizeMB}MB > 50MB), splitting into parts...`);

    // Get video duration for splitting
    const duration = await getVideoDuration(outputPath);
    if (!duration) {
      console.error('Could not determine video duration');
      await unlinkAsync(outputPath).catch(() => {});
      return { tooLarge: true, size: stats.size };
    }

    console.log(`Video duration: ${Math.round(duration)}s`);

    // Split the video
    const parts = await splitVideo(outputPath, shiurId, timestamp, duration, stats.size);

    // Clean up the original large file
    await unlinkAsync(outputPath).catch(() => {});

    if (!parts || parts.length === 0) {
      return { tooLarge: true, size: stats.size };
    }

    return {
      parts,
      totalSize: stats.size,
      totalDuration: duration,
    };
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
    // Ignore cleanup errors
  }
}

/**
 * Clean up multiple video parts
 */
export async function cleanupVideoParts(parts) {
  for (const part of parts) {
    await cleanupVideo(part.path);
  }
}

/**
 * Broadcast state management - prevents duplicate daily broadcasts
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';

const STATE_FILE = '.github/state/broadcast-state.json';

/**
 * Get today's date in Israel timezone as YYYY-MM-DD
 * @returns {string} Date string
 */
export function getIsraelDate() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Jerusalem',
  });
  return formatter.format(now);
}

/**
 * Load broadcast state from file
 * @returns {Promise<{lastBroadcastDate: string|null}>}
 */
export async function loadBroadcastState() {
  try {
    const content = await readFile(STATE_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { lastBroadcastDate: null };
  }
}

/**
 * Save broadcast state to file
 * @param {object} state - State to save
 */
export async function saveBroadcastState(state) {
  await mkdir(dirname(STATE_FILE), { recursive: true });
  await writeFile(STATE_FILE, JSON.stringify(state, null, 2) + '\n');
}

/**
 * Check if broadcast was already sent today (Israel time)
 * @returns {Promise<boolean>}
 */
export async function wasBroadcastSentToday() {
  const state = await loadBroadcastState();
  const today = getIsraelDate();
  return state.lastBroadcastDate === today;
}

/**
 * Mark broadcast as sent for today (Israel time)
 */
export async function markBroadcastSent() {
  const today = getIsraelDate();
  await saveBroadcastState({
    lastBroadcastDate: today,
    updatedAt: new Date().toISOString(),
  });
}

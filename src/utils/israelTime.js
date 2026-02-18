/**
 * Israel time utilities for scheduling
 */

/**
 * Get current hour in Israel time as a number
 * @returns {number} Current hour (0-23) in Israel timezone
 */
export function getIsraelHour() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    hour12: false,
    timeZone: 'Asia/Jerusalem',
  });
  const hour = parseInt(formatter.format(now), 10);
  // Intl.DateTimeFormat returns 24 for midnight in some environments
  return hour === 24 ? 0 : hour;
}

/**
 * Check if current Israel time is within the broadcast window (midnight–6am).
 * Uses a window instead of an exact hour to tolerate GitHub Actions cron delays,
 * which can be 30-90+ minutes. Duplicate prevention is handled separately by
 * the sentinel cache and broadcastState.
 * @returns {boolean} true if Israel hour is 0-6
 */
export function isIsraelBroadcastWindow() {
  const hour = getIsraelHour();
  return hour >= 0 && hour <= 6;
}

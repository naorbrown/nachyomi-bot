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
  return parseInt(formatter.format(now), 10);
}

/**
 * Check if it's currently 6am Israel time
 * Handles DST automatically using Intl API
 * @returns {boolean} true if it's 6am in Israel
 */
export function isIsrael6am() {
  return getIsraelHour() === 6;
}

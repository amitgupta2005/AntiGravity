/**
 * Centralized Date & Timezone Utilities for IPO Analyzer
 * Enforces Indian Standard Time (IST - Asia/Kolkata, UTC+05:30) across all market feeds,
 * timeline calculators, and UI displays.
 */

export const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Returns current date string formatted as 'YYYY-MM-DD' strictly in IST (Asia/Kolkata).
 * @param {Date} [date=new Date()]
 * @returns {string} e.g. "2026-11-01"
 */
export function getIstDateString(date = new Date()) {
  const d = date instanceof Date && !isNaN(date.getTime()) ? date : new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(d);
}

/**
 * Returns current time string formatted with IST marker, e.g. "01:45:10 pm IST".
 * @param {Date} [date=new Date()]
 * @returns {string}
 */
export function getIstTimeString(date = new Date()) {
  const d = date instanceof Date && !isNaN(date.getTime()) ? date : new Date();
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }).format(d) + ' IST';
}

/**
 * Returns full date and time string formatted in IST, e.g. "01 Nov 2026, 01:45:10 pm IST".
 * @param {Date} [date=new Date()]
 * @returns {string}
 */
export function getIstDateTimeString(date = new Date()) {
  const d = date instanceof Date && !isNaN(date.getTime()) ? date : new Date();
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }).format(d) + ' IST';
}

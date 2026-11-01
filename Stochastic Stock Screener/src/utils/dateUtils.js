/**
 * Date & Time Utilities configured strictly for IST (Indian Standard Time • Asia/Kolkata • UTC+05:30)
 */

export const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Format a Date or timestamp into an IST Date string (e.g., "01 Nov 2026")
 * @param {Date|number|string} d
 * @param {Object} options
 * @returns {string} Formatted IST date
 */
export function formatISTDate(d = new Date(), options = {}) {
  const dateObj = typeof d === 'number' ? new Date(d > 1e11 ? d : d * 1000) : (d instanceof Date ? d : new Date(d));
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...options
  }).format(dateObj);
}

/**
 * Format a Date or timestamp into an IST Time string with explicit 'IST' label (e.g., "04:45:10 PM IST")
 * @param {Date|number|string} d
 * @param {boolean} includeSeconds
 * @returns {string} Formatted IST time with IST suffix
 */
export function formatISTTime(d = new Date(), includeSeconds = true) {
  const dateObj = typeof d === 'number' ? new Date(d > 1e11 ? d : d * 1000) : (d instanceof Date ? d : new Date(d));
  const timeStr = new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: includeSeconds ? '2-digit' : undefined,
    hour12: true
  }).format(dateObj);
  return `${timeStr} IST`;
}

/**
 * Format a Date or timestamp into full IST Date & Time (e.g., "01 Nov 2026, 04:45:10 PM IST")
 * @param {Date|number|string} d
 * @param {boolean} includeSeconds
 * @returns {string} Formatted IST date and time
 */
export function formatISTDateTime(d = new Date(), includeSeconds = true) {
  const dateObj = typeof d === 'number' ? new Date(d > 1e11 ? d : d * 1000) : (d instanceof Date ? d : new Date(d));
  const dtStr = new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: includeSeconds ? '2-digit' : undefined,
    hour12: true
  }).format(dateObj);
  return `${dtStr} IST`;
}

/**
 * Returns current date in YYYY-MM-DD format as per IST (useful for filenames)
 * @param {Date|number|string} d
 * @returns {string} YYYY-MM-DD in IST
 */
export function getISTDateISOSlice(d = new Date()) {
  const dateObj = typeof d === 'number' ? new Date(d > 1e11 ? d : d * 1000) : (d instanceof Date ? d : new Date(d));
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(dateObj);
}

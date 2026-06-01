/**
 * Formats a given Date object as a local YYYY-MM-DD string.
 * @param {Date} d - The date to format. Defaults to current time.
 * @returns {string} YYYY-MM-DD in the server's local timezone.
 */
export const getLocalDateStr = (d = new Date()) => {
  return d.getFullYear() + '-' + 
    String(d.getMonth() + 1).padStart(2, '0') + '-' + 
    String(d.getDate()).padStart(2, '0');
};

/**
 * Checks if an ISO timestamp falls on a specific local date.
 * @param {string} isoString - The UTC ISO string (e.g., from createdAt).
 * @param {string} targetDateStr - The target date in YYYY-MM-DD format.
 * @returns {boolean} True if it matches the target local date.
 */
export const isSameLocalDay = (isoString, targetDateStr) => {
  if (!isoString) return false;
  return getLocalDateStr(new Date(isoString)) === targetDateStr;
};

/**
 * Parses a date/datetime string into a UTC-equivalent Date boundary.
 *
 * KEY FIX: A plain "YYYY-MM-DD" (length 10) is intentionally ambiguous —
 * the JavaScript Date constructor treats it as UTC midnight, which causes
 * off-by-one bugs for servers in UTC+N zones (e.g. IST = UTC+5:30).
 *
 * We fix this by appending a LOCAL time component so that:
 *   parseStart("2026-05-01")  → 2026-05-01T00:00:00  (local midnight)
 *   parseEnd  ("2026-05-01")  → 2026-05-01T23:59:59  (local end-of-day)
 *
 * Full ISO strings (length > 10, e.g. "2026-05-01T06:30:00.000Z")
 * are already absolute UTC moments and are used as-is.
 *
 * @param {string} s   - Date string: "YYYY-MM-DD" or full ISO datetime.
 * @param {'start'|'end'} type - Whether to fill as start or end of day.
 * @returns {Date}
 */
export const parseDateBoundary = (s, type = 'start') => {
  if (!s) return null;
  if (s.length === 10) {
    // Plain date — append LOCAL time so IST servers don't shift to wrong day
    return new Date(s + (type === 'start' ? 'T00:00:00' : 'T23:59:59.999'));
  }
  if (s.length === 16) {
    // datetime-local input (YYYY-MM-DDTHH:mm) - expand the minute boundary 
    return new Date(s + (type === 'start' ? ':00.000' : ':59.999'));
  }
  // Full ISO / datetime-local string with seconds — use directly
  return new Date(s);
};

/**
 * Checks if an ISO timestamp falls within a specific date/datetime range.
 *
 * @param {string} isoString    - The UTC ISO string stored in the DB.
 * @param {string} startStr     - Start boundary: "YYYY-MM-DD" or full ISO.
 * @param {string} endStr       - End boundary:   "YYYY-MM-DD" or full ISO.
 * @returns {boolean} True if within the inclusive range.
 */
export const inLocalPeriod = (isoString, startStr, endStr) => {
  if (!isoString) return false;

  const start = parseDateBoundary(startStr, 'start');
  const end   = parseDateBoundary(endStr,   'end');

  const d = new Date(isoString);
  if (isNaN(d)) return false;

  return d >= start && d <= end;
};

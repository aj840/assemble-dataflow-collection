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
 * Checks if an ISO timestamp falls within a specific local date range.
 * @param {string} isoString - The UTC ISO string.
 * @param {string} startDateStr - The start date in YYYY-MM-DD format.
 * @param {string} endDateStr - The end date in YYYY-MM-DD format.
 * @returns {boolean} True if within the inclusive range.
 */
export const inLocalPeriod = (isoString, startDateStr, endDateStr) => {
  if (!isoString) return false;
  
  // Create Date objects correctly if time is already included
  const start = new Date(startDateStr.length === 10 ? startDateStr + 'T00:00:00' : startDateStr);
  const end = new Date(endDateStr.length === 10 ? endDateStr + 'T23:59:59' : endDateStr);
  
  // The Date object constructor will parse the ISO string to an exact Unix moment
  const d = new Date(isoString);
  
  return d >= start && d <= end;
};

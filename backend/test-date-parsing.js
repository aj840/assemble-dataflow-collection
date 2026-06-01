import { parseDateBoundary, inLocalPeriod } from './utils/dates.js';

const start = "2026-06-01T10:00:00.000Z";
const end = "2026-06-02T10:00:00.000Z";
const iso = "2026-06-01T12:00:00.000Z";

console.log('start:', start);
console.log('start parsed:', parseDateBoundary(start, 'start'));
console.log('end parsed:', parseDateBoundary(end, 'end'));
console.log('d parsed:', new Date(iso));
console.log('in period?', inLocalPeriod(iso, start, end));

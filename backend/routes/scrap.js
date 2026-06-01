import db, { randomUUID } from '../db.js';
import * as XLSX from 'xlsx';
import { isSameLocalDay, inLocalPeriod } from '../utils/dates.js';

// GET /api/scrap
export const getScrapEntries = (req, res) => {
  const { moNumber, date, startDate, endDate, component } = req.query;
  let entries = [...(db.data.scrapEntries || [])];

  if (moNumber) {
    const q = moNumber.toLowerCase();
    entries = entries.filter(e => (e.moNumber || '').toLowerCase().includes(q));
  }
  if (component) entries = entries.filter(e => e.component === component);
  if (date) entries = entries.filter(e => isSameLocalDay(e.submittedAt, date));
  if (startDate && endDate) {
    entries = entries.filter(e => inLocalPeriod(e.submittedAt, startDate, endDate));
  }

  entries.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  res.json(entries);
};

// POST /api/scrap
export const createScrapEntry = async (req, res) => {
  const { moId, moNumber, sku, component, componentName, receive, reject, submittedBy } = req.body;
  if (!moNumber || !component) return res.status(400).json({ message: 'MO number and component are required' });

  const now = new Date().toISOString();
  const recVal = parseInt(receive) || 0;
  const rejVal = parseInt(reject) || 0;

  if (!db.data.scrapEntries) db.data.scrapEntries = [];

  let entry = db.data.scrapEntries.find(e => e.moId === moId && e.component === component);

  if (entry) {
    if (recVal > 0) {
      entry.receive = (entry.receive || 0) + recVal;
      entry.receivedAt = now;
    }
    if (rejVal > 0) {
      entry.reject = (entry.reject || 0) + rejVal;
      entry.rejectedAt = now;
    }
    entry.submittedAt = now;
    entry.submittedBy = submittedBy || entry.submittedBy;
  } else {
    entry = {
      id: randomUUID(),
      moId: moId || '',
      moNumber: moNumber || '',
      sku: sku || '',
      component: component || '',
      componentName: componentName || '',
      receive: recVal,
      reject: rejVal,
      submittedAt: now,
      receivedAt: recVal > 0 ? now : null,
      rejectedAt: rejVal > 0 ? now : null,
      submittedBy: submittedBy || 'Unknown',
    };
    db.data.scrapEntries.push(entry);
  }

  db.data.auditLogs.unshift({
    id: randomUUID(),
    action: `Scrap update: MO ${moNumber} — ${component} (+Recv: ${recVal}, +Rej: ${rejVal})`,
    user: submittedBy,
    time: now,
  });
  await db.write();
  res.json({ success: true, entry });
};

// PUT /api/scrap/:id
export const updateScrapEntry = async (req, res) => {
  const { id } = req.params;
  const { receive, reject } = req.body;
  if (!db.data.scrapEntries) return res.status(404).json({ message: 'Not found' });
  
  const entry = db.data.scrapEntries.find(e => e.id === id);
  if (!entry) return res.status(404).json({ message: 'Scrap entry not found' });

  const now = new Date().toISOString();
  const recVal = parseInt(receive) || 0;
  const rejVal = parseInt(reject) || 0;

  if (recVal !== entry.receive) {
    entry.receive = recVal;
    entry.receivedAt = recVal > 0 ? now : null;
  }
  if (rejVal !== entry.reject) {
    entry.reject = rejVal;
    entry.rejectedAt = rejVal > 0 ? now : null;
  }
  
  db.data.auditLogs.unshift({
    id: randomUUID(),
    action: `Scrap edited: MO ${entry.moNumber} — ${entry.component} (New Recv: ${recVal}, New Rej: ${rejVal})`,
    user: req.body.submittedBy || 'Admin',
    time: now,
  });

  await db.write();
  res.json({ success: true, entry });
};

// DELETE /api/scrap/:id
export const deleteScrapEntry = async (req, res) => {
  const { id } = req.params;
  if (!db.data.scrapEntries) return res.status(404).json({ message: 'Not found' });
  const idx = db.data.scrapEntries.findIndex(e => e.id === id);
  if (idx === -1) return res.status(404).json({ message: 'Scrap entry not found' });
  db.data.scrapEntries.splice(idx, 1);
  await db.write();
  res.json({ success: true });
};

// GET /api/scrap/export?moNumber=&startDate=&endDate=&component=
export const exportScrapExcel = (req, res) => {
  const { moNumber, date, startDate, endDate, component } = req.query;
  let entries = [...(db.data.scrapEntries || [])];

  if (moNumber) {
    const q = moNumber.toLowerCase();
    entries = entries.filter(e => (e.moNumber || '').toLowerCase().includes(q));
  }
  if (component) entries = entries.filter(e => e.component === component);
  if (date) entries = entries.filter(e => isSameLocalDay(e.submittedAt, date));
  if (startDate && endDate) {
    entries = entries.filter(e => inLocalPeriod(e.submittedAt, startDate, endDate));
  }

  entries.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

  const rows = entries.map(e => ({
    'MO Number': e.moNumber,
    'SKU': e.sku,
    'Component Type': e.component,
    'Component Name': e.componentName,
    'Receive (RC)': e.receive,
    'Reject (RJ)': e.reject,
    'Received At': e.receivedAt ? new Date(e.receivedAt).toLocaleString() : '—',
    'Rejected At': e.rejectedAt ? new Date(e.rejectedAt).toLocaleString() : '—',
    'Submitted At': e.submittedAt ? new Date(e.submittedAt).toLocaleString() : '—',
    'Submitted By': e.submittedBy,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Scrap Records');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename="scrap_report.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
};

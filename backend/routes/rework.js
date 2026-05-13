import db, { randomUUID } from '../db.js';
import * as XLSX from 'xlsx';

// Ensure reworkEntries array exists in DB
const ensureRework = () => {
  if (!db.data.reworkEntries) db.data.reworkEntries = [];
};

// GET /api/rework
export const getReworkEntries = (req, res) => {
  ensureRework();
  const { moNumber, date, startDate, endDate, component } = req.query;
  let entries = [...db.data.reworkEntries];

  if (moNumber) {
    const q = moNumber.toLowerCase();
    entries = entries.filter(e => (e.moNumber || '').toLowerCase().includes(q));
  }
  if (component) entries = entries.filter(e => e.component === component);
  if (date)      entries = entries.filter(e => e.submittedAt && e.submittedAt.startsWith(date));
  if (startDate && endDate) {
    entries = entries.filter(e => {
      const d = (e.submittedAt || '').split('T')[0];
      return d >= startDate && d <= endDate;
    });
  }

  entries.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  res.json(entries);
};

// POST /api/rework
export const createReworkEntry = async (req, res) => {
  ensureRework();
  const { moId, moNumber, sku, component, componentName, receive, reject, isFullMO, submittedBy } = req.body;
  if (!moNumber || !component) return res.status(400).json({ message: 'MO number and component are required' });

  const now      = new Date().toISOString();
  const recVal   = parseInt(receive) || 0;
  const rejVal   = parseInt(reject)  || 0;
  if (rejVal <= 0 && recVal <= 0) return res.status(400).json({ message: 'At least one of receive or reject must be > 0' });

  // Accumulate into existing entry for the same MO + component (like scrap does)
  let entry = db.data.reworkEntries.find(e => e.moId === moId && e.component === component);

  if (entry) {
    if (recVal > 0) { entry.receive = (entry.receive || 0) + recVal; entry.receivedAt  = now; }
    if (rejVal > 0) { entry.reject  = (entry.reject  || 0) + rejVal; entry.rejectedAt = now; }
    entry.submittedAt = now;
    entry.submittedBy = submittedBy || entry.submittedBy;
  } else {
    entry = {
      id:            randomUUID(),
      moId:          moId          || '',
      moNumber:      moNumber      || '',
      sku:           sku           || '',
      component:     component     || '',
      componentName: componentName || '',
      isFullMO:      !!isFullMO,
      receive:       recVal,
      reject:        rejVal,
      submittedAt:   now,
      receivedAt:    recVal > 0 ? now : null,
      rejectedAt:    rejVal > 0 ? now : null,
      submittedBy:   submittedBy || 'Unknown',
    };
    db.data.reworkEntries.push(entry);
  }

  db.data.auditLogs.unshift({
    id:     randomUUID(),
    action: `Rework entry: MO ${moNumber} — ${component} (+Recv: ${recVal}, +Rej: ${rejVal})`,
    user:   submittedBy,
    time:   now,
  });

  await db.write();
  res.json({ success: true, entry });
};

// PUT /api/rework/:id
export const updateReworkEntry = async (req, res) => {
  ensureRework();
  const { id } = req.params;
  const { receive, reject } = req.body;
  const entry = db.data.reworkEntries.find(e => e.id === id);
  if (!entry) return res.status(404).json({ message: 'Rework entry not found' });

  const now    = new Date().toISOString();
  const recVal = parseInt(receive) || 0;
  const rejVal = parseInt(reject)  || 0;

  if (recVal !== entry.receive) { entry.receive = recVal; entry.receivedAt  = recVal > 0 ? now : null; }
  if (rejVal !== entry.reject)  { entry.reject  = rejVal; entry.rejectedAt  = rejVal > 0 ? now : null; }
  entry.submittedAt = now;

  db.data.auditLogs.unshift({
    id:     randomUUID(),
    action: `Rework edited: MO ${entry.moNumber} — ${entry.component} (New Recv: ${recVal}, New Rej: ${rejVal})`,
    user:   req.body.submittedBy || 'Admin',
    time:   now,
  });

  await db.write();
  res.json({ success: true, entry });
};

// DELETE /api/rework/:id
export const deleteReworkEntry = async (req, res) => {
  ensureRework();
  const { id } = req.params;
  const idx = db.data.reworkEntries.findIndex(e => e.id === id);
  if (idx === -1) return res.status(404).json({ message: 'Rework entry not found' });
  db.data.reworkEntries.splice(idx, 1);
  await db.write();
  res.json({ success: true });
};

// GET /api/rework/export
export const exportReworkExcel = (req, res) => {
  ensureRework();
  const { moNumber, date, startDate, endDate, component } = req.query;
  let entries = [...db.data.reworkEntries];

  if (moNumber) { const q = moNumber.toLowerCase(); entries = entries.filter(e => (e.moNumber || '').toLowerCase().includes(q)); }
  if (component)  entries = entries.filter(e => e.component === component);
  if (date)       entries = entries.filter(e => e.submittedAt && e.submittedAt.startsWith(date));
  if (startDate && endDate) {
    entries = entries.filter(e => {
      const d = (e.submittedAt || '').split('T')[0];
      return d >= startDate && d <= endDate;
    });
  }
  entries.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

  const rows = entries.map(e => ({
    'MO Number':      e.moNumber,
    'SKU':            e.sku,
    'Component Type': e.component,
    'Component Name': e.componentName,
    'Full MO':        e.isFullMO ? 'Yes' : 'No',
    'Receive (RC)':   e.receive,
    'Reject (RJ)':    e.reject,
    'Received At':    e.receivedAt  ? new Date(e.receivedAt).toLocaleString()  : '—',
    'Rejected At':    e.rejectedAt  ? new Date(e.rejectedAt).toLocaleString()  : '—',
    'Submitted At':   e.submittedAt ? new Date(e.submittedAt).toLocaleString() : '—',
    'Submitted By':   e.submittedBy,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Rework Records');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename="rework_report.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
};

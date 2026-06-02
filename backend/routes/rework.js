import { randomUUID } from '../db.js';
import { ReworkEntry, AuditLog } from '../models/Entries.js';
import * as XLSX from 'xlsx';
import { isSameLocalDay, inLocalPeriod } from '../utils/dates.js';

// GET /api/rework
export const getReworkEntries = async (req, res) => {
  try {
    const { moNumber, date, startDate, endDate, component } = req.query;
    const query = {};
    if (moNumber) query.moNumber = { $regex: moNumber, $options: 'i' };
    if (component) query.component = component;
    let entries = await ReworkEntry.find(query).lean();
    if (date) entries = entries.filter(e => isSameLocalDay(e.submittedAt, date));
    if (startDate && endDate) entries = entries.filter(e => inLocalPeriod(e.submittedAt, startDate, endDate));
    entries.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    res.json(entries);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

// POST /api/rework
export const createReworkEntry = async (req, res) => {
  try {
    const { moId, moNumber, sku, component, componentName, receive, reject, isFullMO, submittedBy } = req.body;
    if (!moNumber || !component) return res.status(400).json({ message: 'MO number and component are required' });
    const now = new Date().toISOString();
    const recVal = parseInt(receive) || 0;
    const rejVal = parseInt(reject) || 0;
    if (rejVal <= 0 && recVal <= 0) return res.status(400).json({ message: 'At least one of receive or reject must be > 0' });

    let entry = await ReworkEntry.findOne({ moId, component });
    if (entry) {
      if (recVal > 0) { entry.receive = (entry.receive || 0) + recVal; entry.receivedAt = now; }
      if (rejVal > 0) { entry.reject  = (entry.reject  || 0) + rejVal; entry.rejectedAt = now; }
      entry.submittedAt = now;
      entry.submittedBy = submittedBy || entry.submittedBy;
      await entry.save();
    } else {
      entry = await ReworkEntry.create({
        id: randomUUID(), moId: moId || '', moNumber: moNumber || '', sku: sku || '',
        component: component || '', componentName: componentName || '', isFullMO: !!isFullMO,
        receive: recVal, reject: rejVal, submittedAt: now,
        receivedAt: recVal > 0 ? now : null, rejectedAt: rejVal > 0 ? now : null,
        submittedBy: submittedBy || 'Unknown',
      });
    }

    await AuditLog.create({ id: randomUUID(), action: `Rework entry: MO ${moNumber} — ${component} (+Recv: ${recVal}, +Rej: ${rejVal})`, user: submittedBy, timestamp: now });
    res.json({ success: true, entry });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
};

// PUT /api/rework/:id
export const updateReworkEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const { receive, reject } = req.body;
    const entry = await ReworkEntry.findOne({ id });
    if (!entry) return res.status(404).json({ message: 'Rework entry not found' });
    const now = new Date().toISOString();
    const recVal = parseInt(receive) || 0;
    const rejVal = parseInt(reject) || 0;
    if (recVal !== entry.receive) { entry.receive = recVal; entry.receivedAt = recVal > 0 ? now : null; }
    if (rejVal !== entry.reject)  { entry.reject  = rejVal; entry.rejectedAt  = rejVal > 0 ? now : null; }
    entry.submittedAt = now;
    await entry.save();
    await AuditLog.create({ id: randomUUID(), action: `Rework edited: MO ${entry.moNumber} — ${entry.component} (New Recv: ${recVal}, New Rej: ${rejVal})`, user: req.body.submittedBy || 'Admin', timestamp: now });
    res.json({ success: true, entry });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

// DELETE /api/rework/:id
export const deleteReworkEntry = async (req, res) => {
  try {
    const result = await ReworkEntry.deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ message: 'Rework entry not found' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

// GET /api/rework/export
export const exportReworkExcel = async (req, res) => {
  try {
    const { moNumber, date, startDate, endDate, component } = req.query;
    let entries = await ReworkEntry.find({}).lean();
    if (moNumber) entries = entries.filter(e => (e.moNumber || '').toLowerCase().includes(moNumber.toLowerCase()));
    if (component) entries = entries.filter(e => e.component === component);
    if (date) entries = entries.filter(e => isSameLocalDay(e.submittedAt, date));
    if (startDate && endDate) entries = entries.filter(e => inLocalPeriod(e.submittedAt, startDate, endDate));
    entries.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    const rows = entries.map(e => ({ 'MO Number': e.moNumber, 'SKU': e.sku, 'Component Type': e.component, 'Component Name': e.componentName, 'Full MO': e.isFullMO ? 'Yes' : 'No', 'Receive (RC)': e.receive, 'Reject (RJ)': e.reject, 'Received At': e.receivedAt ? new Date(e.receivedAt).toLocaleString() : '—', 'Rejected At': e.rejectedAt ? new Date(e.rejectedAt).toLocaleString() : '—', 'Submitted At': e.submittedAt ? new Date(e.submittedAt).toLocaleString() : '—', 'Submitted By': e.submittedBy }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rework Records');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="rework_report.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

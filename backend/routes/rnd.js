import { randomUUID } from '../db.js';
import { RndProduct, RndEntry, AuditLog } from '../models/Entries.js';
import * as XLSX from 'xlsx';
import { inLocalPeriod } from '../utils/dates.js';

// GET /api/rnd/products
export const getRndProducts = async (req, res) => {
  try { res.json(await RndProduct.find({}).lean()); }
  catch (err) { res.status(500).json({ message: 'Server error' }); }
};

// POST /api/rnd/products
export const createRndProduct = async (req, res) => {
  try {
    const { code, description, category } = req.body;
    if (!code || !description || !category) return res.status(400).json({ message: 'Code, description, and category are required' });
    const existing = await RndProduct.findOne({ code: new RegExp(`^${code}$`, 'i') });
    if (existing) return res.status(400).json({ message: 'Product code already exists' });
    const product = await RndProduct.create({ id: randomUUID(), code, description, category, status: 'Active', createdAt: new Date().toISOString() });
    res.json({ success: true, product });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

// PUT /api/rnd/products/:id
export const updateRndProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, description, category, status } = req.body;
    const product = await RndProduct.findOne({ id });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    if (code && code.toLowerCase() !== product.code.toLowerCase()) {
      const conflict = await RndProduct.findOne({ id: { $ne: id }, code: new RegExp(`^${code}$`, 'i') });
      if (conflict) return res.status(400).json({ message: 'Product code already exists' });
    }
    if (code !== undefined) product.code = code;
    if (description !== undefined) product.description = description;
    if (category !== undefined) product.category = category;
    if (status !== undefined) product.status = status;
    product.updatedAt = new Date().toISOString();
    await product.save();
    await AuditLog.create({ id: randomUUID(), action: `R&D Product updated: ${product.code} — ${product.description}`, user: req.body.updatedBy || 'Admin', timestamp: new Date().toISOString() });
    res.json({ success: true, product });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

// DELETE /api/rnd/products/:id
export const deleteRndProduct = async (req, res) => {
  try {
    const result = await RndProduct.deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ message: 'Product not found' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

// GET /api/rnd/entries
export const getRndEntries = async (req, res) => {
  try {
    const { startDate, endDate, includeDeleted } = req.query;
    const query = {};
    if (includeDeleted !== 'true') query.isDeleted = { $ne: true };
    let entries = await RndEntry.find(query).lean();
    if (startDate && endDate) entries = entries.filter(e => inLocalPeriod(e.submittedAt, startDate, endDate));
    entries.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    res.json(entries);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

// POST /api/rnd/entries
export const createRndEntry = async (req, res) => {
  try {
    let items = Array.isArray(req.body) ? req.body : [req.body];
    const createdEntries = [];
    for (const item of items) {
      const { code, description, category, submittedBy, pickNumber, acceptReject, receivedCount, remark } = item;
      if (!code) continue;
      const entry = await RndEntry.create({ id: randomUUID(), code, description, category, pickNumber: pickNumber || '', acceptReject: acceptReject || 'Accept', receivedCount: receivedCount ? parseInt(receivedCount, 10) : 0, remark: remark || '', submittedBy: submittedBy || 'Unknown', submittedAt: new Date().toISOString(), isDeleted: false });
      createdEntries.push(entry);
      await AuditLog.create({ id: randomUUID(), action: `R&D Entry created: ${code} (${acceptReject || 'Accept'}) by ${submittedBy || 'Unknown'}`, user: submittedBy || 'Unknown', timestamp: new Date().toISOString() });
    }
    res.json({ success: true, entries: createdEntries });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
};

// PUT /api/rnd/entries/:id
export const updateRndEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const { pickNumber, acceptReject, receivedCount, remark, updatedBy } = req.body;
    const entry = await RndEntry.findOne({ id });
    if (!entry) return res.status(404).json({ message: 'Entry not found' });
    if (entry.isDeleted) return res.status(400).json({ message: 'Cannot edit a deleted entry' });
    if (pickNumber !== undefined) entry.pickNumber = pickNumber;
    if (acceptReject !== undefined) entry.acceptReject = acceptReject;
    if (receivedCount !== undefined) entry.receivedCount = parseInt(receivedCount, 10) || 0;
    if (remark !== undefined) entry.remark = remark;
    entry.updatedAt = new Date().toISOString();
    entry.updatedBy = updatedBy || 'Admin';
    await entry.save();
    await AuditLog.create({ id: randomUUID(), action: `R&D Entry edited: ${entry.code} — Pick#: ${entry.pickNumber}, Status: ${entry.acceptReject}`, user: updatedBy || 'Admin', timestamp: new Date().toISOString() });
    res.json({ success: true, entry });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

// DELETE /api/rnd/entries/:id (soft delete)
export const deleteRndEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const { deletedBy } = req.body;
    const entry = await RndEntry.findOne({ id });
    if (!entry) return res.status(404).json({ message: 'Entry not found' });
    entry.isDeleted = true; entry.deletedBy = deletedBy || 'Admin'; entry.deletedAt = new Date().toISOString();
    await entry.save();
    await AuditLog.create({ id: randomUUID(), action: `R&D Entry deleted: ${entry.code} (by ${entry.deletedBy})`, user: deletedBy || 'Admin', timestamp: new Date().toISOString() });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

// GET /api/rnd/export
export const exportRndExcel = async (req, res) => {
  try {
    const { startDate, endDate, includeDeleted } = req.query;
    const query = {};
    if (includeDeleted !== 'true') query.isDeleted = { $ne: true };
    let entries = await RndEntry.find(query).lean();
    if (startDate && endDate) entries = entries.filter(e => inLocalPeriod(e.submittedAt, startDate, endDate));
    entries.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    const rows = entries.map(e => ({ 'ID': e.id, 'Product Code': e.code, 'Description': e.description, 'Category': e.category, 'Pick Number': e.pickNumber || '', 'Status': e.acceptReject || '', 'Received': e.receivedCount || 0, 'Remark': e.remark || '', 'Submitted By': e.submittedBy, 'Submitted At': e.submittedAt ? new Date(e.submittedAt).toLocaleString() : '—', 'Updated By': e.updatedBy || '', 'Updated At': e.updatedAt ? new Date(e.updatedAt).toLocaleString() : '', 'Deleted': e.isDeleted ? `Yes (by ${e.deletedBy})` : 'No', 'Deleted At': e.deletedAt ? new Date(e.deletedAt).toLocaleString() : '' }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'R&D Entries');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="rnd_report.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

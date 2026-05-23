import db, { randomUUID } from '../db.js';
import * as XLSX from 'xlsx';

// GET /api/rnd/products
export const getRndProducts = (req, res) => {
  res.json(db.data.rndProducts || []);
};

// POST /api/rnd/products
export const createRndProduct = async (req, res) => {
  const { code, description, category } = req.body;
  if (!code || !description || !category) {
    return res.status(400).json({ message: 'Code, description, and category are required' });
  }

  if (!db.data.rndProducts) db.data.rndProducts = [];

  const existing = db.data.rndProducts.find(p => p.code.toLowerCase() === code.toLowerCase());
  if (existing) {
    return res.status(400).json({ message: 'Product code already exists' });
  }

  const newProduct = {
    id: randomUUID(),
    code,
    description,
    category,
    status: 'Active',
    createdAt: new Date().toISOString()
  };

  db.data.rndProducts.push(newProduct);
  await db.write();

  res.json({ success: true, product: newProduct });
};

// PUT /api/rnd/products/:id
export const updateRndProduct = async (req, res) => {
  const { id } = req.params;
  const { code, description, category, status } = req.body;

  if (!db.data.rndProducts) return res.status(404).json({ message: 'Not found' });
  const product = db.data.rndProducts.find(p => p.id === id);
  if (!product) return res.status(404).json({ message: 'Product not found' });

  // Check for code conflict with another product
  if (code && code.toLowerCase() !== product.code.toLowerCase()) {
    const conflict = db.data.rndProducts.find(
      p => p.id !== id && p.code.toLowerCase() === code.toLowerCase()
    );
    if (conflict) return res.status(400).json({ message: 'Product code already exists' });
  }

  if (code !== undefined) product.code = code;
  if (description !== undefined) product.description = description;
  if (category !== undefined) product.category = category;
  if (status !== undefined) product.status = status;
  product.updatedAt = new Date().toISOString();

  if (!db.data.auditLogs) db.data.auditLogs = [];
  db.data.auditLogs.unshift({
    id: randomUUID(),
    action: `R&D Product updated: ${product.code} — ${product.description}`,
    user: req.body.updatedBy || 'Admin',
    time: new Date().toISOString(),
  });

  await db.write();
  res.json({ success: true, product });
};

// DELETE /api/rnd/products/:id
export const deleteRndProduct = async (req, res) => {
  const { id } = req.params;
  if (!db.data.rndProducts) return res.status(404).json({ message: 'Not found' });
  
  const idx = db.data.rndProducts.findIndex(p => p.id === id);
  if (idx === -1) return res.status(404).json({ message: 'Product not found' });
  
  db.data.rndProducts.splice(idx, 1);
  await db.write();
  res.json({ success: true });
};

// GET /api/rnd/entries?startDate=&endDate=&includeDeleted=true
export const getRndEntries = (req, res) => {
  const { startDate, endDate, includeDeleted } = req.query;
  let entries = [...(db.data.rndEntries || [])];

  // By default exclude soft-deleted entries
  if (includeDeleted !== 'true') {
    entries = entries.filter(e => !e.isDeleted);
  }

  if (startDate && endDate) {
    entries = entries.filter(e => {
      const d = (e.submittedAt || '').split('T')[0];
      return d >= startDate && d <= endDate;
    });
  }

  entries.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  res.json(entries);
};

// POST /api/rnd/entries
export const createRndEntry = async (req, res) => {
  let entriesToCreate = req.body;
  if (!Array.isArray(entriesToCreate)) {
    entriesToCreate = [entriesToCreate];
  }

  if (!db.data.rndEntries) db.data.rndEntries = [];
  const createdEntries = [];

  for (const item of entriesToCreate) {
    const { code, description, category, submittedBy, pickNumber, acceptReject, receivedCount, remark } = item;
    if (!code) continue;

    const newEntry = {
      id: randomUUID(),
      code,
      description,
      category,
      pickNumber: pickNumber || '',
      acceptReject: acceptReject || 'Accept',
      receivedCount: receivedCount ? parseInt(receivedCount, 10) : 0,
      remark: remark || '',
      submittedBy: submittedBy || 'Unknown',
      submittedAt: new Date().toISOString(),
      isDeleted: false,
    };

    db.data.rndEntries.push(newEntry);
    createdEntries.push(newEntry);

    if (!db.data.auditLogs) db.data.auditLogs = [];
    db.data.auditLogs.unshift({
      id: randomUUID(),
      action: `R&D Entry created: ${code} (${acceptReject || 'Accept'}) by ${submittedBy || 'Unknown'}`,
      user: submittedBy || 'Unknown',
      time: new Date().toISOString(),
    });
  }

  await db.write();
  res.json({ success: true, entries: createdEntries });
};

// PUT /api/rnd/entries/:id
export const updateRndEntry = async (req, res) => {
  const { id } = req.params;
  const { pickNumber, acceptReject, receivedCount, remark, updatedBy } = req.body;

  if (!db.data.rndEntries) return res.status(404).json({ message: 'Not found' });
  const entry = db.data.rndEntries.find(e => e.id === id);
  if (!entry) return res.status(404).json({ message: 'Entry not found' });
  if (entry.isDeleted) return res.status(400).json({ message: 'Cannot edit a deleted entry' });

  if (pickNumber !== undefined) entry.pickNumber = pickNumber;
  if (acceptReject !== undefined) entry.acceptReject = acceptReject;
  if (receivedCount !== undefined) entry.receivedCount = parseInt(receivedCount, 10) || 0;
  if (remark !== undefined) entry.remark = remark;
  entry.updatedAt = new Date().toISOString();
  entry.updatedBy = updatedBy || 'Admin';

  if (!db.data.auditLogs) db.data.auditLogs = [];
  db.data.auditLogs.unshift({
    id: randomUUID(),
    action: `R&D Entry edited: ${entry.code} — Pick#: ${entry.pickNumber}, Status: ${entry.acceptReject}`,
    user: updatedBy || 'Admin',
    time: new Date().toISOString(),
  });

  await db.write();
  res.json({ success: true, entry });
};

// DELETE /api/rnd/entries/:id  (soft delete)
export const deleteRndEntry = async (req, res) => {
  const { id } = req.params;
  const { deletedBy } = req.body;

  if (!db.data.rndEntries) return res.status(404).json({ message: 'Not found' });
  const entry = db.data.rndEntries.find(e => e.id === id);
  if (!entry) return res.status(404).json({ message: 'Entry not found' });

  entry.isDeleted = true;
  entry.deletedBy = deletedBy || 'Admin';
  entry.deletedAt = new Date().toISOString();

  if (!db.data.auditLogs) db.data.auditLogs = [];
  db.data.auditLogs.unshift({
    id: randomUUID(),
    action: `R&D Entry deleted: ${entry.code} (by ${entry.deletedBy})`,
    user: deletedBy || 'Admin',
    time: new Date().toISOString(),
  });

  await db.write();
  res.json({ success: true });
};

// GET /api/rnd/export?startDate=&endDate=&includeDeleted=
export const exportRndExcel = (req, res) => {
  const { startDate, endDate, includeDeleted } = req.query;
  let entries = [...(db.data.rndEntries || [])];

  if (includeDeleted !== 'true') {
    entries = entries.filter(e => !e.isDeleted);
  }

  if (startDate && endDate) {
    entries = entries.filter(e => {
      const d = (e.submittedAt || '').split('T')[0];
      return d >= startDate && d <= endDate;
    });
  }

  entries.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

  const rows = entries.map(e => ({
    'ID': e.id,
    'Product Code': e.code,
    'Description': e.description,
    'Category': e.category,
    'Pick Number': e.pickNumber || '',
    'Status': e.acceptReject || '',
    'Received': e.receivedCount || 0,
    'Remark': e.remark || '',
    'Submitted By': e.submittedBy,
    'Submitted At': e.submittedAt ? new Date(e.submittedAt).toLocaleString() : '—',
    'Updated By': e.updatedBy || '',
    'Updated At': e.updatedAt ? new Date(e.updatedAt).toLocaleString() : '',
    'Deleted': e.isDeleted ? `Yes (by ${e.deletedBy})` : 'No',
    'Deleted At': e.deletedAt ? new Date(e.deletedAt).toLocaleString() : '',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'R&D Entries');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename="rnd_report.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
};

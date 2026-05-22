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
    createdAt: new Date().toISOString()
  };

  db.data.rndProducts.push(newProduct);
  await db.write();

  res.json({ success: true, product: newProduct });
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

// GET /api/rnd/entries
export const getRndEntries = (req, res) => {
  res.json(db.data.rndEntries || []);
};

// POST /api/rnd/entries
export const createRndEntry = async (req, res) => {
  const { code, description, category, submittedBy } = req.body;
  if (!code) {
    return res.status(400).json({ message: 'Product code is required' });
  }

  if (!db.data.rndEntries) db.data.rndEntries = [];

  const newEntry = {
    id: randomUUID(),
    code,
    description,
    category,
    submittedBy: submittedBy || 'Unknown',
    submittedAt: new Date().toISOString()
  };

  db.data.rndEntries.push(newEntry);
  await db.write();

  res.json({ success: true, entry: newEntry });
};

// GET /api/rnd/export?startDate=&endDate=
export const exportRndExcel = (req, res) => {
  const { startDate, endDate } = req.query;
  let entries = [...(db.data.rndEntries || [])];

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
    'Submitted By': e.submittedBy,
    'Submitted At': e.submittedAt ? new Date(e.submittedAt).toLocaleString() : '—',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'R&D Entries');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename="rnd_report.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
};

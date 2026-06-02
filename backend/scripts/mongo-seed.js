/**
 * mongo-seed.js  ─  One-time migration from LowDB (db.json) → MongoDB Atlas
 *
 * Usage (from the project root or backend folder):
 *   node backend/scripts/mongo-seed.js
 *
 * The script is SAFE to re-run — it uses insertMany with ordered:false so existing
 * documents (matched by the string `id` field) simply produce a duplicate-key error
 * that is caught and ignored.
 *
 * Requires MONGO_URI to be set. It reads it from backend/.env automatically.
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ─── Load legacy data ──────────────────────────────────────────────────────────
const dbPath = path.join(__dirname, '..', 'data', 'db.json');
const raw    = JSON.parse(readFileSync(dbPath, 'utf8'));

// ─── Mongoose models (inline — avoids circular imports) ────────────────────────
const { Schema, model } = mongoose;

const UserModel = model('User', new Schema({
  id: { type: String, unique: true },
  employeeId: String, password: String, role: String,
  fullName: String, status: String, createdAt: String, lastLogin: String,
}, { strict: false }));

const ConfigModel = model('Config', new Schema({
  fixedBattery: String, fixedPCBA: String, autoMode: Boolean, accessRules: [String],
}, { strict: false }));

const ComponentModel = model('Component', new Schema({
  id: String, category: String, name: String, status: String, updatedAt: String,
}, { strict: false }));

const MOEntryModel = model('MOEntry', new Schema({
  id: { type: String, unique: true },
}, { strict: false }));

const ScrapEntryModel = model('ScrapEntry', new Schema({
  id: { type: String, unique: true },
}, { strict: false }));

const ReworkEntryModel = model('ReworkEntry', new Schema({
  id: { type: String, unique: true },
}, { strict: false }));

const ReturnEntryModel = model('ReturnEntry', new Schema({
  id: { type: String, unique: true },
}, { strict: false }));

const AuditLogModel = model('AuditLog', new Schema({
  id: { type: String, unique: true },
}, { strict: false }));

const RndProductModel = model('RndProduct', new Schema({
  id: { type: String, unique: true },
}, { strict: false }));

const RndEntryModel = model('RndEntry', new Schema({
  id: { type: String, unique: true },
}, { strict: false }));

// ─── Helpers ───────────────────────────────────────────────────────────────────
const insertSafe = async (Model, docs, label) => {
  if (!docs || docs.length === 0) {
    console.log(`  ⚠️  ${label}: no records found, skipping.`);
    return;
  }
  try {
    const result = await Model.insertMany(docs, { ordered: false });
    console.log(`  ✅  ${label}: inserted ${result.length} / ${docs.length}`);
  } catch (err) {
    // E11000 = duplicate key — safe to ignore when re-running
    const inserted = err.insertedDocs ? err.insertedDocs.length : 0;
    const dupes    = (err.writeErrors || []).length;
    console.log(`  ✅  ${label}: inserted ${inserted}, skipped ${dupes} duplicates`);
  }
};

// ─── Main seed logic ───────────────────────────────────────────────────────────
const seed = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('❌  MONGO_URI is not set. Add it to backend/.env and try again.');
    process.exit(1);
  }

  console.log('\n🌱  Connecting to MongoDB Atlas…');
  await mongoose.connect(uri);
  console.log('✅  Connected!\n');

  // 1. Users
  await insertSafe(UserModel, raw.users || [], 'Users');

  // 2. Config (single document)
  if (raw.config) {
    const exists = await ConfigModel.findOne();
    if (!exists) {
      await ConfigModel.create(raw.config);
      console.log('  ✅  Config: inserted');
    } else {
      console.log('  ⚠️  Config: already exists, skipping');
    }
  }

  // 3. Components — flatten the old shape:
  //    { batteries: [{id,name,status,updatedAt}], shells: ["shellName", ...], ... }
  //    → [{ id, category, name, status, updatedAt }]
  const compDocs = [];
  const validCategories = ['batteries', 'pcbas', 'coils', 'lenses', 'shells'];
  for (const cat of validCategories) {
    const list = raw.components?.[cat] || [];
    for (const item of list) {
      if (typeof item === 'string') {
        // shells are stored as plain strings in LowDB
        compDocs.push({ id: randomUUID().split('-')[0], category: cat, name: item, status: 'Active', updatedAt: '' });
      } else {
        compDocs.push({ id: item.id || randomUUID().split('-')[0], category: cat, name: item.name, status: item.status || 'Active', updatedAt: item.updatedAt || '' });
      }
    }
  }
  await insertSafe(ComponentModel, compDocs, 'Components');

  // 4. MO Entries
  await insertSafe(MOEntryModel, raw.moEntries || [], 'MO Entries');

  // 5. Scrap Entries
  await insertSafe(ScrapEntryModel, raw.scrapEntries || [], 'Scrap Entries');

  // 6. Rework Entries
  await insertSafe(ReworkEntryModel, raw.reworkEntries || [], 'Rework Entries');

  // 7. Return Entries
  await insertSafe(ReturnEntryModel, raw.returnEntries || [], 'Return Entries');

  // 8. Audit Logs — old logs use "time" key; new schema uses "timestamp"
  const auditDocs = (raw.auditLogs || []).map(l => ({
    id:        l.id        || randomUUID(),
    action:    l.action    || '',
    user:      l.user      || '',
    timestamp: l.timestamp || l.time || new Date().toISOString(),
    details:   l.details   || '',
  }));
  await insertSafe(AuditLogModel, auditDocs, 'Audit Logs');

  // 9. R&D Products
  await insertSafe(RndProductModel, raw.rndProducts || [], 'R&D Products');

  // 10. R&D Entries
  await insertSafe(RndEntryModel, raw.rndEntries || [], 'R&D Entries');

  console.log('\n🎉  Seed complete! All data has been imported to MongoDB.\n');
  await mongoose.disconnect();
};

seed().catch(err => {
  console.error('❌  Seed failed:', err);
  process.exit(1);
});

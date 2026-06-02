import 'dotenv/config';
import { connectDB } from './db.js';
import express from 'express';
import cors from 'cors';
import { login } from './routes/auth.js';
import { getMOs, createMO, updateMO, deleteMO, parseSKUPreview } from './routes/mos.js';
import { getConfig, updateConfig, getUsers, createUser, updateUser, deleteUser, getComponents, manageComponents, getAuditLogs, deleteAuditLogs, backupDatabase, handleDbAction, getTrash, handleTrashAction, wipeAllData, runWipFixer } from './routes/admin.js';
import { getStats, getReport } from './routes/stats.js';
import { downloadWipExcel } from './routes/wipReport.js';
import { getScrapEntries, createScrapEntry, updateScrapEntry, deleteScrapEntry, exportScrapExcel } from './routes/scrap.js';
import { getReturnEntries, createReturnEntry, deleteReturnEntry, replenishReturnEntry } from './routes/returns.js';
import { getReworkEntries, createReworkEntry, updateReworkEntry, deleteReworkEntry, exportReworkExcel } from './routes/rework.js';
import { getRndProducts, createRndProduct, updateRndProduct, deleteRndProduct, getRndEntries, createRndEntry, updateRndEntry, deleteRndEntry, exportRndExcel } from './routes/rnd.js';
import { visionUpload, extractFromImage } from './routes/vision.js';
import { mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists
try { mkdirSync('./data', { recursive: true }); } catch {}

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: true, // Always reflect the request origin to fix Vercel dynamic URLs permanently
  credentials: true
}));
app.use(express.json());

// --- Auth ---
app.post('/api/auth/login', login);

// --- MOs ---
app.get('/api/mos', getMOs);
app.post('/api/mos', createMO);
app.put('/api/mos/:id', updateMO);
app.delete('/api/mos/:id', deleteMO);
app.post('/api/mos/parse-sku', parseSKUPreview);

// --- Scrap ---
app.get('/api/scrap', getScrapEntries);
app.post('/api/scrap', createScrapEntry);
app.put('/api/scrap/:id', updateScrapEntry);
app.delete('/api/scrap/:id', deleteScrapEntry);
app.get('/api/scrap/export', exportScrapExcel);

// --- Returns ---
app.get('/api/returns', getReturnEntries);
app.post('/api/returns', createReturnEntry);
app.put('/api/returns/:id/replenish', replenishReturnEntry);
app.delete('/api/returns/:id', deleteReturnEntry);

// --- Rework ---
app.get('/api/rework', getReworkEntries);
app.post('/api/rework', createReworkEntry);
app.put('/api/rework/:id', updateReworkEntry);
app.delete('/api/rework/:id', deleteReworkEntry);
app.get('/api/rework/export', exportReworkExcel);

// --- R&D ---
app.get('/api/rnd/products', getRndProducts);
app.post('/api/rnd/products', createRndProduct);
app.put('/api/rnd/products/:id', updateRndProduct);
app.delete('/api/rnd/products/:id', deleteRndProduct);
app.get('/api/rnd/entries', getRndEntries);
app.post('/api/rnd/entries', createRndEntry);
app.put('/api/rnd/entries/:id', updateRndEntry);
app.delete('/api/rnd/entries/:id', deleteRndEntry);
app.get('/api/rnd/export', exportRndExcel);

// --- Admin: Config ---
app.get('/api/admin/config', getConfig);
app.post('/api/admin/config', updateConfig);

// --- Admin: Users ---
app.get('/api/admin/users', getUsers);
app.post('/api/admin/users', createUser);
app.put('/api/admin/users/:id', updateUser);
app.delete('/api/admin/users/:id', deleteUser);

// --- Admin: Components ---
app.get('/api/admin/components', getComponents);
app.post('/api/admin/components/manage', manageComponents);

// --- Admin: Audit ---
app.get('/api/admin/audit', getAuditLogs);
app.delete('/api/admin/audit', deleteAuditLogs);

// --- Admin: Backup ---
app.get('/api/admin/backup', backupDatabase);

// --- Admin: DB Manager & Trash ---
app.post('/api/admin/db/action', handleDbAction);
app.get('/api/admin/trash', getTrash);
app.post('/api/admin/trash/action', handleTrashAction);
app.post('/api/admin/wipe-all', wipeAllData);
app.get('/api/admin/wip-fixer', runWipFixer);

// --- Stats ---
app.get('/api/stats', getStats);
app.get('/api/stats/report', getReport);
app.get('/api/stats/wip-excel', downloadWipExcel);

// --- Vision (Image Scan → Cohere AI) ---
app.post('/api/vision/extract', visionUpload, extractFromImage);

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));

// SPA catch-all — serve index.html for any non-API route
app.use((req, res, next) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
  } else {
    next();
  }
});

// Connect to MongoDB first, then start the HTTP server
connectDB().then(() => {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n✅ MfgPlan Server running at http://0.0.0.0:${PORT}\n`);
  });

  server.on('error', (err) => {
    console.error('❌ Server error:', err);
  });
});



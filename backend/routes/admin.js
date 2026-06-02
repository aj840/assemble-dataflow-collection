import { randomUUID } from '../db.js';
import { User, Config, Component } from '../models/Core.js';
import { MOEntry } from '../models/MO.js';
import { ScrapEntry, ReworkEntry, ReturnEntry, AuditLog, TrashEntry } from '../models/Entries.js';
import { inLocalPeriod } from '../utils/dates.js';
import mongoose from 'mongoose';

// GET /api/admin/config
export const getConfig = async (req, res) => {
  try {
    let config = await Config.findOne().lean();
    if (!config) config = { fixedBattery: '', fixedPCBA: '', autoMode: false, accessRules: [] };
    res.json(config);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

// POST /api/admin/config
export const updateConfig = async (req, res) => {
  try {
    const { fixedBattery, fixedPCBA, autoMode } = req.body;
    let config = await Config.findOne();
    if (!config) config = new Config({});
    if (fixedBattery !== undefined) config.fixedBattery = fixedBattery;
    if (fixedPCBA !== undefined) config.fixedPCBA = fixedPCBA;
    if (autoMode !== undefined) config.autoMode = autoMode;
    await config.save();
    const modeLabel = config.autoMode ? 'AUTO-BATTERY MODE' : 'FIXED MODE';
    await AuditLog.create({ id: randomUUID(), action: `Config updated: Battery=${config.fixedBattery}, PCBA=${config.fixedPCBA}, Mode=${modeLabel}`, user: 'Admin', timestamp: new Date().toISOString() });
    res.json({ success: true, config });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

// GET /api/admin/users
export const getUsers = async (req, res) => {
  try {
    const users = await User.find({}, '-password').lean();
    res.json(users);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

// POST /api/admin/users
export const createUser = async (req, res) => {
  try {
    const { employeeId, password, role, fullName } = req.body;
    if (!employeeId || !password) return res.status(400).json({ message: 'Employee ID and password are required' });
    const exists = await User.findOne({ employeeId });
    if (exists) return res.status(409).json({ message: 'Employee ID already exists' });
    const newUser = await User.create({ id: randomUUID(), employeeId, password, role: role || 'user', fullName: fullName || employeeId, status: 'Active', createdAt: new Date().toISOString(), lastLogin: null });
    await AuditLog.create({ id: randomUUID(), action: `New user created: ${employeeId} (${role || 'user'})`, user: 'Admin', timestamp: new Date().toISOString() });
    const { password: _, ...safeUser } = newUser.toObject();
    res.json({ success: true, user: safeUser });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

// PUT /api/admin/users/:id
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, role, status, password } = req.body;
    const user = await User.findOne({ id });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (fullName) user.fullName = fullName;
    if (role) user.role = role;
    if (status) user.status = status;
    if (password) user.password = password;
    await user.save();
    const { password: _, ...safeUser } = user.toObject();
    res.json({ success: true, user: safeUser });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

// DELETE /api/admin/users/:id
export const deleteUser = async (req, res) => {
  try {
    const result = await User.deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ message: 'User not found' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

// GET /api/admin/components
export const getComponents = async (req, res) => {
  try {
    const allComps = await Component.find({}).lean();
    const result = { batteries: [], pcbas: [], coils: [], shells: [], lenses: [] };
    for (const c of allComps) {
      if (c.category === 'shells') result.shells.push(c.name);
      else if (result[c.category]) result[c.category].push({ id: c.id, name: c.name, status: c.status, updatedAt: c.updatedAt });
    }
    res.json(result);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

// POST /api/admin/components/manage
export const manageComponents = async (req, res) => {
  try {
    const { category, action, id, name, status } = req.body;
    const validCategories = ['batteries', 'pcbas', 'coils', 'lenses', 'shells'];
    if (!validCategories.includes(category)) return res.status(400).json({ message: 'Invalid category' });
    const now = new Date().toISOString().split('T')[0];

    if (action === 'add') {
      await Component.create({ id: randomUUID().split('-')[0], category, name, status: status || 'Active', updatedAt: now });
    } else if (action === 'edit') {
      const comp = await Component.findOne({ id });
      if (comp) { if (name) comp.name = name; if (status) comp.status = status; comp.updatedAt = now; await comp.save(); }
    } else if (action === 'delete') {
      await Component.deleteOne({ id });
    }

    await AuditLog.create({ id: randomUUID(), action: `Component ${action}: [${category}] ${name || id}`, user: 'Admin', timestamp: new Date().toISOString() });
    const updatedComps = await Component.find({}).lean();
    const result = { batteries: [], pcbas: [], coils: [], shells: [], lenses: [] };
    for (const c of updatedComps) {
      if (c.category === 'shells') result.shells.push(c.name);
      else if (result[c.category]) result[c.category].push({ id: c.id, name: c.name, status: c.status, updatedAt: c.updatedAt });
    }
    res.json({ success: true, components: result });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
};

// GET /api/admin/audit
export const getAuditLogs = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let logs = await AuditLog.find({}).sort({ timestamp: -1 }).limit(500).lean();
    if (startDate && endDate) logs = logs.filter(l => inLocalPeriod(l.timestamp, startDate, endDate));
    res.json(logs);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

// DELETE /api/admin/audit
export const deleteAuditLogs = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ message: 'Start and end dates are required' });
    const all = await AuditLog.find({}).lean();
    const toDelete = all.filter(l => inLocalPeriod(l.timestamp, startDate, endDate)).map(l => l.id);
    await AuditLog.deleteMany({ id: { $in: toDelete } });
    res.json({ success: true, deletedCount: toDelete.length });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

// GET /api/admin/backup — export full data as JSON
export const backupDatabase = async (req, res) => {
  try {
    const [users, config, components, moEntries, scrapEntries, reworkEntries, returnEntries, auditLogs] = await Promise.all([
      User.find({}).lean(), Config.findOne().lean(), Component.find({}).lean(),
      MOEntry.find({}).lean(), ScrapEntry.find({}).lean(), ReworkEntry.find({}).lean(),
      ReturnEntry.find({}).lean(), AuditLog.find({}).lean()
    ]);
    const filename = `MfgPlan_Backup_${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({ users, config, components, moEntries, scrapEntries, reworkEntries, returnEntries, auditLogs }, null, 2));
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

// POST /api/admin/db/action
export const handleDbAction = async (req, res) => {
  try {
    const { action, type, ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: 'No IDs provided' });

    const ModelMap = { mo: MOEntry, scrap: ScrapEntry, return: ReturnEntry, rework: ReworkEntry };
    const Model = ModelMap[type];
    if (!Model) return res.status(400).json({ message: 'Invalid data type' });

    if (action === 'trash') {
      const items = await Model.find({ id: { $in: ids } }).lean();
      await TrashEntry.insertMany(items.map(item => ({ id: randomUUID(), originalId: item.id, type, data: item, deletedAt: new Date().toISOString() })));
    }

    await Model.deleteMany({ id: { $in: ids } });
    await AuditLog.create({ id: randomUUID(), action: `Bulk ${action} applied to ${ids.length} ${type} entries`, user: req.body.submittedBy || 'Admin', timestamp: new Date().toISOString() });
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
};

// GET /api/admin/trash
export const getTrash = async (req, res) => {
  try { res.json(await TrashEntry.find({}).lean()); }
  catch (err) { res.status(500).json({ message: 'Server error' }); }
};

// POST /api/admin/trash/action
export const handleTrashAction = async (req, res) => {
  try {
    const { action, ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: 'No IDs provided' });
    const ModelMap = { mo: MOEntry, scrap: ScrapEntry, return: ReturnEntry, rework: ReworkEntry };

    if (action === 'restore') {
      const toRestore = await TrashEntry.find({ id: { $in: ids } }).lean();
      for (const item of toRestore) {
        const Model = ModelMap[item.type];
        if (Model) {
          const { _id, ...data } = item.data;
          await Model.create(data).catch(() => {}); // ignore duplicate key on restore
        }
      }
    }

    await TrashEntry.deleteMany({ id: { $in: ids } });
    await AuditLog.create({ id: randomUUID(), action: `Bulk ${action} applied to ${ids.length} trashed items`, user: req.body.submittedBy || 'Admin', timestamp: new Date().toISOString() });
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
};

// POST /api/admin/wipe-all
export const wipeAllData = async (req, res) => {
  try {
    const { confirm } = req.body;
    if (confirm !== 'WIPE_ALL_CONFIRMED') return res.status(400).json({ message: 'Missing confirmation token' });
    const [moCnt, scrapCnt, reworkCnt, returnCnt, trashCnt] = await Promise.all([
      MOEntry.countDocuments(), ScrapEntry.countDocuments(), ReworkEntry.countDocuments(), ReturnEntry.countDocuments(), TrashEntry.countDocuments()
    ]);
    await Promise.all([MOEntry.deleteMany({}), ScrapEntry.deleteMany({}), ReworkEntry.deleteMany({}), ReturnEntry.deleteMany({}), TrashEntry.deleteMany({})]);
    await AuditLog.create({ id: randomUUID(), action: `⚠️ FULL DATABASE WIPE: Deleted ${moCnt} MOs, ${scrapCnt} Scrap, ${reworkCnt} Rework, ${returnCnt} Returns, ${trashCnt} Trash`, user: req.body.submittedBy || 'Admin', timestamp: new Date().toISOString() });
    res.json({ success: true, deleted: { mo: moCnt, scrap: scrapCnt, rework: reworkCnt, returns: returnCnt, trash: trashCnt } });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

// GET /api/admin/wip-fixer
export const runWipFixer = async (req, res) => {
  try {
    const mos = await MOEntry.find({ wipFixed: { $ne: true } });
    let fixedMOs = 0;
    for (const mo of mos) {
      const moReturns = await ReturnEntry.find({ moId: mo.id }).lean();
      if (!moReturns.length) { mo.wipFixed = true; await mo.save(); continue; }
      let missingQty = 0, missingBattery = 0, missingPCBA = 0, missingCoil = 0, missingShell = 0, missingLens = 0;
      for (const r of moReturns) {
        if (r.isFullMO) { missingQty += r.componentQty || 0; missingBattery += r.componentQty || 0; missingPCBA += r.componentQty || 0; missingCoil += r.componentQty || 0; missingShell += r.componentQty || 0; missingLens += r.componentQty || 0; }
        else if (r.status !== 'Replenished') {
          if (r.component === 'Battery') missingBattery += r.componentQty || 0;
          if (r.component === 'PCBA') missingPCBA += r.componentQty || 0;
          if (r.component === 'Coil') missingCoil += r.componentQty || 0;
          if (r.component === 'Shell') missingShell += r.componentQty || 0;
          if (r.component === 'Lens') missingLens += r.componentQty || 0;
        }
      }
      if (missingQty > 0) mo.qty += missingQty;
      if (missingBattery > 0) mo.batteryQty += missingBattery;
      if (missingPCBA > 0) mo.pcbaQty += missingPCBA;
      if (missingCoil > 0) mo.coilQty += missingCoil;
      if (missingShell > 0) mo.shellQty += missingShell;
      if (missingLens > 0) mo.lensQty += missingLens;
      mo.wipFixed = true; await mo.save(); fixedMOs++;
    }
    if (fixedMOs > 0) await AuditLog.create({ id: randomUUID(), action: `WIP Fixer Script ran and repaired ${fixedMOs} MOs.`, user: 'SystemAdmin', timestamp: new Date().toISOString() });
    res.json({ success: true, message: `WIP Fixer completed. Repaired ${fixedMOs} MOs.` });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

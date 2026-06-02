import { randomUUID } from '../db.js';
import { MOEntry } from '../models/MO.js';
import { ScrapEntry, ReworkEntry, ReturnEntry, AuditLog } from '../models/Entries.js';
import { Config, Component } from '../models/Core.js';
import { isSameLocalDay, inLocalPeriod } from '../utils/dates.js';

// Pro Ring battery size rules
const getProRingBattery = (num) => {
  const n = parseInt(num, 10);
  if (n === 5) return '24mah battery';
  if (n === 6) return '32mah battery';
  return '39mah battery';
};

// SKU Parser Engine
const parseSKU = (sku, refer, config) => {
  const skuUpper = (sku || '').toUpperCase().trim();
  const numMatch = skuUpper.match(/\d+$/);
  const num = numMatch ? numMatch[0] : '';
  const ref = (refer || '').toLowerCase().trim();
  const is02mm = ['o', '0'].includes(ref);
  const prefixMatch = skuUpper.match(/^[A-Z]+/);
  const letterPrefix = prefixMatch ? prefixMatch[0] : '';

  if (letterPrefix === 'PR') {
    return { battery: getProRingBattery(num), pcba: 'Ring Pro 3.5 PCBA', coil: 'N/A', shell: num ? `Shell S${num}` : 'N/A', lens: num ? `PC LENS S${num}` : 'N/A', isProRing: true };
  }

  let finalShell = skuUpper;
  if (letterPrefix === 'LR') finalShell = `RARE ROSE GOLD SHELL RS${num}`;
  else if (letterPrefix === 'LP') finalShell = `RARE PLATINUM SHELL S${num}`;
  else if (letterPrefix === 'LG') finalShell = `RARE YELLOW GOLD SHELL LG${num}`;
  else if (letterPrefix === 'DS') finalShell = `DIESEL SILVER SHELL S${num}`;
  else if (letterPrefix === 'DB') finalShell = `DIESEL BLACK SHELL S${num}`;
  else if (letterPrefix === 'BRG') finalShell = `Brushed Rose gold 0.2MM - SIZE ${num}`;
  else { finalShell = is02mm ? (num ? `0.2mm ${skuUpper}` : skuUpper) : skuUpper; }

  let battery = config?.fixedBattery || '32mah battery';
  if (config?.autoMode) {
    const endNum = num ? parseInt(num, 10) : 0;
    battery = (endNum >= 5 && endNum <= 8) ? '24mah battery' : '32mah battery';
  }
  const isRare = ['LG', 'LR', 'LP'].includes(letterPrefix);
  return { battery, pcba: config?.fixedPCBA || '', coil: num ? (isRare ? `Rare Ring RX Coil-${num}` : `Ring RX Coil-${num}`) : 'N/A', shell: finalShell, lens: 'N/A', isProRing: false };
};

// GET /api/mos
export const getMOs = async (req, res) => {
  try {
    const { date, status, startDate, endDate, moNumber, planDate, planDateStart, planDateEnd } = req.query;
    const query = {};

    if (status === 'all') {
      // no filter
    } else if (status) {
      query.status = status;
    } else if (!moNumber) {
      query.status = { $ne: 'Returned' };
    }

    if (moNumber) {
      query.moNumber = { $regex: moNumber, $options: 'i' };
    }
    if (date) {
      // filter by date handled in-memory after fetch since isSameLocalDay is a custom helper
    }
    if (startDate && endDate) {
      query.createdAt = { $gte: startDate, $lte: endDate };
    }
    if (planDate) query.planDate = planDate;
    if (planDateStart && planDateEnd) query.planDate = { $gte: planDateStart, $lte: planDateEnd };
    else if (planDateStart) query.planDate = { $gte: planDateStart };
    else if (planDateEnd) query.planDate = { $lte: planDateEnd };

    let entries = await MOEntry.find(query).lean();

    if (date) entries = entries.filter(e => isSameLocalDay(e.createdAt, date));
    entries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(entries);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/mos
export const createMO = async (req, res) => {
  try {
    const { refer, moNumber, sku, qty, od, batteryQty, pcbaQty, coilQty, shellQty, lensQty, submittedBy, batchId, planDate } = req.body;
    if (!sku || !qty) return res.status(400).json({ message: 'SKU and QTY are required' });

    if (moNumber && await MOEntry.findOne({ moNumber })) {
      return res.status(409).json({ message: `MO Number '${moNumber}' is already taken.` });
    }

    const configDoc = await Config.findOne().lean();
    const derived = parseSKU(sku, refer || 'o', configDoc);
    const isProRing = derived.isProRing === true;

    const bQty = batteryQty !== undefined && batteryQty !== '' ? parseInt(batteryQty) : parseInt(qty);
    const pQty = pcbaQty    !== undefined && pcbaQty    !== '' ? parseInt(pcbaQty)    : parseInt(qty);
    const cQty = isProRing ? 0 : (coilQty !== undefined && coilQty !== '' ? parseInt(coilQty) : parseInt(qty));
    const sQty = shellQty   !== undefined && shellQty   !== '' ? parseInt(shellQty)   : parseInt(qty);
    const lQty = isProRing ? (lensQty !== undefined && lensQty !== '' ? parseInt(lensQty) : parseInt(qty)) : 0;

    const entry = await MOEntry.create({
      id: randomUUID(), refer: refer || '', moNumber: moNumber || '', sku: sku.toUpperCase(),
      qty: parseInt(qty), od: od || '', planDate: planDate || '',
      batteryQty: bQty, pcbaQty: pQty, coilQty: cQty, shellQty: sQty, lensQty: lQty,
      battery: derived.battery, pcba: derived.pcba, coil: derived.coil, shell: derived.shell, lens: derived.lens,
      isProRing, status: 'Pending', completedQty: 0,
      batteryComp: 0, pcbaComp: 0, coilComp: 0, shellComp: 0, lensComp: 0,
      submittedBy: submittedBy || 'Unknown', createdAt: new Date().toISOString(), completedAt: null
    });

    // Auto-register components
    const ensureComp = async (category, name) => {
      if (!name || name === 'N/A' || name === 'Unknown') return;
      const exists = await Component.findOne({ category, name });
      if (!exists) await Component.create({ id: randomUUID(), category, name, status: 'Active', updatedAt: new Date().toISOString().split('T')[0] });
    };
    await Promise.all([
      ensureComp('batteries', derived.battery), ensureComp('pcbas', derived.pcba),
      ensureComp('coils', derived.coil), ensureComp('shells', derived.shell), ensureComp('lenses', derived.lens)
    ]);

    await AuditLog.create({ id: randomUUID(), action: `New MO created: ${moNumber} (SKU: ${sku})`, user: submittedBy, timestamp: new Date().toISOString() });
    res.json({ success: true, entry });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/mos/:id
export const updateMO = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, completedQty, batteryComp, pcbaComp, coilComp, shellComp, lensComp, batteryQty, pcbaQty, coilQty, shellQty, lensQty, planDate, refer, od, pcba } = req.body;

    const entry = await MOEntry.findOne({ id });
    if (!entry) return res.status(404).json({ message: 'MO not found' });

    if (refer !== undefined && refer !== entry.refer) {
      const configDoc = await Config.findOne().lean();
      const rederived = parseSKU(entry.sku, refer, configDoc);
      entry.refer = refer; entry.battery = rederived.battery; entry.pcba = rederived.pcba;
      entry.coil = rederived.coil; entry.shell = rederived.shell; entry.lens = rederived.lens;
      entry.isProRing = rederived.isProRing;
      await AuditLog.create({ id: randomUUID(), action: `OD changed: MO ${entry.moNumber} → shell: ${rederived.shell}`, user: req.body.submittedBy || 'Admin', timestamp: new Date().toISOString() });
    }
    if (od !== undefined) entry.od = od;
    if (pcba !== undefined && pcba !== entry.pcba) {
      entry.pcba = pcba;
      await AuditLog.create({ id: randomUUID(), action: `PCBA changed: MO ${entry.moNumber} → ${pcba}`, user: req.body.submittedBy || 'Admin', timestamp: new Date().toISOString() });
    }
    if (status) {
      entry.status = status;
      if (status === 'Completed' && !entry.completedAt) entry.completedAt = new Date().toISOString();
      else if (status === 'Pending') entry.completedAt = null;
    }
    if (completedQty !== undefined) entry.completedQty = parseInt(completedQty);
    if (planDate !== undefined) entry.planDate = planDate;
    if (batteryQty !== undefined && batteryQty !== '') entry.batteryQty = parseInt(batteryQty);
    if (pcbaQty    !== undefined && pcbaQty    !== '') entry.pcbaQty    = parseInt(pcbaQty);
    if (coilQty    !== undefined && coilQty    !== '') entry.coilQty    = parseInt(coilQty);
    if (shellQty   !== undefined && shellQty   !== '') entry.shellQty   = parseInt(shellQty);
    if (lensQty    !== undefined && lensQty    !== '') entry.lensQty    = parseInt(lensQty);
    if (batteryComp !== undefined) entry.batteryComp = parseInt(batteryComp);
    if (pcbaComp    !== undefined) entry.pcbaComp    = parseInt(pcbaComp);
    if (coilComp    !== undefined) entry.coilComp    = parseInt(coilComp);
    if (shellComp   !== undefined) entry.shellComp   = parseInt(shellComp);
    if (lensComp    !== undefined) entry.lensComp    = parseInt(lensComp);

    await entry.save();
    res.json({ success: true, entry });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/mos/:id
export const deleteMO = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await MOEntry.deleteOne({ id });
    if (result.deletedCount === 0) return res.status(404).json({ message: 'MO not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/mos/parse-sku
export const parseSKUPreview = async (req, res) => {
  try {
    const { sku, refer } = req.body;
    if (!sku) return res.status(400).json({ message: 'SKU required' });
    const configDoc = await Config.findOne().lean();
    res.json(parseSKU(sku, refer || 'o', configDoc));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

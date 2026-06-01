import db, { randomUUID } from '../db.js';
import { isSameLocalDay, inLocalPeriod } from '../utils/dates.js';

// Pro Ring battery size rules: size5=24mah, size6=32mah, size7-14=39mah
const getProRingBattery = (num) => {
  const n = parseInt(num, 10);
  if (n === 5) return '24mah battery';
  if (n === 6) return '32mah battery';
  return '39mah battery'; // sizes 7-14
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

  // ── Pro Ring (PR) ────────────────────────────────────────────────────────────
  if (letterPrefix === 'PR') {
    return {
      battery: getProRingBattery(num),
      pcba:    'Ring Pro 3.5 PCBA',
      coil:    'N/A',
      shell:   num ? `Shell S${num}` : 'N/A',
      lens:    num ? `PC LENS S${num}` : 'N/A',
      isProRing: true,
    };
  }

  // ── Standard SKU shell derivation ─────────────────────────────────────────
  let finalShell = skuUpper; // Default fallback

  if (letterPrefix === 'LR') finalShell = `RARE ROSE GOLD SHELL RS${num}`;
  else if (letterPrefix === 'LP') finalShell = `RARE PLATINUM SHELL S${num}`;
  else if (letterPrefix === 'LG') finalShell = `RARE YELLOW GOLD SHELL LG${num}`;
  else if (letterPrefix === 'DS') finalShell = `DIESEL SILVER SHELL S${num}`;
  else if (letterPrefix === 'DB') finalShell = `DIESEL BLACK SHELL S${num}`;
  else if (letterPrefix === 'BRG') finalShell = `Brushed Rose gold 0.2MM - SIZE ${num}`;
  else {
    finalShell = is02mm ? (num ? `0.2mm ${skuUpper}` : skuUpper) : skuUpper;
  }

  // Auto-Battery Mode
  let battery = config?.fixedBattery || '32mah battery';
  if (config?.autoMode) {
    const endNum = num ? parseInt(num, 10) : 0;
    battery = (endNum >= 5 && endNum <= 8) ? '24mah battery' : '32mah battery';
  }

  const isRare = ['LG', 'LR', 'LP'].includes(letterPrefix);

  return {
    battery,
    pcba:  config?.fixedPCBA || '',
    coil:  num ? (isRare ? `Rare Ring RX Coil-${num}` : `Ring RX Coil-${num}`) : 'N/A',
    shell: finalShell,
    lens:  'N/A',
    isProRing: false,
  };
};

// GET /api/mos
export const getMOs = (req, res) => {
  const { date, status, startDate, endDate, moNumber, planDate, planDateStart, planDateEnd } = req.query;
  let entries = [...db.data.moEntries];

  if (status === 'all') {
    // 'all' = return every entry including Returned (used by DB Manager)
  } else if (status) {
    entries = entries.filter(e => e.status === status);
  } else if (!moNumber) {
    // Exclude Returned MOs from default views, unless specifically searching by MO Number
    entries = entries.filter(e => e.status !== 'Returned');
  }

  if (moNumber) {
    const q = moNumber.toLowerCase();
    entries = entries.filter(e => {
      const m = (e.moNumber || '').toLowerCase();
      return m.includes(q) || m.slice(-4).includes(q) || m.slice(-3).includes(q);
    });
  }
  if (date) entries = entries.filter(e => isSameLocalDay(e.createdAt, date));
  
  if (startDate && endDate) {
    entries = entries.filter(e => inLocalPeriod(e.createdAt, startDate, endDate));
  }

  // Filter by exact plan date
  if (planDate) {
    entries = entries.filter(e => (e.planDate || '') === planDate);
  }

  // Filter by plan date range
  if (planDateStart && planDateEnd) {
    entries = entries.filter(e => {
      const pd = e.planDate || '';
      return pd >= planDateStart && pd <= planDateEnd;
    });
  } else if (planDateStart) {
    entries = entries.filter(e => (e.planDate || '') >= planDateStart);
  } else if (planDateEnd) {
    entries = entries.filter(e => (e.planDate || '') <= planDateEnd);
  }

  // Sort newest first
  entries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(entries);
};

// POST /api/mos
export const createMO = async (req, res) => {
  const { refer, moNumber, sku, qty, od, batteryQty, pcbaQty, coilQty, shellQty, lensQty, submittedBy, batchId, planDate } = req.body;
  if (!sku || !qty) return res.status(400).json({ message: 'SKU and QTY are required' });

  // Prevent duplicate MO numbers
  if (moNumber && db.data.moEntries.some(e => e.moNumber === moNumber)) {
    return res.status(409).json({ message: `MO Number '${moNumber}' is already taken.` });
  }

  const derived = parseSKU(sku, refer || 'o', db.data.config);
  const isProRing = derived.isProRing === true;

  const bQty = batteryQty !== undefined && batteryQty !== '' ? parseInt(batteryQty) : parseInt(qty);
  const pQty = pcbaQty    !== undefined && pcbaQty    !== '' ? parseInt(pcbaQty)    : parseInt(qty);
  // Pro Ring: coilQty is always 0
  const cQty = isProRing ? 0 : (coilQty !== undefined && coilQty !== '' ? parseInt(coilQty) : parseInt(qty));
  const sQty = shellQty   !== undefined && shellQty   !== '' ? parseInt(shellQty)   : parseInt(qty);
  // Lens: only for Pro Ring; non-PR = 0
  const lQty = isProRing
    ? (lensQty !== undefined && lensQty !== '' ? parseInt(lensQty) : parseInt(qty))
    : 0;

  const entry = {
    id: randomUUID(),
    refer: refer || '',
    moNumber: moNumber || '',
    sku: sku.toUpperCase(),
    qty: parseInt(qty),
    od: od || '',
    planDate: planDate || '',
    batteryQty: bQty,
    pcbaQty:    pQty,
    coilQty:    cQty,
    shellQty:   sQty,
    lensQty:    lQty,
    battery:    derived.battery,
    pcba:       derived.pcba,
    coil:       derived.coil,
    shell:      derived.shell,
    lens:       derived.lens,
    isProRing,
    status: 'Pending',
    completedQty: 0,
    batteryComp: 0,
    pcbaComp:    0,
    coilComp:    0,
    shellComp:   0,
    lensComp:    0,
    batchId: batchId || `BATCH-${Date.now()}`,
    submittedBy: submittedBy || 'Unknown',
    createdAt: new Date().toISOString(),
    completedAt: null
  };

  db.data.moEntries.push(entry);

  // Auto-register components so they appear in WIP Reports & DB Manager Dropdowns
  const ensureComponent = (category, value) => {
    if (!value || value === 'Unknown' || value === 'N/A') return;
    if (!db.data.components) db.data.components = { batteries: [], pcbas: [], coils: [], shells: [], lenses: [] };
    if (!db.data.components[category]) db.data.components[category] = [];
    const exists = db.data.components[category].some(c => (typeof c === 'string' ? c === value : c.name === value));
    if (!exists) db.data.components[category].push(value);
  };
  ensureComponent('batteries', derived.battery);
  ensureComponent('pcbas',     derived.pcba);
  ensureComponent('coils',     derived.coil);
  ensureComponent('shells',    derived.shell);
  ensureComponent('lenses',    derived.lens);

  db.data.auditLogs.unshift({ id: randomUUID(), action: `New MO created: ${moNumber} (SKU: ${sku})`, user: submittedBy, time: new Date().toISOString() });
  await db.write();
  res.json({ success: true, entry });
};

// PUT /api/mos/:id
export const updateMO = async (req, res) => {
  const { id } = req.params;
  const {
    status, completedQty,
    batteryComp, pcbaComp, coilComp, shellComp, lensComp,
    batteryQty, pcbaQty, coilQty, shellQty, lensQty,
    planDate,
    refer, od,
    pcba
  } = req.body;
  const entry = db.data.moEntries.find(e => e.id === id);
  if (!entry) return res.status(404).json({ message: 'MO not found' });

  // If admin changed the OD (refer) field, re-derive all component names via parseSKU
  if (refer !== undefined && refer !== entry.refer) {
    const newRefer = (refer || '').trim();
    const rederived = parseSKU(entry.sku, newRefer, db.data.config);
    entry.refer     = newRefer;
    entry.battery   = rederived.battery;
    entry.pcba      = rederived.pcba;
    entry.coil      = rederived.coil;
    entry.shell     = rederived.shell;
    entry.lens      = rederived.lens;
    entry.isProRing = rederived.isProRing;

    const ensureComponent = (category, value) => {
      if (!value || value === 'Unknown' || value === 'N/A') return;
      if (!db.data.components) db.data.components = { batteries: [], pcbas: [], coils: [], shells: [], lenses: [] };
      if (!db.data.components[category]) db.data.components[category] = [];
      const exists = db.data.components[category].some(c => (typeof c === 'string' ? c === value : c.name === value));
      if (!exists) db.data.components[category].push(value);
    };
    ensureComponent('batteries', rederived.battery);
    ensureComponent('pcbas',     rederived.pcba);
    ensureComponent('coils',     rederived.coil);
    ensureComponent('shells',    rederived.shell);
    ensureComponent('lenses',    rederived.lens);

    db.data.auditLogs.unshift({
      id: randomUUID(),
      action: `OD changed: MO ${entry.moNumber} (SKU: ${entry.sku}) → shell: ${rederived.shell}`,
      user: req.body.submittedBy || 'Admin',
      time: new Date().toISOString()
    });
  }

  if (od !== undefined) entry.od = od;

  if (pcba !== undefined && pcba !== entry.pcba) {
    entry.pcba = pcba;
    
    // Auto-register to components list if new
    const ensureComponent = (category, value) => {
      if (!value || value === 'Unknown' || value === 'N/A') return;
      if (!db.data.components) db.data.components = { batteries: [], pcbas: [], coils: [], shells: [], lenses: [] };
      if (!db.data.components[category]) db.data.components[category] = [];
      const exists = db.data.components[category].some(c => (typeof c === 'string' ? c === value : c.name === value));
      if (!exists) db.data.components[category].push({ id: randomUUID().split('-')[0], name: value, status: 'Active', updatedAt: new Date().toISOString().split('T')[0] });
    };
    ensureComponent('pcbas', pcba);

    db.data.auditLogs.unshift({
      id: randomUUID(),
      action: `PCBA changed: MO ${entry.moNumber} → ${pcba}`,
      user: req.body.submittedBy || 'Admin',
      time: new Date().toISOString()
    });
  }

  if (status) {
    entry.status = status;
    if (status === 'Completed' && !entry.completedAt) {
      entry.completedAt = new Date().toISOString();
    } else if (status === 'Pending') {
      entry.completedAt = null;
    }
  }

  if (completedQty !== undefined) entry.completedQty = parseInt(completedQty);
  if (planDate !== undefined) entry.planDate = planDate;

  // Update collected quantities (WIP IN)
  if (batteryQty !== undefined && batteryQty !== '') entry.batteryQty = parseInt(batteryQty);
  if (pcbaQty    !== undefined && pcbaQty    !== '') entry.pcbaQty    = parseInt(pcbaQty);
  if (coilQty    !== undefined && coilQty    !== '') entry.coilQty    = parseInt(coilQty);
  if (shellQty   !== undefined && shellQty   !== '') entry.shellQty   = parseInt(shellQty);
  if (lensQty    !== undefined && lensQty    !== '') entry.lensQty    = parseInt(lensQty);

  const checkReplenish = (compName, oldVal, newVal, maxQty) => {
    if (newVal !== undefined && newVal > 0 && oldVal === 0 && newVal === maxQty) {
      if (!db.data.returnEntries) return;
      const ret = db.data.returnEntries.find(r => r.moId === id && r.component === compName && r.status === 'Pending Re-entry');
      if (ret) {
        ret.status = 'Replenished';
        ret.replenishedAt = new Date().toISOString();
        db.data.auditLogs.unshift({
          id: randomUUID(),
          action: `Return Replenished: MO ${entry.moNumber} — ${compName}`,
          user: req.body.submittedBy || 'Admin',
          time: new Date().toISOString()
        });
      }
    }
  };

  if (batteryComp !== undefined) { checkReplenish('Battery', entry.batteryComp, parseInt(batteryComp), entry.batteryQty); entry.batteryComp = parseInt(batteryComp); }
  if (pcbaComp    !== undefined) { checkReplenish('PCBA',    entry.pcbaComp,    parseInt(pcbaComp),    entry.pcbaQty);    entry.pcbaComp    = parseInt(pcbaComp);    }
  if (coilComp    !== undefined) { checkReplenish('Coil',    entry.coilComp,    parseInt(coilComp),    entry.coilQty);    entry.coilComp    = parseInt(coilComp);    }
  if (shellComp   !== undefined) { checkReplenish('Shell',   entry.shellComp,   parseInt(shellComp),   entry.shellQty);   entry.shellComp   = parseInt(shellComp);   }
  if (lensComp    !== undefined) { checkReplenish('Lens',    entry.lensComp  || 0, parseInt(lensComp), entry.lensQty  || 0); entry.lensComp  = parseInt(lensComp);   }

  // --- Cascade Component Name Changes to Dataflow (WIP Fix) ---
  const applyCascade = () => {
    // 1. Scrap
    if (db.data.scrapEntries) {
      db.data.scrapEntries.filter(s => s.moId === entry.id).forEach(s => {
        if (s.component === 'Battery') s.componentName = entry.battery;
        else if (s.component === 'PCBA') s.componentName = entry.pcba;
        else if (s.component === 'Coil') s.componentName = entry.coil;
        else if (s.component === 'Shell') s.componentName = entry.shell;
        else if (s.component === 'Lens') s.componentName = entry.lens;
      });
    }
    // 2. Rework
    if (db.data.reworkEntries) {
      db.data.reworkEntries.filter(r => r.moId === entry.id).forEach(r => {
        if (r.component === 'Battery') r.componentName = entry.battery;
        else if (r.component === 'PCBA') r.componentName = entry.pcba;
        else if (r.component === 'Coil') r.componentName = entry.coil;
        else if (r.component === 'Shell') r.componentName = entry.shell;
        else if (r.component === 'Lens') r.componentName = entry.lens;
      });
    }
  };
  applyCascade();
  // ------------------------------------------------------------

  await db.write();
  res.json({ success: true, entry });
};

// DELETE /api/mos/:id
export const deleteMO = async (req, res) => {
  const { id } = req.params;
  const idx = db.data.moEntries.findIndex(e => e.id === id);
  if (idx === -1) return res.status(404).json({ message: 'MO not found' });
  db.data.moEntries.splice(idx, 1);
  await db.write();
  res.json({ success: true });
};

// POST /api/mos/parse-sku (live preview)
export const parseSKUPreview = (req, res) => {
  const { sku, refer } = req.body;
  if (!sku) return res.status(400).json({ message: 'SKU required' });
  const result = parseSKU(sku, refer || 'o', db.data.config);
  res.json(result);
};

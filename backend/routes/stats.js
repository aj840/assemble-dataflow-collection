import db from '../db.js';
import { getLocalDateStr, isSameLocalDay, inLocalPeriod } from '../utils/dates.js';

// GET /api/stats?startDate=&endDate=&date=
export const getStats = (req, res) => {
  const { date, startDate, endDate } = req.query;
  const today = date || getLocalDateStr();

  // Apply date filter to MO entries
  let entries = db.data.moEntries || [];
  if (startDate && endDate) {
    entries = entries.filter(e => inLocalPeriod(e.createdAt, startDate, endDate));
  } else if (date) {
    entries = entries.filter(e => isSameLocalDay(e.createdAt, date));
  }

  // Scrap entries
  const scrap = db.data.scrapEntries || [];
  const filteredScrap = (startDate && endDate)
    ? scrap.filter(e => inLocalPeriod(e.submittedAt, startDate, endDate))
    : date
      ? scrap.filter(e => isSameLocalDay(e.submittedAt, date))
      : scrap;

  // Return entries
  const returns = db.data.returnEntries || [];
  const filteredReturns = (startDate && endDate)
    ? returns.filter(e => inLocalPeriod(e.returnedAt, startDate, endDate))
    : date
      ? returns.filter(e => isSameLocalDay(e.returnedAt, date))
      : returns;

  // Rework entries
  const rework = db.data.reworkEntries || [];
  const filteredRework = (startDate && endDate)
    ? rework.filter(e => inLocalPeriod(e.submittedAt, startDate, endDate))
    : date
      ? rework.filter(e => isSameLocalDay(e.submittedAt, date))
      : rework;

  const incomeToday  = (db.data.moEntries || []).filter(e => isSameLocalDay(e.createdAt, today)).length;
  const outgoToday   = (db.data.moEntries || []).filter(e => isSameLocalDay(e.completedAt, today)).length;
  const totalMOs     = entries.length;
  const pendingMOs   = entries.filter(e => e.status === 'Pending').length;
  const completedMOs = entries.filter(e => e.status === 'Completed').length;
  const totalQtyPlanned   = entries.reduce((sum, e) => sum + (e.qty || 0), 0);
  const totalQtyCompleted = entries.reduce((sum, e) => sum + (e.completedQty || 0), 0);
  const totalUsers = db.data.users.length;

  // WIP Formula — component-wise: WIP = (IN + RC) − (RJ + RT + OUT)
  // IN is already net of Returns (RT) because returning an MO physically reduces the MO's quantity in the database.
  // IN  = sum of all 4 component quantities (battery+pcba+coil+shell) per MO
  // RC  = total scrap received
  // RJ  = total scrap rejected
  // RT  = total returned components (Full MO return counts all 4 components)
  // OUT = sum of all 4 completed component quantities for Completed MOs
  const IN = entries.reduce((s, e) => {
    const bQty = e.batteryQty !== undefined ? (e.batteryQty || 0) : (e.qty || 0);
    const pQty = e.pcbaQty   !== undefined ? (e.pcbaQty   || 0) : (e.qty || 0);
    const cQty = e.coilQty   !== undefined ? (e.coilQty   || 0) : (e.qty || 0);
    const sQty = e.shellQty  !== undefined ? (e.shellQty  || 0) : (e.qty || 0);
    const lQty = e.lensQty   !== undefined ? (e.lensQty   || 0) : 0;
    return s + bQty + pQty + cQty + sQty + lQty;
  }, 0);
  const RC = filteredScrap.reduce((s, e) => s + (e.receive || 0), 0)
           + filteredRework.reduce((s, e) => s + (e.receive || 0), 0);
  const RJ = filteredScrap.reduce((s, e) => s + (e.reject  || 0), 0)
           + filteredRework.reduce((s, e) => s + (e.reject  || 0), 0);
  // RT: Full MO returns = sum of all components; Component returns = componentQty
  const RT = filteredReturns.reduce((s, e) => {
    if (e.isFullMO) {
      const mo = (db.data.moEntries || []).find(m => m.id === e.moId);
      if (!mo) return s;
      const bQty = mo.batteryQty !== undefined ? (mo.batteryQty || 0) : (mo.qty || 0);
      const pQty = mo.pcbaQty   !== undefined ? (mo.pcbaQty   || 0) : (mo.qty || 0);
      const cQty = mo.coilQty   !== undefined ? (mo.coilQty   || 0) : (mo.qty || 0);
      const sQty = mo.shellQty  !== undefined ? (mo.shellQty  || 0) : (mo.qty || 0);
      const lQty = mo.lensQty   !== undefined ? (mo.lensQty   || 0) : 0;
      return s + bQty + pQty + cQty + sQty + lQty;
    }
    return s + (e.componentQty || 0);
  }, 0);
  const OUT = entries
    .reduce((s, e) => s + (e.batteryComp || 0) + (e.pcbaComp || 0) + (e.coilComp || 0) + (e.shellComp || 0) + (e.lensComp || 0), 0);
  const WIP = (IN + RC) - (RJ + RT + OUT);

  const batteryBreakdown = {};
  const pcbaBreakdown    = {};
  const coilBreakdown    = {};
  const shellBreakdown   = {};
  const lensBreakdown    = {};

  entries.forEach(e => {
    const bKey = e.battery || 'Unknown';
    const pKey = e.pcba    || 'Unknown';
    const cKey = e.coil    || 'Unknown';
    const sKey = e.shell   || 'Unknown';
    const lKey = e.lens    || 'N/A';
    batteryBreakdown[bKey] = (batteryBreakdown[bKey] || 0) + (e.batteryComp || e.qty || 0);
    pcbaBreakdown[pKey]    = (pcbaBreakdown[pKey]    || 0) + (e.pcbaComp    || e.qty || 0);
    coilBreakdown[cKey]    = (coilBreakdown[cKey]    || 0) + (e.coilComp    || e.qty || 0);
    shellBreakdown[sKey]   = (shellBreakdown[sKey]   || 0) + (e.shellComp   || e.qty || 0);
    if (lKey !== 'N/A') lensBreakdown[lKey] = (lensBreakdown[lKey] || 0) + (e.lensComp || 0);
  });

  const toArray = obj =>
    Object.entries(obj).map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty);

  // Weekly chart (last 7 days — always uses full dataset)
  const allEntries = db.data.moEntries || [];
  const weeklyData = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStr   = getLocalDateStr(d);
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
    weeklyData.push({
      day:       dayLabel,
      income:    allEntries.filter(e => isSameLocalDay(e.createdAt, dayStr)).length,
      completed: allEntries.filter(e => isSameLocalDay(e.completedAt, dayStr)).length,
    });
  }

  const scrapTodayCount = (db.data.scrapEntries || []).filter(e => isSameLocalDay(e.submittedAt, today)).length;
  const scrapTodayQty = (db.data.scrapEntries || []).filter(e => isSameLocalDay(e.submittedAt, today)).reduce((sum, e) => sum + (e.receive || 0) + (e.reject || 0), 0);

  res.json({
    incomeToday, outgoToday, totalMOs, pendingMOs, completedMOs,
    totalQtyPlanned, totalQtyCompleted,
    balanceQty: totalQtyPlanned - totalQtyCompleted,
    scrapToday: scrapTodayCount,
    totalUsers, weeklyData,
    recentLogs: db.data.auditLogs.slice(0, 5),
    users: db.data.users.map(u => ({ id: u.id, fullName: u.fullName, role: u.role })),
    // WIP
    wip: { IN, RC, RJ, RT, OUT, WIP },
    // Material breakdown
    breakdown: {
      batteries: toArray(batteryBreakdown),
      pcbas:     toArray(pcbaBreakdown),
      coils:     toArray(coilBreakdown),
      shells:    toArray(shellBreakdown),
      lenses:    toArray(lensBreakdown),
    },
  });
};

// GET /api/stats/report?startDate=&endDate=
export const getReport = (req, res) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) return res.status(400).json({ message: 'Start and end dates are required' });

  // Helper for proper Date comparisons
  const parseStart = (s) => s ? new Date(s.length === 10 ? s + 'T00:00:00' : s) : null;
  const parseEnd = (s) => s ? new Date(s.length === 10 ? s + 'T23:59:59' : s) : null;
  const startDT = parseStart(startDate);
  const endDT = parseEnd(endDate);

  const inPeriod = (dateStr) => {
    if (!startDT || !endDT) return true;
    const d = new Date(dateStr || '');
    return d >= startDT && d <= endDT;
  };

  // Filter entries exactly by the datetime range
  const moEntries = (db.data.moEntries || []).filter(e => inPeriod(e.createdAt));
  const scrapEntries = (db.data.scrapEntries || []).filter(e => inPeriod(e.submittedAt));
  const returnEntries = (db.data.returnEntries || []).filter(e => inPeriod(e.returnedAt));
  const reworkEntries = (db.data.reworkEntries || []).filter(e => inPeriod(e.submittedAt));

  const totalMOs = moEntries.length;
  const pendingMOs = moEntries.filter(e => e.status === 'Pending').length;
  const completedMOs = moEntries.filter(e => e.status === 'Completed').length;
  const totalQtyPlanned = moEntries.reduce((sum, e) => sum + (e.qty || 0), 0);
  const totalQtyCompleted = moEntries.reduce((sum, e) => sum + (e.completedQty || 0), 0);

  // Initialize ALL components
  const comps = db.data.components || {};
  const initList = (list) => (list || []).map(c => ({
    name: typeof c === 'string' ? c : c.name,
    in: 0, received: 0, reject: 0, return: 0, out: 0
  }));
  
  const detailed = {
    batteries: initList(comps.batteries),
    pcbas:     initList(comps.pcbas),
    coils:     initList(comps.coils),
    shells:    initList(comps.shells),
    lenses:    initList(comps.lenses),
  };

  const findAndAdd = (cat, name, field, val) => {
    if (!name) return;
    let item = detailed[cat].find(c => c.name === name);
    if (!item) {
      item = { name, in: 0, received: 0, reject: 0, return: 0, out: 0 };
      detailed[cat].push(item);
    }
    item[field] += (val || 0);
  };

  // 1. MO Entries (IN & OUT)
  moEntries.forEach(e => {
    findAndAdd('batteries', e.battery, 'in', e.batteryQty !== undefined ? e.batteryQty : (e.qty || 0));
    findAndAdd('pcbas',     e.pcba,    'in', e.pcbaQty    !== undefined ? e.pcbaQty    : (e.qty || 0));
    findAndAdd('coils',     e.coil,    'in', e.coilQty    !== undefined ? e.coilQty    : (e.qty || 0));
    findAndAdd('shells',    e.shell,   'in', e.shellQty   !== undefined ? e.shellQty   : (e.qty || 0));
    if (e.lens && e.lens !== 'N/A') {
      findAndAdd('lenses',  e.lens,    'in', e.lensQty    !== undefined ? e.lensQty    : (e.qty || 0));
    }

    findAndAdd('batteries', e.battery, 'out', e.batteryComp || 0);
    findAndAdd('pcbas',     e.pcba,    'out', e.pcbaComp    || 0);
    findAndAdd('coils',     e.coil,    'out', e.coilComp    || 0);
    findAndAdd('shells',    e.shell,   'out', e.shellComp   || 0);
    if (e.lens && e.lens !== 'N/A') {
      findAndAdd('lenses',  e.lens,    'out', e.lensComp    || 0);
    }
  });

  // 2. Scrap & Rework Entries (Received & Reject)
  const typeMap = { 'Battery': 'batteries', 'PCBA': 'pcbas', 'Coil': 'coils', 'Shell': 'shells', 'Lens': 'lenses' };
  
  scrapEntries.forEach(e => {
    const cat = typeMap[e.component];
    if (cat && e.componentName) {
      findAndAdd(cat, e.componentName, 'received', e.receive || 0);
      findAndAdd(cat, e.componentName, 'reject',   e.reject  || 0);
    }
  });

  reworkEntries.forEach(e => {
    const cat = typeMap[e.component];
    if (cat && e.componentName) {
      findAndAdd(cat, e.componentName, 'received', e.receive || 0);
      findAndAdd(cat, e.componentName, 'reject',   e.reject  || 0);
    }
  });

  // 3. Return Entries (Return) — Full MO returns use MO's per-component qty
  returnEntries.forEach(e => {
    const typeMap  = { 'Battery': 'batteries', 'PCBA': 'pcbas', 'Coil': 'coils', 'Shell': 'shells', 'Lens': 'lenses' };
    const fieldMap = { 'Battery': 'battery',   'PCBA': 'pcba',  'Coil': 'coil',  'Shell': 'shell',  'Lens': 'lens'    };
    const qtyMap   = { 'Battery': 'batteryQty', 'PCBA': 'pcbaQty', 'Coil': 'coilQty', 'Shell': 'shellQty', 'Lens': 'lensQty' };
    
    // Find original MO to determine component names
    const mo = (db.data.moEntries || []).find(m => m.id === e.moId);
    
    if (e.isFullMO && mo) {
      // Full MO return: all active components returned
      ['Battery', 'PCBA', 'Coil', 'Shell'].forEach(comp => {
        const cat = typeMap[comp];
        const name = mo[fieldMap[comp]];
        const qty = mo[qtyMap[comp]] !== undefined ? mo[qtyMap[comp]] : (mo.qty || 0);
        if (cat && name) findAndAdd(cat, name, 'return', qty);
      });
      // Lens return for Pro Ring
      if (mo.isProRing && mo.lens && mo.lens !== 'N/A') {
        const lQty = mo.lensQty !== undefined ? mo.lensQty : (mo.qty || 0);
        findAndAdd('lenses', mo.lens, 'return', lQty);
      }
    } else if (e.component && mo) {
       const cat = typeMap[e.component];
       const compName = mo[fieldMap[e.component]];
       if (cat && compName) {
         findAndAdd(cat, compName, 'return', e.componentQty || 0);
       }
    }
  });

  res.json({
    period: { start: startDate, end: endDate },
    summary: { totalMOs, pendingMOs, completedMOs, totalQtyPlanned, totalQtyCompleted },
    detailed
  });
};

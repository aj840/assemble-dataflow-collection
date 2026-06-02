import { MOEntry } from '../models/MO.js';
import { ScrapEntry, ReworkEntry, ReturnEntry, AuditLog } from '../models/Entries.js';
import { User } from '../models/Core.js';
import { getLocalDateStr, isSameLocalDay, inLocalPeriod } from '../utils/dates.js';

// GET /api/stats
export const getStats = async (req, res) => {
  try {
    const { date, startDate, endDate } = req.query;
    const today = date || getLocalDateStr();

    const [allMOs, allScrap, allReturns, allReworks, allUsers, recentLogs] = await Promise.all([
      MOEntry.find({}).lean(),
      ScrapEntry.find({}).lean(),
      ReturnEntry.find({}).lean(),
      ReworkEntry.find({}).lean(),
      User.find({}, 'id fullName role').lean(),
      AuditLog.find({}).sort({ timestamp: -1 }).limit(5).lean(),
    ]);

    // Filter IN entries
    let entries = allMOs;
    let outEntries = allMOs;
    if (startDate && endDate) {
      entries = entries.filter(e => inLocalPeriod(e.createdAt, startDate, endDate));
      outEntries = outEntries.filter(e => e.status === 'Completed' && inLocalPeriod(e.completedAt, startDate, endDate));
    } else if (date) {
      entries = entries.filter(e => isSameLocalDay(e.createdAt, date));
      outEntries = outEntries.filter(e => e.status === 'Completed' && isSameLocalDay(e.completedAt, date));
    } else {
      outEntries = outEntries.filter(e => e.status === 'Completed');
    }

    const filteredScrap = (startDate && endDate) ? allScrap.filter(e => inLocalPeriod(e.submittedAt, startDate, endDate)) : date ? allScrap.filter(e => isSameLocalDay(e.submittedAt, date)) : allScrap;
    const filteredReturns = (startDate && endDate) ? allReturns.filter(e => inLocalPeriod(e.returnedAt, startDate, endDate)) : date ? allReturns.filter(e => isSameLocalDay(e.returnedAt, date)) : allReturns;
    const filteredRework = (startDate && endDate) ? allReworks.filter(e => inLocalPeriod(e.submittedAt, startDate, endDate)) : date ? allReworks.filter(e => isSameLocalDay(e.submittedAt, date)) : allReworks;

    const incomeToday = allMOs.filter(e => isSameLocalDay(e.createdAt, today)).length;
    const outgoToday  = allMOs.filter(e => isSameLocalDay(e.completedAt, today)).length;
    const totalMOs = entries.length;
    const pendingMOs = entries.filter(e => e.status === 'Pending').length;
    const completedMOs = entries.filter(e => e.status === 'Completed').length;
    const totalQtyPlanned = entries.reduce((s, e) => s + (e.qty || 0), 0);
    const totalQtyCompleted = entries.reduce((s, e) => s + (e.completedQty || 0), 0);

    // WIP Formula
    const moMap = Object.fromEntries(allMOs.map(m => [m.id, m]));
    const IN = entries.reduce((s, e) => s + (e.batteryQty ?? e.qty ?? 0) + (e.pcbaQty ?? e.qty ?? 0) + (e.coilQty ?? e.qty ?? 0) + (e.shellQty ?? e.qty ?? 0) + (e.lensQty ?? 0), 0);
    const RC = filteredScrap.reduce((s, e) => s + (e.receive || 0), 0) + filteredRework.reduce((s, e) => s + (e.receive || 0), 0);
    const RJ = filteredScrap.reduce((s, e) => s + (e.reject  || 0), 0) + filteredRework.reduce((s, e) => s + (e.reject  || 0), 0);
    const RT = filteredReturns.reduce((s, e) => {
      if (e.isFullMO) { const mo = moMap[e.moId]; if (!mo) return s; return s + (mo.batteryQty ?? mo.qty ?? 0) + (mo.pcbaQty ?? mo.qty ?? 0) + (mo.coilQty ?? mo.qty ?? 0) + (mo.shellQty ?? mo.qty ?? 0) + (mo.lensQty ?? 0); }
      return s + (e.componentQty || 0);
    }, 0);
    const OUT = outEntries.reduce((s, e) => s + (e.batteryComp || 0) + (e.pcbaComp || 0) + (e.coilComp || 0) + (e.shellComp || 0) + (e.lensComp || 0), 0);
    const WIP = (IN + RC) - (RJ + RT + OUT);

    // Material breakdowns
    const batteryBreakdown = {}, pcbaBreakdown = {}, coilBreakdown = {}, shellBreakdown = {}, lensBreakdown = {};
    entries.forEach(e => {
      const bKey = e.battery || 'Unknown'; batteryBreakdown[bKey] = (batteryBreakdown[bKey] || 0) + (e.batteryComp || e.qty || 0);
      const pKey = e.pcba    || 'Unknown'; pcbaBreakdown[pKey]    = (pcbaBreakdown[pKey]    || 0) + (e.pcbaComp    || e.qty || 0);
      const cKey = e.coil    || 'Unknown'; coilBreakdown[cKey]    = (coilBreakdown[cKey]    || 0) + (e.coilComp    || e.qty || 0);
      const sKey = e.shell   || 'Unknown'; shellBreakdown[sKey]   = (shellBreakdown[sKey]   || 0) + (e.shellComp   || e.qty || 0);
      const lKey = e.lens    || 'N/A'; if (lKey !== 'N/A') lensBreakdown[lKey] = (lensBreakdown[lKey] || 0) + (e.lensComp || 0);
    });
    const toArray = obj => Object.entries(obj).map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty);

    // Weekly chart
    const weeklyData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dayStr = getLocalDateStr(d);
      weeklyData.push({ day: d.toLocaleDateString('en-US', { weekday: 'short' }), income: allMOs.filter(e => isSameLocalDay(e.createdAt, dayStr)).length, completed: allMOs.filter(e => isSameLocalDay(e.completedAt, dayStr)).length });
    }

    const scrapTodayCount = allScrap.filter(e => isSameLocalDay(e.submittedAt, today)).length;

    res.json({
      incomeToday, outgoToday, totalMOs, pendingMOs, completedMOs, totalQtyPlanned, totalQtyCompleted,
      balanceQty: totalQtyPlanned - totalQtyCompleted, scrapToday: scrapTodayCount,
      totalUsers: allUsers.length, weeklyData, recentLogs, users: allUsers,
      wip: { IN, RC, RJ, RT, OUT, WIP },
      breakdown: { batteries: toArray(batteryBreakdown), pcbas: toArray(pcbaBreakdown), coils: toArray(coilBreakdown), shells: toArray(shellBreakdown), lenses: toArray(lensBreakdown) },
    });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
};

// GET /api/stats/report
export const getReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ message: 'Start and end dates are required' });

    const [allMOs, allScrap, allReturns, allReworks] = await Promise.all([
      MOEntry.find({}).lean(), ScrapEntry.find({}).lean(), ReturnEntry.find({}).lean(), ReworkEntry.find({}).lean()
    ]);

    const moEntries    = allMOs.filter(e => inLocalPeriod(e.createdAt, startDate, endDate));
    const moOutEntries = allMOs.filter(e => e.status === 'Completed' && inLocalPeriod(e.completedAt, startDate, endDate));
    const scrapEntries  = allScrap.filter(e => inLocalPeriod(e.submittedAt, startDate, endDate));
    const returnEntries = allReturns.filter(e => inLocalPeriod(e.returnedAt, startDate, endDate));
    const reworkEntries = allReworks.filter(e => inLocalPeriod(e.submittedAt, startDate, endDate));

    const totalMOs = moEntries.length;
    const pendingMOs = moEntries.filter(e => e.status === 'Pending').length;
    const completedMOs = moEntries.filter(e => e.status === 'Completed').length;
    const totalQtyPlanned = moEntries.reduce((s, e) => s + (e.qty || 0), 0);
    const totalQtyCompleted = moEntries.reduce((s, e) => s + (e.completedQty || 0), 0);

    const detailed = { batteries: [], pcbas: [], coils: [], shells: [], lenses: [] };
    const findAndAdd = (cat, name, field, val) => {
      if (!name) return;
      let item = detailed[cat].find(c => c.name === name);
      if (!item) { item = { name, in: 0, received: 0, reject: 0, return: 0, out: 0 }; detailed[cat].push(item); }
      item[field] += (val || 0);
    };

    moEntries.forEach(e => {
      findAndAdd('batteries', e.battery, 'in', e.batteryQty ?? e.qty ?? 0);
      findAndAdd('pcbas', e.pcba, 'in', e.pcbaQty ?? e.qty ?? 0);
      findAndAdd('coils', e.coil, 'in', e.coilQty ?? e.qty ?? 0);
      findAndAdd('shells', e.shell, 'in', e.shellQty ?? e.qty ?? 0);
      if (e.lens && e.lens !== 'N/A') findAndAdd('lenses', e.lens, 'in', e.lensQty ?? e.qty ?? 0);
    });

    moOutEntries.forEach(e => {
      findAndAdd('batteries', e.battery, 'out', e.batteryComp || 0);
      findAndAdd('pcbas', e.pcba, 'out', e.pcbaComp || 0);
      findAndAdd('coils', e.coil, 'out', e.coilComp || 0);
      findAndAdd('shells', e.shell, 'out', e.shellComp || 0);
      if (e.lens && e.lens !== 'N/A') findAndAdd('lenses', e.lens, 'out', e.lensComp || 0);
    });

    const typeMap = { Battery: 'batteries', PCBA: 'pcbas', Coil: 'coils', Shell: 'shells', Lens: 'lenses' };
    scrapEntries.forEach(e => { const cat = typeMap[e.component]; if (cat && e.componentName) { findAndAdd(cat, e.componentName, 'received', e.receive || 0); findAndAdd(cat, e.componentName, 'reject', e.reject || 0); } });
    reworkEntries.forEach(e => { const cat = typeMap[e.component]; if (cat && e.componentName) { findAndAdd(cat, e.componentName, 'received', e.receive || 0); findAndAdd(cat, e.componentName, 'reject', e.reject || 0); } });

    const moMap = Object.fromEntries(allMOs.map(m => [m.id, m]));
    const fieldMap = { Battery: 'battery', PCBA: 'pcba', Coil: 'coil', Shell: 'shell', Lens: 'lens' };
    const qtyMap   = { Battery: 'batteryQty', PCBA: 'pcbaQty', Coil: 'coilQty', Shell: 'shellQty', Lens: 'lensQty' };
    returnEntries.forEach(e => {
      const mo = moMap[e.moId];
      if (e.isFullMO && mo) {
        ['Battery', 'PCBA', 'Coil', 'Shell'].forEach(comp => {
          const cat = typeMap[comp]; const name = mo[fieldMap[comp]]; const qty = mo[qtyMap[comp]] ?? mo.qty ?? 0;
          if (cat && name) findAndAdd(cat, name, 'return', qty);
        });
        if (mo.isProRing && mo.lens && mo.lens !== 'N/A') findAndAdd('lenses', mo.lens, 'return', mo.lensQty ?? mo.qty ?? 0);
      } else if (e.component && mo) {
        const cat = typeMap[e.component]; const compName = mo[fieldMap[e.component]];
        if (cat && compName) findAndAdd(cat, compName, 'return', e.componentQty || 0);
      }
    });

    res.json({ period: { start: startDate, end: endDate }, summary: { totalMOs, pendingMOs, completedMOs, totalQtyPlanned, totalQtyCompleted }, detailed });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
};

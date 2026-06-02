import { randomUUID } from '../db.js';
import { ReturnEntry, AuditLog } from '../models/Entries.js';
import { MOEntry } from '../models/MO.js';
import { inLocalPeriod } from '../utils/dates.js';

// GET /api/returns
export const getReturnEntries = async (req, res) => {
  try {
    const { moNumber, startDate, endDate } = req.query;
    const query = {};
    if (moNumber) query.moNumber = { $regex: moNumber, $options: 'i' };

    let entries = await ReturnEntry.find(query).lean();
    if (startDate && endDate) entries = entries.filter(e => inLocalPeriod(e.returnedAt, startDate, endDate));

    // Attach MO details
    const moIds = [...new Set(entries.map(e => e.moId))];
    const mos = await MOEntry.find({ id: { $in: moIds } }).lean();
    const moMap = Object.fromEntries(mos.map(m => [m.id, m]));

    entries = entries.map(e => {
      const mo = moMap[e.moId];
      return { ...e, moDetails: mo ? { qty: mo.qty, battery: mo.battery, batteryQty: mo.batteryQty ?? mo.qty, pcba: mo.pcba, pcbaQty: mo.pcbaQty ?? mo.qty, coil: mo.coil, coilQty: mo.coilQty ?? mo.qty, shell: mo.shell, shellQty: mo.shellQty ?? mo.qty, lens: mo.lens, lensQty: mo.lensQty ?? 0 } : null };
    });

    entries.sort((a, b) => new Date(b.returnedAt) - new Date(a.returnedAt));
    res.json(entries);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

// POST /api/returns
export const createReturnEntry = async (req, res) => {
  try {
    const { moId, moNumber, sku, returnType, component, componentQty, isFullMO, submittedBy } = req.body;
    if (!moId || !moNumber) return res.status(400).json({ message: 'moId and moNumber are required' });

    const now = new Date().toISOString();
    const entry = await ReturnEntry.create({
      id: randomUUID(), moId, moNumber, sku: sku || '', returnType: returnType || 'Component',
      component: component || '', componentQty: parseInt(componentQty) || 0,
      isFullMO: !!isFullMO, returnedAt: now, submittedBy: submittedBy || 'Unknown', status: 'Returned',
    });

    if (isFullMO) {
      await MOEntry.findOneAndUpdate({ id: moId }, { status: 'Returned', returnedAt: now });
    }

    await AuditLog.create({ id: randomUUID(), action: `Return: MO ${moNumber} — ${isFullMO ? `Full MO return (${entry.componentQty})` : `${component} component returned (${componentQty})`}`, user: submittedBy, timestamp: now });
    res.json({ success: true, entry });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
};

// DELETE /api/returns/:id
export const deleteReturnEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await ReturnEntry.deleteOne({ id });
    if (result.deletedCount === 0) return res.status(404).json({ message: 'Return entry not found' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

// PUT /api/returns/:id/replenish
export const replenishReturnEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await ReturnEntry.findOne({ id });
    if (!entry) return res.status(404).json({ message: 'Return entry not found' });
    const now = new Date().toISOString();
    entry.status = 'Replenished';
    entry.replenishedAt = now;
    await entry.save();
    await AuditLog.create({ id: randomUUID(), action: `Return Replenished: MO ${entry.moNumber} — ${entry.isFullMO ? 'Full MO' : entry.component}`, user: req.body.submittedBy || 'User', timestamp: now });
    res.json({ success: true, entry });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

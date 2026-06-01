import db, { randomUUID } from '../db.js';
import { inLocalPeriod } from '../utils/dates.js';

// GET /api/returns
export const getReturnEntries = (req, res) => {
  const { moNumber, startDate, endDate } = req.query;
  let entries = [...(db.data.returnEntries || [])];

  if (moNumber) {
    const q = moNumber.toLowerCase();
    entries = entries.filter(e => (e.moNumber || '').toLowerCase().includes(q));
  }
  if (startDate && endDate) {
    entries = entries.filter(e => inLocalPeriod(e.returnedAt, startDate, endDate));
  }

  // Attach MO details including per-component quantities
  entries = entries.map(e => {
    const mo = (db.data.moEntries || []).find(m => m.id === e.moId);
    return {
      ...e,
      moDetails: mo ? {
        qty:       mo.qty,
        battery:   mo.battery,  batteryQty:  mo.batteryQty  !== undefined ? mo.batteryQty  : mo.qty,
        pcba:      mo.pcba,     pcbaQty:     mo.pcbaQty     !== undefined ? mo.pcbaQty     : mo.qty,
        coil:      mo.coil,     coilQty:     mo.coilQty     !== undefined ? mo.coilQty     : mo.qty,
        shell:     mo.shell,    shellQty:    mo.shellQty     !== undefined ? mo.shellQty    : mo.qty,
        lens:      mo.lens,     lensQty:     mo.lensQty     !== undefined ? mo.lensQty     : 0,
      } : null
    };
  });

  entries.sort((a, b) => new Date(b.returnedAt) - new Date(a.returnedAt));
  res.json(entries);
};

// POST /api/returns
// body: { moId, moNumber, sku, returnType, component, componentQty, isFullMO, submittedBy }
export const createReturnEntry = async (req, res) => {
  const { moId, moNumber, sku, returnType, component, componentQty, isFullMO, submittedBy } = req.body;
  if (!moId || !moNumber) return res.status(400).json({ message: 'moId and moNumber are required' });

  const now = new Date().toISOString();
  if (!db.data.returnEntries) db.data.returnEntries = [];

  const entry = {
    id: randomUUID(),
    moId,
    moNumber,
    sku: sku || '',
    returnType: returnType || 'Component', // 'FullMO' | 'Component'
    component: component || '',            // 'Battery' | 'PCBA' | 'Coil' | 'Shell'
    componentQty: parseInt(componentQty) || 0,
    isFullMO: !!isFullMO,
    returnedAt: now,
    submittedBy: submittedBy || 'Unknown',
    status: 'Returned',
  };

  db.data.returnEntries.push(entry);

  // Mark MO status as Returned for full MO returns.
  // NOTE: MO qty fields are intentionally NOT reduced here.
  // IN = original planned qty (never mutated by returns).
  // RT is tracked in returnEntries and subtracted in the WIP formula separately.
  // WIP = (IN + RC) − (RJ + RT + OUT) — no double-counting.
  if (isFullMO) {
    const mo = db.data.moEntries.find(e => e.id === moId);
    if (mo) {
      mo.status = 'Returned';
      mo.returnedAt = now;
    }
  }

  db.data.auditLogs.unshift({
    id: randomUUID(),
    action: `Return: MO ${moNumber} — ${isFullMO ? `Full MO return (${entry.componentQty})` : `${component} component returned (${componentQty})`}`,
    user: submittedBy,
    time: now,
  });
  await db.write();
  res.json({ success: true, entry });
};

// DELETE /api/returns/:id
export const deleteReturnEntry = async (req, res) => {
  const { id } = req.params;
  if (!db.data.returnEntries) return res.status(404).json({ message: 'Not found' });
  const idx = db.data.returnEntries.findIndex(e => e.id === id);
  if (idx === -1) return res.status(404).json({ message: 'Return entry not found' });
  db.data.returnEntries.splice(idx, 1);
  await db.write();
  res.json({ success: true });
};

// PUT /api/returns/:id/replenish
export const replenishReturnEntry = async (req, res) => {
  const { id } = req.params;
  if (!db.data.returnEntries) return res.status(404).json({ message: 'Not found' });
  const entry = db.data.returnEntries.find(e => e.id === id);
  if (!entry) return res.status(404).json({ message: 'Return entry not found' });

  entry.status = 'Replenished';
  entry.replenishedAt = new Date().toISOString();

  // No qty restoration needed: MO qty fields are never reduced on return,
  // so replenish only needs to update the return entry status (done above).

  db.data.auditLogs.unshift({
    id: randomUUID(),
    action: `Return Replenished: MO ${entry.moNumber} — ${entry.isFullMO ? 'Full MO' : entry.component}`,
    user: req.body.submittedBy || 'User',
    time: entry.replenishedAt,
  });

  await db.write();
  res.json({ success: true, entry });
};

import { MOEntry } from '../models/MO.js';
import { ScrapEntry, ReworkEntry, ReturnEntry } from '../models/Entries.js';
import { Component } from '../models/Core.js';
import XLSX from 'xlsx-js-style';
import { inLocalPeriod } from '../utils/dates.js';

// GET /api/stats/wip-excel?startDate=&endDate=
export const downloadWipExcel = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Fetch all data from MongoDB
    const [allMOs, allScrap, allReturns, allReworks, allComponents] = await Promise.all([
      MOEntry.find({}).lean(),
      ScrapEntry.find({}).lean(),
      ReturnEntry.find({}).lean(),
      ReworkEntry.find({}).lean(),
      Component.find({}).lean(),
    ]);

    // Build the components structure (mirrors the old db.data.components shape)
    const comps = { batteries: [], pcbas: [], coils: [], shells: [], lenses: [] };
    for (const c of allComponents) {
      if (comps[c.category] !== undefined) {
        comps[c.category].push(c.name);
      }
    }

    // ─── DateTime filter helpers ───────────────────────────────────────────────
    const inPeriod = (dateStr) => {
      if (!startDate || !endDate) return true;
      return inLocalPeriod(dateStr, startDate, endDate);
    };

    const periodInMOs   = startDate ? allMOs.filter(e     => inPeriod(e.createdAt))   : allMOs;
    const periodOutMOs  = startDate ? allMOs.filter(e     => e.status === 'Completed' && inPeriod(e.completedAt)) : allMOs;
    const periodScrap   = startDate ? allScrap.filter(e   => inPeriod(e.submittedAt)) : allScrap;
    const periodReturns = startDate ? allReturns.filter(e => inPeriod(e.returnedAt))  : allReturns;
    const periodReworks = startDate ? allReworks.filter(e => inPeriod(e.submittedAt)) : allReworks;

    // ─── Component-wise stat calculator ───────────────────────────────────────
    const calcStats = (name, category, inMos, outMos, scrap, returns, reworks) => {
      const nameField = { batteries: 'battery', pcbas: 'pcba', coils: 'coil', shells: 'shell', lenses: 'lens'      }[category];
      const qtyField  = { batteries: 'batteryQty', pcbas: 'pcbaQty', coils: 'coilQty', shells: 'shellQty', lenses: 'lensQty'  }[category];
      const compField = { batteries: 'batteryComp',pcbas: 'pcbaComp',coils: 'coilComp',shells: 'shellComp', lenses: 'lensComp' }[category];
      const compType  = { batteries: 'Battery',    pcbas: 'PCBA',    coils: 'Coil',    shells: 'Shell',    lenses: 'Lens'      }[category];

      let IN = 0, RC = 0, RJ = 0, RT = 0, OUT = 0;

      // IN from created MOs
      inMos.forEach(e => {
        if (e[nameField] === name) {
          IN += e[qtyField] !== undefined ? (e[qtyField] || 0) : (e.qty || 0);
        }
      });

      // OUT from completed MOs
      outMos.forEach(e => {
        if (e[nameField] === name) {
          OUT += e[compField] || 0;
        }
      });

      // RC & RJ from scrap entries
      scrap.forEach(e => {
        if (e.component === compType && e.componentName === name) {
          RC += e.receive || 0;
          RJ += e.reject  || 0;
        }
      });

      // RC & RJ from rework entries
      (reworks || []).forEach(e => {
        if (e.component === compType && e.componentName === name) {
          RC += e.receive || 0;
          RJ += e.reject  || 0;
        }
      });

      // RT from return entries
      returns.forEach(e => {
        if (e.isFullMO) {
          const mo = allMOs.find(m => m.id === e.moId);
          if (mo && mo[nameField] === name) {
            RT += mo[qtyField] !== undefined ? (mo[qtyField] || 0) : (mo.qty || 0);
          }
        } else if (e.component === compType) {
          const mo = allMOs.find(m => m.id === e.moId);
          if (mo && mo[nameField] === name) {
            RT += e.componentQty || 0;
          }
        }
      });

      const WIP = (IN + RC) - (RJ + RT + OUT);
      return { IN, RC, RJ, RT, OUT, WIP };
    };

    // ─── Category definitions ──────────────────────────────────────────────────
    const categories = [
      { key: 'pcbas',     label: 'PCBA'    },
      { key: 'batteries', label: 'Battery' },
      { key: 'coils',     label: 'Coil'    },
      { key: 'shells',    label: 'Shell'   },
      { key: 'lenses',    label: 'Lens'    },
    ];

    const hasPeriod   = !!(startDate && endDate);
    const fmtDT = (s) => s ? s.replace('T', ' ') : '';
    const periodLabel = hasPeriod ? `${fmtDT(startDate)} to ${fmtDT(endDate)}` : 'All Time';

    // ─── Build sheet data ──────────────────────────────────────────────────────
    const wsData = [];

    wsData.push(['UltraHuman Assembly — WIP Material Report (Component-Wise)']);
    wsData.push([`Period: ${periodLabel}`]);
    wsData.push([
      `Formula: WIP = (IN + RC) − (RJ + RT + OUT)` +
      `   |   IN = original plan qty (never reduced by returns)` +
      `   |   RT = returned qty (audit trail only, already subtracted in WIP)`,
    ]);
    wsData.push([]);

    wsData.push([
      '',
      hasPeriod ? '◄ ALL-TIME DATA ►' : '',
      '', '', '', '', '',
      '',
      hasPeriod ? `◄ SELECTED PERIOD: ${fmtDT(startDate)}  →  ${fmtDT(endDate)} ►` : '',
      '', '', '', '', '',
    ]);

    wsData.push([
      'MATERIAL / PART DESCRIPTION',
      'IN (Planned)',
      'RC (Received)',
      'RJ (Rejected)',
      'RT (Returned)',
      'OUT (Completed)',
      'WIP — All Time',
      '',
      hasPeriod ? 'IN (Period)'  : '',
      hasPeriod ? 'RC (Period)'  : '',
      hasPeriod ? 'RJ (Period)'  : '',
      hasPeriod ? 'RT (Period)'  : '',
      hasPeriod ? 'OUT (Period)' : '',
      hasPeriod ? 'WIP — Period' : '',
    ]);

    let grandIN = 0, grandRC = 0, grandRJ = 0, grandRT = 0, grandOUT = 0;
    let grandPIN = 0, grandPRC = 0, grandPRJ = 0, grandPRT = 0, grandPOUT = 0;

    categories.forEach(cat => {
      const names = (comps[cat.key] || [])
        .map(m => (typeof m === 'string' ? m : m.name))
        .filter(Boolean);

      wsData.push([`— ${cat.label.toUpperCase()} —`]);

      names.forEach(name => {
        const total  = calcStats(name, cat.key, allMOs,      allMOs,       allScrap,   allReturns, allReworks);
        const period = hasPeriod
          ? calcStats(name, cat.key, periodInMOs, periodOutMOs, periodScrap, periodReturns, periodReworks)
          : total;

        grandIN  += total.IN;
        grandRC  += total.RC;
        grandRJ  += total.RJ;
        grandRT  += total.RT;
        grandOUT += total.OUT;
        grandPIN  += period.IN;
        grandPRC  += period.RC;
        grandPRJ  += period.RJ;
        grandPRT  += period.RT;
        grandPOUT += period.OUT;

        wsData.push([
          name,
          total.IN,
          total.RC,
          total.RJ,
          total.RT,
          total.OUT,
          total.WIP,
          '',
          hasPeriod ? period.IN  : '',
          hasPeriod ? period.RC  : '',
          hasPeriod ? period.RJ  : '',
          hasPeriod ? period.RT  : '',
          hasPeriod ? period.OUT : '',
          hasPeriod ? period.WIP : '',
        ]);
      });
    });

    const grandWIP  = (grandIN  + grandRC)  - (grandRJ  + grandRT + grandOUT);
    const grandPWIP = (grandPIN + grandPRC) - (grandPRJ + grandPRT + grandPOUT);
    wsData.push([]);
    wsData.push([
      '★ GRAND TOTAL (All Components)',
      grandIN, grandRC, grandRJ, grandRT, grandOUT, grandWIP,
      '',
      hasPeriod ? grandPIN  : '',
      hasPeriod ? grandPRC  : '',
      hasPeriod ? grandPRJ  : '',
      hasPeriod ? grandPRT  : '',
      hasPeriod ? grandPOUT : '',
      hasPeriod ? grandPWIP : '',
    ]);

    // ─── Build worksheet ───────────────────────────────────────────────────────
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws['!cols'] = [
      { wch: 40 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 4  },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
    ];

    ws['!freeze'] = { xSplit: 1, ySplit: 5 };

    // ─── Styling ───────────────────────────────────────────────────────────────
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellRef = XLSX.utils.encode_cell({ c: C, r: R });
        const cell = ws[cellRef];
        if (!cell) continue;

        cell.s = {
          font: { name: 'Calibri', sz: 11 },
          alignment: { vertical: 'center' },
          border: {
            top:    { style: 'thin', color: { rgb: 'E5E7EB' } },
            bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
            left:   { style: 'thin', color: { rgb: 'E5E7EB' } },
            right:  { style: 'thin', color: { rgb: 'E5E7EB' } },
          },
        };

        const cellVal = String(cell.v || '');

        if (R === 0) {
          cell.s.font = { name: 'Calibri', sz: 18, bold: true, color: { rgb: '1E3A8A' } };
          cell.s.border = {};
        } else if (R === 1) {
          cell.s.font = { name: 'Calibri', sz: 12, color: { rgb: '6B7280' } };
          cell.s.border = {};
        } else if (R === 2) {
          cell.s.font = { name: 'Calibri', sz: 11, italic: true, color: { rgb: '059669' } };
          cell.s.border = {};
        } else if (R === 4) {
          if (cell.v && String(cell.v).startsWith('◄')) {
            cell.s.font = { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } };
            cell.s.fill = { fgColor: { rgb: C < 8 ? '1D4ED8' : '059669' } };
            cell.s.alignment = { vertical: 'center', horizontal: 'center' };
            cell.s.border = {};
          }
        } else if (R === 5) {
          cell.s.font = { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } };
          cell.s.fill = { fgColor: { rgb: C < 8 ? '1D4ED8' : '065F46' } };
          cell.s.alignment = { vertical: 'center', horizontal: 'center' };
        } else if (cellVal.startsWith('— ')) {
          cell.s.font = { name: 'Calibri', sz: 11, bold: true, color: { rgb: '991B1B' } };
          cell.s.fill = { fgColor: { rgb: 'FEE2E2' } };
          cell.s.alignment = { vertical: 'center', horizontal: 'left' };
        } else if (cellVal.startsWith('★')) {
          cell.s.font = { name: 'Calibri', sz: 12, bold: true, color: { rgb: 'FFFFFF' } };
          cell.s.fill = { fgColor: { rgb: '064E3B' } };
          cell.s.alignment = { vertical: 'center', horizontal: C === 0 ? 'left' : 'center' };
        } else if (C > 0 && R > 5) {
          cell.s.alignment = { vertical: 'center', horizontal: 'center' };
          if (C === 6 && typeof cell.v === 'number') {
            if (cell.v < 0) {
              cell.s.font = { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'DC2626' } };
            } else if (cell.v === 0) {
              cell.s.font = { name: 'Calibri', sz: 11, color: { rgb: '6B7280' } };
            } else {
              cell.s.font = { name: 'Calibri', sz: 11, bold: true, color: { rgb: '059669' } };
            }
          }
          if (C === 13 && typeof cell.v === 'number') {
            if (cell.v < 0) {
              cell.s.font = { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'DC2626' } };
            } else if (cell.v === 0) {
              cell.s.font = { name: 'Calibri', sz: 11, color: { rgb: '6B7280' } };
            } else {
              cell.s.font = { name: 'Calibri', sz: 11, bold: true, color: { rgb: '059669' } };
            }
          }
        }
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'WIP Report');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const safeStart = startDate ? startDate.replace(/[T:]/g, '-') : '';
    const safeEnd = endDate ? endDate.replace(/[T:]/g, '-') : '';
    const filename = startDate && endDate
      ? `WIP_Report_${safeStart}_to_${safeEnd}.xlsx`
      : `WIP_Report_AllTime.xlsx`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) {
    console.error('[WIP Report] Error:', err);
    res.status(500).json({ message: 'Server error generating WIP report' });
  }
};

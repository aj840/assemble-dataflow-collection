import db from '../db.js';
import XLSX from 'xlsx-js-style';
import { inLocalPeriod } from '../utils/dates.js';

// GET /api/stats/wip-excel?startDate=&endDate=
export const downloadWipExcel = (req, res) => {
  const { startDate, endDate } = req.query;

  const allMOs     = db.data.moEntries    || [];
  const allScrap   = db.data.scrapEntries || [];
  const allReturns = db.data.returnEntries || [];
  const allReworks = db.data.reworkEntries || [];
  const comps      = db.data.components   || {};

  // ─── DateTime filter helpers ───────────────────────────────────────────────
  // Use the shared inLocalPeriod utility which correctly handles both
  // "YYYY-MM-DD" (treated as local midnight/end-of-day) and full ISO timestamps.
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
  // category: 'batteries' | 'pcbas' | 'coils' | 'shells'
  // name    : specific component name string (e.g. '24mah battery')
  //
  // IN  = sum of <compQtyField> across all MOs that used this component
  // RC  = sum of scrap.receive + rework.receive  where component == compType && componentName == name
  // RJ  = sum of scrap.reject  + rework.reject   where component == compType && componentName == name
  // RT  = returns — qty physically reduced from MO already; column shown for audit trail
  // OUT = sum of <compCompField> for Completed MOs that used this component
  //
  // IN = (IN + RC) − (RJ + RT + OUT)
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

    // RC & RJ from rework entries (same formula — rework is logged as RC/RJ)
    (reworks || []).forEach(e => {
      if (e.component === compType && e.componentName === name) {
        RC += e.receive || 0;
        RJ += e.reject  || 0;
      }
    });

    // RT from return entries
    returns.forEach(e => {
      if (e.isFullMO) {
        // Full MO return: look up the MO and take its per-component qty
        const mo = allMOs.find(m => m.id === e.moId);
        if (mo && mo[nameField] === name) {
          RT += mo[qtyField] !== undefined ? (mo[qtyField] || 0) : (mo.qty || 0);
        }
      } else if (e.component === compType) {
        // Single-component return: only count if the MO used this named component
        const mo = allMOs.find(m => m.id === e.moId);
        if (mo && mo[nameField] === name) {
          RT += e.componentQty || 0;
        }
      }
    });

    // NEW formula: WIP = (IN + RC) − (RJ + RT + OUT)
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

  // Title rows
  wsData.push(['UltraHuman Assembly — WIP Material Report (Component-Wise)']);     // row 0
  wsData.push([`Period: ${periodLabel}`]);                                           // row 1
  wsData.push([                                                                      // row 2
    `Formula: WIP = (IN + RC) − (RJ + RT + OUT)` +
    `   |   IN = original plan qty (never reduced by returns)` +
    `   |   RT = returned qty (audit trail only, already subtracted in WIP)`,
  ]);
  wsData.push([]);  // row 3 — spacer

  // Row 4 — group header (only useful when period is active)
  wsData.push([
    '',
    hasPeriod ? '◄ ALL-TIME DATA ►' : '',
    '', '', '', '', '',
    '',
    hasPeriod ? `◄ SELECTED PERIOD: ${fmtDT(startDate)}  →  ${fmtDT(endDate)} ►` : '',
    '', '', '', '', '',
  ]);

  // Row 5 — column headers
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

  // Grand totals accumulators
  let grandIN = 0, grandRC = 0, grandRJ = 0, grandRT = 0, grandOUT = 0;
  let grandPIN = 0, grandPRC = 0, grandPRJ = 0, grandPRT = 0, grandPOUT = 0;

  categories.forEach(cat => {
    const materialList = comps[cat.key] || [];
    const names = materialList
      .map(m => (typeof m === 'string' ? m : m.name))
      .filter(Boolean);

    // Section separator
    wsData.push([`— ${cat.label.toUpperCase()} —`]);

    names.forEach(name => {
      const total  = calcStats(name, cat.key, allMOs,      allMOs,       allScrap,   allReturns, allReworks);
      const period = hasPeriod
        ? calcStats(name, cat.key, periodInMOs, periodOutMOs, periodScrap, periodReturns, periodReworks)
        : total;

      // Accumulate grand totals (always all-time)
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

  // Grand total row
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
    { wch: 40 }, // Part Description
    { wch: 14 }, // IN
    { wch: 14 }, // RC
    { wch: 14 }, // RJ
    { wch: 14 }, // RT
    { wch: 14 }, // OUT
    { wch: 14 }, // WIP
    { wch: 4  }, // spacer
    { wch: 12 }, // Period IN
    { wch: 12 }, // Period RC
    { wch: 12 }, // Period RJ
    { wch: 12 }, // Period RT
    { wch: 12 }, // Period OUT
    { wch: 12 }, // Period WIP
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
        // Main title
        cell.s.font = { name: 'Calibri', sz: 18, bold: true, color: { rgb: '1E3A8A' } };
        cell.s.border = {};
      } else if (R === 1) {
        // Period subtitle
        cell.s.font = { name: 'Calibri', sz: 12, color: { rgb: '6B7280' } };
        cell.s.border = {};
      } else if (R === 2) {
        // Formula row
        cell.s.font = { name: 'Calibri', sz: 11, italic: true, color: { rgb: '059669' } };
        cell.s.border = {};
      } else if (R === 4) {
        // Group header row (ALL-TIME vs PERIOD)
        if (cell.v && String(cell.v).startsWith('◄')) {
          cell.s.font = { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } };
          cell.s.fill = { fgColor: { rgb: C < 8 ? '1D4ED8' : '059669' } }; // blue for all-time, green for period
          cell.s.alignment = { vertical: 'center', horizontal: 'center' };
          cell.s.border = {};
        }
      } else if (R === 5) {
        // Column header row
        cell.s.font = { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } };
        cell.s.fill = { fgColor: { rgb: C < 8 ? '1D4ED8' : '065F46' } }; // blue for all-time, dark-green for period
        cell.s.alignment = { vertical: 'center', horizontal: 'center' };
      } else if (cellVal.startsWith('— ')) {
        // Section separator
        cell.s.font = { name: 'Calibri', sz: 11, bold: true, color: { rgb: '991B1B' } };
        cell.s.fill = { fgColor: { rgb: 'FEE2E2' } };
        cell.s.alignment = { vertical: 'center', horizontal: 'left' };
      } else if (cellVal.startsWith('★')) {
        // Grand total row
        cell.s.font = { name: 'Calibri', sz: 12, bold: true, color: { rgb: 'FFFFFF' } };
        cell.s.fill = { fgColor: { rgb: '064E3B' } };
        cell.s.alignment = { vertical: 'center', horizontal: C === 0 ? 'left' : 'center' };
      } else if (C > 0 && R > 5) {
        // Data numbers
        cell.s.alignment = { vertical: 'center', horizontal: 'center' };

        // WIP column (index 6) — colour code
        if (C === 6 && typeof cell.v === 'number') {
          if (cell.v < 0) {
            cell.s.font = { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'DC2626' } };
          } else if (cell.v === 0) {
            cell.s.font = { name: 'Calibri', sz: 11, color: { rgb: '6B7280' } };
          } else {
            cell.s.font = { name: 'Calibri', sz: 11, bold: true, color: { rgb: '059669' } };
          }
        }
        // Period WIP column (index 13) — same colour logic
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
};

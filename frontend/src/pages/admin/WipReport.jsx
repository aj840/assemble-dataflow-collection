import { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import GlassIcon from '../../components/GlassIcon';

/* ─── Colour palette ───────────────────────────────────────────────── */
const COL = {
  IN:  { text: '#2563eb', bg: '#eff6ff' },
  RC:  { text: '#16a34a', bg: '#f0fdf4' },
  RJ:  { text: '#dc2626', bg: '#fff1f2' },
  RT:  { text: '#d97706', bg: '#fffbeb' },
  OUT: { text: '#7c3aed', bg: '#f5f3ff' },
  WIP: { text: '#0f172a', bg: '#f8fafc' },
};

const Badge = ({ label }) => (
  <span style={{
    background: COL[label]?.bg, color: COL[label]?.text,
    padding: '2px 10px', borderRadius: 20,
    fontSize: 11, fontWeight: 800, letterSpacing: 0.5
  }}>{label}</span>
);

export default function WipReport() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate]     = useState('');
  const [report, setReport]       = useState(null);
  const [stats,  setStats]        = useState(null);
  const [loading, setLoading]     = useState(false);
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate)   params.endDate   = endDate;

      const [statsData, reportData] = await Promise.all([
        api.getStats(params),
        startDate && endDate ? api.getReport({ startDate, endDate }) : Promise.resolve(null),
      ]);
      setStats(statsData);
      setReport(reportData);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  const downloadExcel = async () => {
    setDownloading(true);
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate)   params.endDate   = endDate;
      const url  = api.exportWipUrl(params);
      const link = document.createElement('a');
      link.href  = url;
      link.setAttribute('download', startDate && endDate
        ? `WIP_Report_${startDate.replace(/[T:]/g, '-')}_to_${endDate.replace(/[T:]/g, '-')}.xlsx`
        : 'WIP_Report_AllTime.xlsx');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch(e) { alert('Download failed'); }
    finally { setTimeout(() => setDownloading(false), 1500); }
  };

  const wip = stats?.wip || {};

  /* ── Per-category rows from report ── */
  const cats = report
    ? [
        { label: 'PCBA',    key: 'pcbas',     color: '#16a34a' },
        { label: 'Battery', key: 'batteries', color: '#2563eb' },
        { label: 'Coil',    key: 'coils',     color: '#7c3aed' },
        { label: 'Shell',   key: 'shells',    color: '#d97706' },
        { label: 'Lens',    key: 'lenses',    color: '#e67e22' },
      ]
    : [];

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ margin: 0 }}>WIP Report</h2>
          <p className="text-muted text-sm" style={{ marginTop: 4 }}>
            Work-In-Progress inventory across all components. Formula: <strong>WIP = (IN + RC) − (RJ + RT + OUT)</strong>
          </p>
          <p className="text-muted" style={{ fontSize: 11, marginTop: 4, color: '#6b7280' }}>
            <em>Note: IN is already net of Returns — returning an MO physically reduces the collected quantity in the database.</em>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>From</label>
            <input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ width: 180, fontSize: 13 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>To</label>
            <input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ width: 180, fontSize: 13 }} />
          </div>
          {(startDate || endDate) && (
            <button className="btn btn-secondary btn-sm" onClick={() => { setStartDate(''); setEndDate(''); }}>
              Clear
            </button>
          )}
          <button className="btn btn-primary btn-sm" onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <GlassIcon name="search" size={13} color="#fff" /> Refresh
          </button>
          <button
            className="btn btn-sm"
            onClick={downloadExcel}
            disabled={downloading}
            style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
          >
            {downloading ? 'Generating…' : <><GlassIcon name="export" size={13} color="#fff" /> Download Excel</>}
          </button>
        </div>
      </div>

      {/* ── Summary WIP tiles ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'IN',  value: wip.IN,  desc: 'Total Collected (net)' },
          { label: 'RC',  value: wip.RC,  desc: 'Scrap / Rework Received' },
          { label: 'RJ',  value: wip.RJ,  desc: 'Scrap / Rework Rejected' },
          { label: 'RT',  value: wip.RT,  desc: 'Returned (for audit)' },
          { label: 'OUT', value: wip.OUT, desc: 'MO Completed' },
          { label: 'WIP', value: wip.WIP, desc: 'Current Stock In-Hand' },
        ].map(item => (
          <div
            key={item.label}
            className="card"
            style={{
              padding: '18px 14px', textAlign: 'center',
              border: `2px solid ${COL[item.label]?.bg || '#e5e7eb'}`,
              background: item.label === 'WIP'
                ? `linear-gradient(135deg, ${COL.WIP.bg}, #fff)`
                : COL[item.label]?.bg,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.8, color: COL[item.label]?.text, marginBottom: 4 }}>
              {item.label}
            </div>
            <div style={{
              fontSize: item.label === 'WIP' ? '2rem' : '1.6rem',
              fontWeight: 800, color: COL[item.label]?.text, lineHeight: 1.1,
              color: item.label === 'WIP' && (wip.WIP < 0) ? '#dc2626' : COL[item.label]?.text,
            }}>
              {loading ? '…' : (item.value ?? 0).toLocaleString()}
            </div>
            <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 5 }}>{item.desc}</div>
          </div>
        ))}
      </div>

      {/* ── Per-component detail table (only if period selected) ── */}
      {!startDate || !endDate ? (
        <div className="card" style={{ padding: '40px 24px', textAlign: 'center' }}>
          <GlassIcon name="document" size={48} color="#d1d5db" />
          <p style={{ marginTop: 16, color: '#9ca3af', fontSize: 14 }}>
            Select a date range above to view the per-component WIP breakdown table.
          </p>
        </div>
      ) : loading ? (
        <div className="card" style={{ padding: '40px 24px', textAlign: 'center' }}>
          <span className="spinner" style={{ display: 'inline-block' }} />
          <p style={{ marginTop: 12, color: '#9ca3af' }}>Loading component data…</p>
        </div>
      ) : (
        cats.map(cat => {
          const rows = (report?.detailed?.[cat.key] || []).filter(r => r.in > 0 || r.received > 0 || r.reject > 0 || r.return > 0 || r.out > 0);
          if (rows.length === 0) return null;

          return (
            <div key={cat.key} className="card" style={{ marginBottom: 20 }}>
              <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color }} />
                <h3 style={{ margin: 0, color: cat.color }}>{cat.label}</h3>
                <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 4 }}>{rows.length} component{rows.length > 1 ? 's' : ''}</span>
                {/* row-level totals */}
                {(() => {
                  const tot = rows.reduce((s, r) => ({
                    in: s.in + r.in, rc: s.rc + (r.received||0), rj: s.rj + (r.reject||0),
                    rt: s.rt + (r.return||0), out: s.out + r.out,
                  }), { in: 0, rc: 0, rj: 0, rt: 0, out: 0 });
                  const catWip = (tot.in + tot.rc) - (tot.rj + tot.rt + tot.out);
                  return (
                    <span style={{ marginLeft: 'auto', fontSize: 12, color: '#6b7280' }}>
                      Category WIP:&nbsp;
                      <strong style={{ color: catWip < 0 ? '#dc2626' : '#16a34a', fontSize: 14 }}>
                        {catWip.toLocaleString()}
                      </strong>
                    </span>
                  );
                })()}
              </div>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Component Name</th>
                      <th style={{ textAlign: 'right', color: COL.IN.text }}>IN</th>
                      <th style={{ textAlign: 'right', color: COL.RC.text }}>RC</th>
                      <th style={{ textAlign: 'right', color: COL.RJ.text }}>RJ</th>
                      <th style={{ textAlign: 'right', color: COL.RT.text }}>RT (audit)</th>
                      <th style={{ textAlign: 'right', color: COL.OUT.text }}>OUT</th>
                      <th style={{ textAlign: 'right' }}>WIP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((item, i) => {
                      const rowWip = (item.in + (item.received||0)) - ((item.reject||0) + (item.return||0) + item.out);
                      return (
                        <tr key={i}>
                          <td style={{ fontWeight: 600, color: '#374151' }}>{item.name}</td>
                          <td style={{ textAlign: 'right', color: COL.IN.text, fontWeight: 600 }}>{item.in.toLocaleString()}</td>
                          <td style={{ textAlign: 'right', color: COL.RC.text, fontWeight: 600 }}>{(item.received||0).toLocaleString()}</td>
                          <td style={{ textAlign: 'right', color: COL.RJ.text, fontWeight: 600 }}>{(item.reject||0).toLocaleString()}</td>
                          <td style={{ textAlign: 'right', color: COL.RT.text, fontSize: 12 }}>{(item.return||0).toLocaleString()}</td>
                          <td style={{ textAlign: 'right', color: COL.OUT.text, fontWeight: 600 }}>{item.out.toLocaleString()}</td>
                          <td style={{ textAlign: 'right' }}>
                            <span style={{
                              fontWeight: 800,
                              fontSize: 13,
                              color: rowWip < 0 ? '#dc2626' : rowWip === 0 ? '#6b7280' : '#16a34a',
                              background: rowWip < 0 ? '#fff1f2' : rowWip === 0 ? '#f3f4f6' : '#f0fdf4',
                              padding: '2px 10px', borderRadius: 20,
                            }}>
                              {rowWip.toLocaleString()}
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Category total row */}
                    {(() => {
                      const tot = rows.reduce((s, r) => ({
                        in: s.in + r.in, rc: s.rc + (r.received||0), rj: s.rj + (r.reject||0),
                        rt: s.rt + (r.return||0), out: s.out + r.out,
                      }), { in: 0, rc: 0, rj: 0, rt: 0, out: 0 });
                      const catWip = (tot.in + tot.rc) - (tot.rj + tot.rt + tot.out);
                      return (
                        <tr style={{ background: '#f8fafc', fontWeight: 800, borderTop: '2px solid #e5e7eb' }}>
                          <td style={{ color: '#1e293b' }}>★ {cat.label} Total</td>
                          <td style={{ textAlign: 'right', color: COL.IN.text }}>{tot.in.toLocaleString()}</td>
                          <td style={{ textAlign: 'right', color: COL.RC.text }}>{tot.rc.toLocaleString()}</td>
                          <td style={{ textAlign: 'right', color: COL.RJ.text }}>{tot.rj.toLocaleString()}</td>
                          <td style={{ textAlign: 'right', color: COL.RT.text }}>{tot.rt.toLocaleString()}</td>
                          <td style={{ textAlign: 'right', color: COL.OUT.text }}>{tot.out.toLocaleString()}</td>
                          <td style={{ textAlign: 'right' }}>
                            <span style={{
                              fontWeight: 900, fontSize: 14,
                              color: catWip < 0 ? '#dc2626' : catWip === 0 ? '#6b7280' : '#16a34a',
                              background: catWip < 0 ? '#fff1f2' : catWip === 0 ? '#f3f4f6' : '#f0fdf4',
                              padding: '3px 12px', borderRadius: 20,
                            }}>
                              {catWip.toLocaleString()}
                            </span>
                          </td>
                        </tr>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}

      {/* Legend */}
      <div className="card" style={{ padding: '14px 20px', marginTop: 8 }}>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Legend:</span>
          {[
            { key: 'IN',  desc: 'Collected from MOs (net after returns)' },
            { key: 'RC',  desc: 'Scrap/Rework Received back into stock' },
            { key: 'RJ',  desc: 'Rejected / Scrapped' },
            { key: 'RT',  desc: 'Returned to supplier (shown for audit, already reflected in IN)' },
            { key: 'OUT', desc: 'Assembled & finished (MO Completed)' },
            { key: 'WIP', desc: '= (IN + RC) − (RJ + RT + OUT)' },
          ].map(l => (
            <div key={l.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Badge label={l.key} />
              <span style={{ fontSize: 11, color: '#6b7280' }}>{l.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

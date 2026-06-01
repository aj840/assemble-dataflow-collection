import { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import GlassIcon from '../../components/GlassIcon';
import ModalPortal from '../../components/ModalPortal';
import MaterialBreakdown from '../../components/MaterialBreakdown';

const BarChart = ({ data }) => {
  const max = Math.max(...data.map(d => Math.max(d.income, d.completed)), 1);
  return (
    <div>
      <div className="chart-container" style={{ height: 180 }}>
        {data.map((d, i) => (
          <div key={i} className="chart-bar-group" style={{ gap: 2 }}>
            <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: '100%' }}>
              <div className="chart-bar income" style={{ height: `${(d.income / max) * 100}%`, width: 14 }} title={`Income: ${d.income}`} />
              <div className="chart-bar outgo" style={{ height: `${(d.completed / max) * 100}%`, width: 14 }} title={`Completed: ${d.completed}`} />
            </div>
            <div className="chart-label">{d.day}</div>
          </div>
        ))}
      </div>
      <div className="chart-legend">
        <div className="chart-legend-item"><div className="legend-dot" style={{ background: '#2563eb' }} />Incoming MOs</div>
        <div className="chart-legend-item"><div className="legend-dot" style={{ background: '#60a5fa' }} />Completed MOs</div>
      </div>
    </div>
  );
};

export default function AdminDashboard({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [exportModal, setExportModal] = useState(false);
  const [exportData, setExportData] = useState([]);
  const [moSearch, setMoSearch] = useState('');

  // Report Modal
  const [reportModal, setReportModal] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [reportStart, setReportStart] = useState('');
  const [reportEnd, setReportEnd] = useState('');
  const [generatingReport, setGeneratingReport] = useState(false);

  // WIP Specific Report
  const [wipStart, setWipStart] = useState('');
  const [wipEnd, setWipEnd] = useState('');
  const [downloadingWip, setDownloadingWip] = useState(false);

  const handleDownloadWipExcel = async () => {
    if (!wipStart || !wipEnd) return alert('Please select both start and end date/time for the WIP report.');
    setDownloadingWip(true);
    try {
      const params = { startDate: wipStart, endDate: wipEnd };
      const url = api.exportWipUrl(params);
      const link = document.createElement('a');
      link.href = url;
      const safeStart = wipStart.replace(/[T:]/g, '-');
      const safeEnd   = wipEnd.replace(/[T:]/g, '-');
      link.setAttribute('download', `WIP_Report_${safeStart}_to_${safeEnd}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch(e) {
      console.error(e);
      alert('Failed to download WIP report.');
    } finally {
      setTimeout(() => setDownloadingWip(false), 1500);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const data = await api.getStats(params);
      setStats(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [startDate, endDate]);

  useEffect(() => {
    const t = setTimeout(() => load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const handleSystemExport = async () => {
    if (!startDate || !endDate) return alert('Please select a start and end date for the export.');
    if (startDate > endDate) return alert('Start date must be before end date.');
    try {
      const mos = await api.getMOs({ startDate, endDate });
      setExportData(mos);
      setExportModal(true);
    } catch (e) {
      console.error(e);
      alert('Failed to load MO data for export.');
    }
  };

  const handleDownloadCSV = () => {
    if (exportData.length === 0) return;
    const headers = ['MO Number', 'SKU', 'Status', 'Entry Date', 'Close Date', 'Total QTY', 'Completed QTY', 'Battery', 'PCBA', 'Coil', 'Shell'];
    const rows = exportData.map(m => {
      const entryDate = m.createdAt ? new Date(m.createdAt).toLocaleString() : '';
      const closeDate = m.completedAt ? new Date(m.completedAt).toLocaleString() : '';
      return [
        m.moNumber || '', m.sku || '', m.status || '', entryDate, closeDate,
        m.qty || 0, m.completedQty || 0,
        `${m.batteryComp || 0}/${m.batteryQty || 0} (${m.battery || '-'})`,
        `${m.pcbaComp || 0}/${m.pcbaQty || 0} (${m.pcba || '-'})`,
        `${m.coilComp || 0}/${m.coilQty || 0} (${m.coil || '-'})`,
        `${m.shellComp || 0}/${m.shellQty || 0} (${m.shell || '-'})`
      ];
    });
    const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `UltraHuman Assembly_Export_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  const handleGenerateReport = async () => {
    if (!reportStart || !reportEnd) return alert('Please select both start and end dates/times.');
    setGeneratingReport(true);
    try {
      const data = await api.getReport({ startDate: reportStart, endDate: reportEnd });
      setReportData(data);
    } catch (e) {
      console.error(e);
      alert('Failed to generate report.');
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleDownloadReportExcel = () => {
    if (!reportData) return;
    const { summary, detailed } = reportData;
    let csv = `UltraHuman Assembly Full Report\nPeriod,${reportData.period.start},to,${reportData.period.end}\n\n`;
    csv += `Summary\nTotal MOs,${summary.totalMOs}\nCompleted MOs,${summary.completedMOs}\nPending MOs,${summary.pendingMOs}\nTotal Qty Planned,${summary.totalQtyPlanned}\nTotal Qty Completed,${summary.totalQtyCompleted}\n\n`;
    
    csv += `Detailed Material Usage\nComponent Type,IN,Received (RC),Reject (RJ),Return (RT),OUT (Completed)\n`;
    ['batteries', 'pcbas', 'coils', 'shells', 'lenses'].forEach(cat => {
      csv += `${cat.toUpperCase()}\n`;
      (detailed[cat] || []).forEach(c => {
        csv += `"${c.name}",${c.in},${c.received},${c.reject},${c.return},${c.out}\n`;
      });
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `UltraHuman_FullReport_${reportStart.replace(/:/g, '')}_to_${reportEnd.replace(/:/g, '')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };



  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
      {/* Header - Spans across all 4 columns */}
      <div style={{ gridColumn: 'span 4', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <h2 style={{ margin: 0 }}>Admin Dashboard</h2>
            {onNavigate && (
              <button 
                onClick={() => onNavigate('trash')}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 8, display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}
                title="View Trash Bin"
                onMouseEnter={e => e.currentTarget.style.background = '#e0e7ff'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <GlassIcon name="shield" size={20} color="#4f46e5" />
              </button>
            )}
          </div>
          <p className="text-muted text-sm">System-wide performance metrics and management hub.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ width: 175, fontSize: 12 }} />
          <span className="text-muted">to</span>
          <input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ width: 175, fontSize: 12 }} />
          {(startDate || endDate) && (
            <button className="btn btn-secondary btn-sm" onClick={() => { setStartDate(''); setEndDate(''); }}>Clear</button>
          )}
          <input
            placeholder="Search MO (last 3-4 digits)"
            value={moSearch}
            onChange={e => setMoSearch(e.target.value)}
            style={{ width: 200, fontSize: 12 }}
          />
          <button className="btn btn-secondary btn-sm" onClick={handleSystemExport} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <GlassIcon name="export" size={14} color="#374151" /> System Export
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setReportModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <GlassIcon name="document" size={14} color="#fff" /> Generate Full Report
          </button>
        </div>
      </div>

      {/* Stats row - 4 cards across 4 columns */}
      {[
        { label: 'Total Users', value: stats?.totalUsers ?? '—', badge: '+Active', badgeColor: 'success', icon: 'users' },
        { label: 'Income Today', value: stats?.incomeToday ?? '—', badge: 'New MOs', badgeColor: 'primary', icon: 'export' },
        { label: 'Outgo Today', value: stats?.outgoToday ?? '—', badge: 'Completed', badgeColor: 'success', icon: 'database' },
        { label: 'Pending MOs', value: stats?.pendingMOs ?? '—', badge: 'Open', badgeColor: 'warning', icon: 'audit' },
      ].map((s, i) => (
        <div key={i} className="card stat-card" style={{ padding: '24px 20px', minWidth: 0 }}>
          <div className="stat-label" style={{ fontSize: 11 }}>
            <GlassIcon name={s.icon} size={18} color={s.badgeColor === 'primary' ? '#2563eb' : s.badgeColor === 'warning' ? '#d97706' : '#16a34a'} style={{ marginRight: 6 }} />
            <span>{s.label}</span>
            <span className={`stat-badge badge-${s.badgeColor}`} style={{ background: s.badgeColor === 'primary' ? '#eff6ff' : s.badgeColor === 'warning' ? '#fffbeb' : '#f0fdf4', color: s.badgeColor === 'primary' ? '#2563eb' : s.badgeColor === 'warning' ? '#d97706' : '#16a34a', marginLeft: 'auto' }}>
              {s.badge}
            </span>
          </div>
          <div className="stat-value" style={{ fontSize: '2.2rem', color: '#1e40af', marginTop: 8 }}>{loading ? '...' : s.value}</div>
        </div>
      ))}

      {/* Main Content (Charts & Modules) - Spans Full Width */}
      <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          {/* Chart */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0 }}>SKU Parsing Performance</h3>
                <p className="text-sm text-muted">Daily incoming vs. completed MO counts</p>
              </div>
              {stats?.weeklyData && (
                <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
                  ↑ Live Tracking
                </span>
              )}
            </div>
            <div className="card-body">
              {stats?.weeklyData ? <BarChart data={stats.weeklyData} /> : <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="spinner" /></div>}
            </div>
          </div>

          {/* Donut / Breakdown */}
          <div className="card">
            <div className="card-header"><h3 style={{ margin: 0 }}>MO Status Breakdown</h3></div>
            <div className="card-body">
              {stats && (
                <div>
                  {[
                    { label: 'Completed', value: stats.completedMOs || 0, color: '#2563eb' },
                    { label: 'Pending', value: stats.pendingMOs || 0, color: '#d97706' },
                  ].map(item => (
                    <div key={item.label} style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span className="text-sm font-semibold">{item.label}</span>
                        <span className="text-sm font-semibold">{item.value}</span>
                      </div>
                      <div className="progress-bar-wrap" style={{ height: 8 }}>
                        <div className="progress-bar-fill" style={{ width: `${stats.totalMOs ? (item.value / stats.totalMOs) * 100 : 0}%`, background: item.color }} />
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #f3f4f6' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="text-sm text-muted">Total Planned QTY</span>
                      <span className="text-sm font-semibold">{stats.totalQtyPlanned?.toLocaleString() || 0}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                      <span className="text-sm text-muted">Balance QTY</span>
                      <span className="text-sm font-semibold" style={{ color: '#d97706' }}>{stats.balanceQty?.toLocaleString() || 0}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>


      {/* WIP Formula Card */}
      {stats?.wip && (
        <div style={{ gridColumn: 'span 4' }}>
          <div className="card" style={{ background: 'linear-gradient(135deg,#0f172a,#1e3a5f)', color: '#fff', border: 'none', marginBottom: 24 }}>
            <div className="card-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <GlassIcon name="clock" size={18} color="#60a5fa" />
                  <h3 style={{ margin: 0, color: '#fff' }}>WIP — Work In Progress</h3>
                  <span style={{ background: '#3b82f6', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>Live Formula</span>
                </div>
                <div style={{ fontSize: 13, color: '#93c5fd', fontWeight: 700 }}>WIP = (IN + RC) − (RJ + OUT) &nbsp;·&nbsp; <span style={{ fontWeight: 400, fontSize: 11, color: '#64748b' }}>IN is already net of Returns (RT)</span></div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', background: 'rgba(0,0,0,0.15)', padding: '10px 14px', borderRadius: 8 }}>
                <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>📊 WIP Report — Date &amp; Time Range:</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 10, color: '#64748b' }}>From</span>
                  <input
                    type="datetime-local"
                    value={wipStart}
                    onChange={e => setWipStart(e.target.value)}
                    style={{ width: 185, padding: '4px 8px', fontSize: 12, background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 6, colorScheme: 'dark' }}
                  />
                </div>
                <span style={{ color: '#475569', fontSize: 14 }}>→</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 10, color: '#64748b' }}>To</span>
                  <input
                    type="datetime-local"
                    value={wipEnd}
                    onChange={e => setWipEnd(e.target.value)}
                    style={{ width: 185, padding: '4px 8px', fontSize: 12, background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 6, colorScheme: 'dark' }}
                  />
                </div>
                {(wipStart || wipEnd) && (
                  <button onClick={() => { setWipStart(''); setWipEnd(''); }} className="btn btn-sm" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', padding: '4px 8px', fontSize: 11, borderRadius: 6 }}>Clear</button>
                )}
                <button onClick={handleDownloadWipExcel} disabled={downloadingWip} className="btn btn-sm" style={{ background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', border: 'none', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s', padding: '6px 14px', borderRadius: 6, fontWeight: 600, fontSize: 12 }}>
                  {downloadingWip ? (
                    <><span className="spinner" style={{ display: 'inline-block', width: 14, height: 14, borderWidth: 2, borderColor: '#fff', borderRightColor: 'transparent' }} /> Generating...</>
                  ) : (
                    <><GlassIcon name="export" size={14} color="#fff" /> Download Excel</>
                  )}
                </button>
              </div>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
                {[
                  { label: 'IN',  value: stats.wip.IN,  desc: 'Total Planned',    color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' },
                  { label: 'RC',  value: stats.wip.RC,  desc: 'Received (Scrap)', color: '#34d399', bg: 'rgba(52,211,153,0.15)' },
                  { label: 'RJ',  value: stats.wip.RJ,  desc: 'Rejected (Scrap)', color: '#f87171', bg: 'rgba(248,113,113,0.15)' },
                  { label: 'RT',  value: stats.wip.RT,  desc: 'Returned (Stock)', color: '#f472b6', bg: 'rgba(244,114,182,0.15)' },
                  { label: 'OUT', value: stats.wip.OUT, desc: 'MO Closed',         color: '#a78bfa', bg: 'rgba(167,139,250,0.15)' },
                  { label: 'WIP', value: stats.wip.WIP, desc: 'Work In Progress',  color: '#fbbf24', bg: 'rgba(251,191,36,0.15)', large: true },
                ].map(w => (
                  <div key={w.label} style={{ background: w.bg, borderRadius: 12, padding: '18px 12px', textAlign: 'center', border: `1px solid ${w.color}30` }}>
                    <div style={{ fontSize: 11, color: w.color, fontWeight: 700, marginBottom: 6, letterSpacing: 1 }}>{w.label}</div>
                    <div style={{ fontSize: w.large ? '2.2rem' : '1.8rem', fontWeight: 800, color: w.color }}>{(w.value || 0).toLocaleString()}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>{w.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Material Breakdown */}
      {stats?.breakdown && (
        <div style={{ gridColumn: 'span 4' }}>
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <GlassIcon name="database" size={18} color="#7c3aed" />
              <h3 style={{ margin: 0 }}>Material Breakdown by Type</h3>
              <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 4 }}>Battery · PCBA · Coil · Shell · Lens (all MOs)</span>
            </div>
            <div className="card-body">
              <MaterialBreakdown breakdown={stats.breakdown} />
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {exportModal && (
        <ModalPortal>
          <div className="modal-overlay" onClick={() => setExportModal(false)}>
            <div className="modal print-area" onClick={e => e.stopPropagation()} style={{ maxWidth: 900 }}>
              <div className="modal-header no-print">
                <h3>System Data Export</h3>
                <button className="btn-icon" onClick={() => setExportModal(false)}>✕</button>
              </div>
              
              {/* Print Header (Only visible when printing) */}
              <div style={{ display: 'none' }} className="print-header">
                <h2>UltraHuman Assembly Production Report</h2>
                <p>Reporting Period: {startDate} to {endDate}</p>
                <br/>
              </div>

              <div style={{ marginBottom: 20 }}>
                <p className="text-sm text-muted no-print" style={{ marginBottom: 16 }}>
                  Showing <strong>{exportData.length}</strong> records from {startDate} to {endDate}.
                </p>
                <div style={{ maxHeight: 400, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead style={{ position: 'sticky', top: 0, background: '#f9fafb', zIndex: 1 }}>
                      <tr>
                        <th style={{ padding: '8px', borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>MO</th>
                        <th style={{ padding: '8px', borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>SKU</th>
                        <th style={{ padding: '8px', borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>Status</th>
                        <th style={{ padding: '8px', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>Completion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exportData.length === 0 ? (
                        <tr><td colSpan={4} style={{ textAlign: 'center', padding: 20, color: '#6b7280' }}>No records found</td></tr>
                      ) : (
                        exportData.map(m => (
                          <tr key={m.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '8px', color: '#374151', fontWeight: 500 }}>{m.moNumber}</td>
                            <td style={{ padding: '8px', color: '#6b7280' }}>{m.sku}</td>
                            <td style={{ padding: '8px' }}>
                              <span style={{ color: m.status === 'Completed' ? '#16a34a' : '#d97706', fontWeight: 600 }}>{m.status}</span>
                            </td>
                            <td style={{ padding: '8px', textAlign: 'right', fontWeight: 500 }}>{m.completedQty || 0} / {m.qty}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="modal-footer no-print">
                <button className="btn btn-secondary" onClick={() => setExportModal(false)}>Cancel</button>
                <button className="btn btn-secondary" onClick={handleDownloadPDF} disabled={exportData.length === 0}>
                  📄 Download PDF
                </button>
                <button className="btn btn-success" onClick={handleDownloadCSV} disabled={exportData.length === 0}>
                  📊 Export Google Sheet
                </button>
              </div>
            </div>
            
            <style>{`
              @media print {
                .print-header { display: block !important; margin-bottom: 20px; }
                .modal.print-area { max-width: 100% !important; box-shadow: none !important; border: none !important; padding: 0 !important; margin: 0 !important; }
                div[style*="overflowY"] { overflow: visible !important; max-height: none !important; border: none !important; }
                table { width: 100% !important; }
              }
            `}</style>
          </div>
        </ModalPortal>
      )}

      {/* Full Report Modal */}
      {reportModal && (
        <ModalPortal>
          <div className="modal-overlay" onClick={() => setReportModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 800, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
              <div className="modal-header">
                <h3>Generate Full Report</h3>
                <button className="btn-icon" onClick={() => setReportModal(false)}>✕</button>
              </div>
              <div className="modal-body" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 24, padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4, display: 'block' }}>Start Time</label>
                    <input type="datetime-local" value={reportStart} onChange={e => setReportStart(e.target.value)} style={{ width: '100%' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4, display: 'block' }}>End Time</label>
                    <input type="datetime-local" value={reportEnd} onChange={e => setReportEnd(e.target.value)} style={{ width: '100%' }} />
                  </div>
                  <button className="btn btn-primary" onClick={handleGenerateReport} disabled={generatingReport} style={{ alignSelf: 'flex-end', height: 38 }}>
                    {generatingReport ? 'Loading...' : 'Generate Report'}
                  </button>
                </div>

                {reportData && (
                  <div id="full-report-content" style={{ padding: 24, border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff' }}>
                    <h2 style={{ textAlign: 'center', color: '#0f172a', marginBottom: 8 }}>Assembly Production Report</h2>
                    <p style={{ textAlign: 'center', color: '#64748b', fontSize: 14, marginBottom: 24 }}>
                      Period: {new Date(reportData.period.start).toLocaleString()} — {new Date(reportData.period.end).toLocaleString()}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 32 }}>
                      <div style={{ padding: 12, background: '#f8fafc', borderRadius: 6, textAlign: 'center' }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: '#334155' }}>{reportData.summary.totalMOs}</div>
                        <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase' }}>Total MOs</div>
                      </div>
                      <div style={{ padding: 12, background: '#f0fdf4', borderRadius: 6, textAlign: 'center' }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: '#16a34a' }}>{reportData.summary.completedMOs}</div>
                        <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase' }}>Completed MOs</div>
                      </div>
                      <div style={{ padding: 12, background: '#fffbeb', borderRadius: 6, textAlign: 'center' }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: '#d97706' }}>{reportData.summary.pendingMOs}</div>
                        <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase' }}>Pending MOs</div>
                      </div>
                      <div style={{ padding: 12, background: '#eff6ff', borderRadius: 6, textAlign: 'center' }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: '#2563eb' }}>{reportData.summary.totalQtyPlanned}</div>
                        <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase' }}>Planned Qty</div>
                      </div>
                      <div style={{ padding: 12, background: '#eef2ff', borderRadius: 6, textAlign: 'center' }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: '#4f46e5' }}>{reportData.summary.totalQtyCompleted}</div>
                        <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase' }}>Completed Qty</div>
                      </div>
                    </div>

                    <h3 style={{ marginBottom: 16, color: '#1e293b', borderBottom: '2px solid #f1f5f9', paddingBottom: 8 }}>Detailed Material Breakdown</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                      {[
                        { title: 'Batteries', data: reportData.detailed.batteries, color: '#2563eb' },
                        { title: 'PCBAs',     data: reportData.detailed.pcbas,     color: '#16a34a' },
                        { title: 'Coils',     data: reportData.detailed.coils,     color: '#7c3aed' },
                        { title: 'Shells',    data: reportData.detailed.shells,    color: '#d97706' },
                        ...(reportData.detailed.lenses?.length ? [{ title: 'Lenses (Pro Ring)', data: reportData.detailed.lenses, color: '#e67e22' }] : []),
                      ].map((cat, idx) => (
                        <div key={idx}>
                          <h4 style={{ color: cat.color, marginBottom: 12, fontSize: 14 }}>{cat.title}</h4>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr>
                                <th style={{ textAlign: 'left', padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: 12, color: '#64748b' }}>Component Name</th>
                                <th style={{ textAlign: 'right', padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: 12, color: '#64748b' }}>IN</th>
                                <th style={{ textAlign: 'right', padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: 12, color: '#64748b' }}>Received (RC)</th>
                                <th style={{ textAlign: 'right', padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: 12, color: '#64748b' }}>Reject (RJ)</th>
                                <th style={{ textAlign: 'right', padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: 12, color: '#64748b' }}>Return (RT)</th>
                                <th style={{ textAlign: 'right', padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: 12, color: '#64748b' }}>OUT</th>
                              </tr>
                            </thead>
                            <tbody>
                              {cat.data.length === 0 ? (
                                <tr><td colSpan={6} style={{ padding: 12, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No components configured</td></tr>
                              ) : cat.data.map((item, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                  <td style={{ padding: '10px 12px', fontSize: 13, color: '#334155', fontWeight: 500 }}>{item.name}</td>
                                  <td style={{ padding: '10px 12px', fontSize: 13, color: '#2563eb', fontWeight: 600, textAlign: 'right' }}>{item.in.toLocaleString()}</td>
                                  <td style={{ padding: '10px 12px', fontSize: 13, color: '#16a34a', fontWeight: 600, textAlign: 'right' }}>{item.received.toLocaleString()}</td>
                                  <td style={{ padding: '10px 12px', fontSize: 13, color: '#dc2626', fontWeight: 600, textAlign: 'right' }}>{item.reject.toLocaleString()}</td>
                                  <td style={{ padding: '10px 12px', fontSize: 13, color: '#d97706', fontWeight: 600, textAlign: 'right' }}>{item.return.toLocaleString()}</td>
                                  <td style={{ padding: '10px 12px', fontSize: 13, color: '#7c3aed', fontWeight: 600, textAlign: 'right' }}>{item.out.toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {reportData && (
                <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                  <button className="btn btn-secondary" onClick={() => setReportModal(false)}>Close</button>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button className="btn btn-secondary" onClick={() => {
                      const printContent = document.getElementById('full-report-content').innerHTML;
                      const originalContent = document.body.innerHTML;
                      document.body.innerHTML = printContent;
                      window.print();
                      document.body.innerHTML = originalContent;
                      window.location.reload();
                    }}>🖨️ Print / Save PDF</button>
                    <button className="btn btn-success" onClick={handleDownloadReportExcel}>📊 Download Excel</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}

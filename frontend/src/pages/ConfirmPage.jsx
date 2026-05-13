import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import GlassIcon from '../components/GlassIcon';

export default function ConfirmPage({ rows, batchId, onBack, onSubmit }) {
  const { user } = useAuth();
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const totalQty = rows.reduce((s, r) => s + parseInt(r.qty || 0), 0);
  const uniqueSKUs = new Set(rows.map(r => r.sku)).size;

  const handleSubmit = async () => {
    if (!confirmed) return;
    setLoading(true);
    setError('');
    try {
      for (const row of rows) {
        await api.createMO({ ...row, batchId, submittedBy: user?.fullName });
      }
      onSubmit();
    } catch (err) {
      setError(err.message || 'Failed to submit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'transparent' }}>
      {/* Navbar */}
      <nav className="navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="navbar-brand"><div className="navbar-logo">◇</div>UltraHuman Assembly</div>
          <div className="navbar-breadcrumb">
            <span style={{ color: '#6b7280', cursor: 'pointer' }} onClick={onBack}>Platform</span>
            <span>›</span>
            <span style={{ color: '#6b7280', cursor: 'pointer' }} onClick={onBack}>Plan</span>
            <span>›</span>
            <span style={{ color: '#111827', fontWeight: 600 }}>Confirm</span>
          </div>
        </div>
        <div className="navbar-right">
          <div className="user-chip">
            <div className="user-avatar">{user?.fullName?.[0]}</div>
            <div className="user-info-text">
              <div className="name">{user?.fullName}</div>
              <div className="role">Data Entry</div>
            </div>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>
        <div className="card animate-fade" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ padding: '24px 28px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 44, height: 44, background: '#eff6ff', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <GlassIcon name="audit" size={24} color="#2563eb" />
              </div>
              <div>
                <h2 style={{ marginBottom: 4 }}>Confirmation Summary</h2>
                <p className="text-muted text-sm">Verify derived components and quantities before final submission.</p>
              </div>
            </div>
            <span className="badge badge-primary">Batch ID: #{batchId?.split('-')[1] || 'N/A'}-P</span>
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', padding: '20px 28px', gap: 0, borderBottom: '1px solid #f3f4f6' }}>
            {[
              { icon: 'database', label: 'TOTAL ROWS', value: rows.length },
              { icon: 'plan', label: 'TOTAL QTY', value: totalQty.toLocaleString() },
              { icon: 'settings', label: 'UNIQUE SKUs', value: uniqueSKUs },
            ].map((s, i) => (
              <div key={s.label} style={{ padding: '12px 20px', borderRight: i < 2 ? '1px solid #f3f4f6' : 'none' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <GlassIcon name={s.icon} size={14} color="#6b7280" /> {s.label}
                </div>
                <div style={{ fontSize: '2.2rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif', color: '#111827' }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="table-wrapper" style={{ margin: '0 0' }}>
            <table>
              <thead>
                <tr>
                  <th>Plan Date</th>
                  <th>MO Number</th>
                  <th>SKU</th>
                  <th>QTY</th>
                  <th>Battery</th>
                  <th>PCBA</th>
                  <th>Coil</th>
                  <th>Shell</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id}>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#2563eb', background: '#eff6ff', padding: '2px 8px', borderRadius: 6, whiteSpace: 'nowrap' }}>
                        <GlassIcon name="history" size={12} color="#2563eb" /> {row.planDate || '—'}
                      </span>
                    </td>
                    <td style={{ color: '#2563eb', fontWeight: 600 }}>{row.moNumber || '—'}</td>
                    <td><span className="badge badge-primary">{row.sku}</span></td>
                    <td style={{ fontWeight: 600 }}>{parseInt(row.qty).toLocaleString()}</td>
                    <td className="text-sm">{row.battery} <strong style={{color:'#2563eb'}}>(Collected: {row.batteryQty})</strong></td>
                    <td className="text-sm">{row.pcba} <strong style={{color:'#7c3aed'}}>(Collected: {row.pcbaQty})</strong></td>
                    <td className="text-sm">{row.coil} <strong style={{color:'#059669'}}>(Collected: {row.coilQty})</strong></td>
                    <td className="text-sm">{row.shell} <strong style={{color:'#d97706'}}>(Collected: {row.shellQty})</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Warning */}
            <div className="alert alert-warning" style={{ display: 'flex', gap: 12 }}>
              <GlassIcon name="security" size={20} color="#d97706" />
              <div><strong>Review derived components carefully.</strong> Once submitted, this plan will be locked for production and can only be modified by an administrator. Ensure SKU parsing was correctly interpreted for all {rows.length} rows.</div>
            </div>

            {error && <div className="alert alert-danger" style={{ display: 'flex', gap: 12 }}><GlassIcon name="delete" size={20} color="#dc2626" /> {error}</div>}

            {/* Confirm checkbox */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '16px', border: '1px solid #e5e7eb', borderRadius: 8 }}>
              <input
                type="checkbox" id="confirmCheck"
                checked={confirmed}
                onChange={e => setConfirmed(e.target.checked)}
                style={{ width: 'auto', marginTop: 2, cursor: 'pointer' }}
              />
              <div>
                <label htmlFor="confirmCheck" style={{ fontWeight: 600, cursor: 'pointer' }}>
                  I confirm that all entered data and derived components are correct
                </label>
                <p className="text-sm text-muted">Submission will initiate component stock reservation and production queueing.</p>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button className="btn btn-secondary" onClick={onBack}>← Back to Edit</button>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-secondary" onClick={onBack}>Cancel</button>
                <button
                  className="btn btn-primary btn-lg"
                  onClick={handleSubmit}
                  disabled={!confirmed || loading}
                >
                  {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Submitting...</> : <><GlassIcon name="success" size={14} color="#fff" /> Confirm and Submit Plan</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

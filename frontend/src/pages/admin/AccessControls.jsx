import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import GlassIcon from '../../components/GlassIcon';
import ModalPortal from '../../components/ModalPortal';

const BATTERIES = ['24mah battery', '32mah battery', '39mah battery', '24mah BATTERY (FOR RING PRO)', '32mah BATTERY (FOR RING PRO)'];
const PCBAS = ['Ring PCBA V1.60', 'Ring PCBA V1.61', 'Ring PCBA V1.62', 'Ring Pro PCBA'];

export default function AccessControls() {
  const [config, setConfig] = useState({ fixedBattery: '', fixedPCBA: '', autoMode: false });
  const [form, setForm] = useState({ fixedBattery: '', fixedPCBA: '' });
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirmToggle, setConfirmToggle] = useState(false);

  useEffect(() => {
    api.getConfig().then(data => {
      setConfig(data);
      setForm({ fixedBattery: data.fixedBattery, fixedPCBA: data.fixedPCBA });
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleApply = async (e) => {
    e.preventDefault();
    setSaving(true); setSuccess('');
    try {
      const updated = await api.updateConfig({ fixedBattery: form.fixedBattery, fixedPCBA: form.fixedPCBA });
      setConfig(updated.config);
      setSuccess('Access control settings applied successfully. All new data entries will now use these fixed values.');
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleReset = () => { setForm({ fixedBattery: config.fixedBattery, fixedPCBA: config.fixedPCBA }); };

  // Toggle autoMode: true = Auto-Battery mode (fixed sleeps), false = Fixed mode (auto sleeps)
  const handleToggleMode = async () => {
    setToggling(true); setSuccess('');
    try {
      const newMode = !config.autoMode;
      const updated = await api.updateConfig({ autoMode: newMode });
      setConfig(updated.config);
      setSuccess(newMode
        ? '⚡ Auto-Battery Mode ENABLED. Fixed battery rule is now sleeping. Battery is derived from SKU size automatically.'
        : '🔒 Fixed Mode ENABLED. Auto-battery rule is now sleeping. Fixed battery/PCBA values are active.'
      );
    } catch (err) { console.error(err); }
    finally { setToggling(false); setConfirmToggle(false); }
  };

  const isAutoMode = config.autoMode;

  return (
    <div>
      {/* Page Header with Toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h2 style={{ marginBottom: 4 }}>Access Controls & Fix Settings</h2>
          <p className="text-muted text-sm">Define mandatory component selections to prevent data entry errors across specific scopes.</p>
        </div>

        {/* Enable / Disable Toggle Button */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          <button
            onClick={() => setConfirmToggle(true)}
            disabled={toggling || loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 20px',
              borderRadius: 10,
              border: 'none',
              cursor: toggling ? 'not-allowed' : 'pointer',
              background: isAutoMode
                ? 'linear-gradient(135deg, #7c3aed, #4f46e5)'
                : 'linear-gradient(135deg, #16a34a, #15803d)',
              color: 'white',
              fontWeight: 700,
              fontSize: 13.5,
              boxShadow: isAutoMode
                ? '0 4px 14px rgba(124,58,237,0.4)'
                : '0 4px 14px rgba(22,163,74,0.4)',
              transition: 'all 0.3s ease',
              opacity: toggling ? 0.7 : 1,
            }}
          >
            <span style={{ fontSize: 18 }}>{isAutoMode ? '⚡' : '🔒'}</span>
            {toggling ? 'Switching...' : isAutoMode ? 'AUTO-BATTERY MODE ON' : 'FIXED MODE ON'}
            <span style={{
              background: 'rgba(255,255,255,0.25)',
              padding: '2px 8px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600
            }}>
              Click to {isAutoMode ? 'Enable Fixed' : 'Switch to Auto'}
            </span>
          </button>

          {/* Mode status indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: isAutoMode ? '#7c3aed' : '#16a34a',
              boxShadow: isAutoMode ? '0 0 6px #7c3aed' : '0 0 6px #16a34a',
              animation: 'spin 2s linear infinite'
            }} />
            <span className="text-muted">
              {isAutoMode ? 'Auto rule active — fixed battery sleeping' : 'Fixed rule active — auto rule sleeping'}
            </span>
          </div>
        </div>
      </div>

      {/* Success Alert */}
      {success && (
        <div className="alert alert-success" style={{ marginBottom: 20 }} onClick={() => setSuccess('')}>
          <GlassIcon name="document" size={16} color="#16a34a" style={{ marginRight: 8 }} /> {success}
        </div>
      )}

      {/* Auto-Mode Info Banner */}
      {isAutoMode && (
        <div style={{
          padding: '16px 20px',
          background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)',
          border: '1.5px solid #c4b5fd',
          borderRadius: 12,
          marginBottom: 24,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 14,
        }}>
          <span style={{ fontSize: '1.5rem' }}>⚡</span>
          <div>
            <div style={{ fontWeight: 700, color: '#4f46e5', fontSize: 14, marginBottom: 6 }}>
              Auto-Battery Mode is ACTIVE — Fixed Battery Rule is Sleeping
            </div>
            <p className="text-sm" style={{ color: '#5b21b6', lineHeight: 1.6, margin: 0 }}>
              Battery is now automatically determined by the SKU size number:
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
              <div style={{ padding: '6px 14px', background: '#ddd6fe', borderRadius: 8, fontWeight: 700, fontSize: 12.5, color: '#4f46e5' }}>
                SKU ending <strong>5, 6, 7, 8</strong> → 24mah battery
              </div>
              <div style={{ padding: '6px 14px', background: '#ede9fe', borderRadius: 8, fontWeight: 700, fontSize: 12.5, color: '#7c3aed' }}>
                SKU ending <strong>9, 10, 11, 12, 13, 14...</strong> → 32mah battery
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 }}>
        {/* Main form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card" style={{ opacity: isAutoMode ? 0.65 : 1, transition: 'opacity 0.3s' }}>
            <div className="card-header">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <GlassIcon name="shield" size={20} color={isAutoMode ? '#9ca3af' : '#2563eb'} /> Create / Update Control Rule
                </h3>
                {isAutoMode && (
                  <span style={{ background: '#f3f4f6', color: '#6b7280', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                    😴 Sleeping
                  </span>
                )}
              </div>
              <p className="text-sm text-muted" style={{ marginTop: 4 }}>
                {isAutoMode
                  ? 'Fixed rules are currently sleeping. Enable Fixed Mode to make these rules active again.'
                  : 'Configure system-level overrides that lock specific values for all users.'}
              </p>
            </div>
            <div className="card-body">
              <form onSubmit={handleApply}>
                <div className="form-row" style={{ marginBottom: 20 }}>
                  <div className="form-group">
                    <label style={{ color: isAutoMode ? '#9ca3af' : '' }}>Fixed Battery Type</label>
                    <select
                      value={form.fixedBattery}
                      onChange={e => setForm({ ...form, fixedBattery: e.target.value })}
                      disabled={isAutoMode}
                      style={{ opacity: isAutoMode ? 0.5 : 1 }}
                    >
                      {BATTERIES.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                    <p className="text-xs text-muted" style={{ marginTop: 4 }}>
                      {isAutoMode ? '⚡ Overridden by Auto-Battery Mode.' : 'Users will be locked to this battery. Cannot be overridden during data entry.'}
                    </p>
                  </div>
                  <div className="form-group">
                    <label>Fixed PCBA Version</label>
                    <select value={form.fixedPCBA} onChange={e => setForm({ ...form, fixedPCBA: e.target.value })}>
                      {PCBAS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <p className="text-xs text-muted" style={{ marginTop: 4 }}>PCBA is always fixed regardless of mode.</p>
                  </div>
                </div>

                <div style={{ padding: '14px 16px', background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <GlassIcon name="audit" size={16} color="#6b7280" />
                    <span className="text-sm font-semibold">Application Scope: Global</span>
                  </div>
                  <p className="text-sm text-muted" style={{ marginTop: 4 }}>This rule will apply to ALL users across the entire system for new data entry rows.</p>
                </div>

                <p className="text-xs text-muted" style={{ marginBottom: 16 }}>* Changes will take effect immediately for new data entry rows.</p>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" className="btn btn-secondary" onClick={handleReset}>Reset Form</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Applying...' : <><GlassIcon name="shield" size={16} color="#ffffff" style={{ marginRight: 8 }} /> Apply Fixed Rules</>}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Active rules table */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0 }}>System Rules Summary</h3>
                <p className="text-sm text-muted">Current active configuration for all users.</p>
              </div>
              <span className={`badge ${isAutoMode ? 'badge-primary' : 'badge-success'}`}>
                {isAutoMode ? '⚡ Auto Mode' : '🔒 Fixed Mode'}
              </span>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Component</th>
                    <th>Rule Type</th>
                    <th>Active Value / Logic</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: 24 }}><span className="spinner" style={{ display: 'inline-block' }} /></td></tr>
                  ) : (
                    <>
                      <tr>
                        <td><span className="badge badge-primary">Battery</span></td>
                        <td>
                          <span className={`badge ${isAutoMode ? '' : 'badge-gray'}`} style={isAutoMode ? { background: '#ede9fe', color: '#7c3aed' } : {}}>
                            {isAutoMode ? '⚡ Auto (SKU-Based)' : '🔒 Fixed'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 500, fontSize: 13 }}>
                          {isAutoMode
                            ? <span style={{ color: '#7c3aed' }}>Size 5–8 → 24mah | Size 9+ → 32mah</span>
                            : config.fixedBattery}
                        </td>
                        <td><span className="badge badge-success">Active</span></td>
                      </tr>
                      <tr>
                        <td><span className="badge" style={{ background: '#f5f3ff', color: '#7c3aed' }}>PCBA</span></td>
                        <td><span className="badge badge-gray">🔒 Fixed</span></td>
                        <td style={{ fontWeight: 500 }}>{config.fixedPCBA}</td>
                        <td><span className="badge badge-success">Active</span></td>
                      </tr>
                      <tr>
                        <td><span className="badge badge-gray">Coil</span></td>
                        <td><span className="badge badge-gray" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><GlassIcon name="refresh" size={12} color="#4b5563" /> Auto (SKU)</span></td>
                        <td style={{ color: '#6b7280', fontSize: 13 }}>Always derived from SKU number</td>
                        <td><span className="badge badge-success">Active</span></td>
                      </tr>
                      <tr>
                        <td><span className="badge badge-gray">Shell</span></td>
                        <td><span className="badge badge-gray" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><GlassIcon name="refresh" size={12} color="#4b5563" /> Auto (SKU)</span></td>
                        <td style={{ color: '#6b7280', fontSize: 13 }}>Always derived from SKU + REFER code</td>
                        <td><span className="badge badge-success">Active</span></td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Preview panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-header">
              <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <GlassIcon name="dashboard" size={18} color="#2563eb" /> End-User Preview
              </h4>
              <p className="text-sm text-muted">How battery looks in Plan Data Entry</p>
            </div>
            <div className="card-body">
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                  BATTERY SELECTION
                  <span style={{
                    background: isAutoMode ? '#ede9fe' : '#eff6ff',
                    color: isAutoMode ? '#7c3aed' : '#2563eb',
                    padding: '1px 6px', borderRadius: 4, fontSize: 10
                  }}>
                    {isAutoMode ? '⚡ AUTO' : '🔒 Fixed'}
                  </span>
                </div>
                {isAutoMode ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ padding: '8px 10px', background: '#ede9fe', border: '1.5px solid #c4b5fd', borderRadius: 8, fontWeight: 600, fontSize: 12, color: '#4f46e5', display: 'flex', justifyContent: 'space-between' }}>
                      <span>SKU ends 05–08</span> <span>→ 24mah battery</span>
                    </div>
                    <div style={{ padding: '8px 10px', background: '#f5f3ff', border: '1.5px solid #ddd6fe', borderRadius: 8, fontWeight: 600, fontSize: 12, color: '#7c3aed', display: 'flex', justifyContent: 'space-between' }}>
                      <span>SKU ends 09–14</span> <span>→ 32mah battery</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ padding: 10, background: '#f9fafb', border: '1.5px solid #e5e7eb', borderRadius: 8, fontWeight: 600, fontSize: 13, color: '#6b7280' }}>
                      {form.fixedBattery || '—'}
                    </div>
                    <p className="text-xs text-muted" style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}><GlassIcon name="alert" size={12} color="#6b7280" /> This field is locked by admin policy. Manual overrides are disabled.</p>
                  </>
                )}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                  PCBA SELECTION
                  <span style={{ background: '#f5f3ff', color: '#7c3aed', padding: '1px 6px', borderRadius: 4, fontSize: 10 }}>🔒 Fixed</span>
                </div>
                <div style={{ padding: 10, background: '#f9fafb', border: '1.5px solid #e5e7eb', borderRadius: 8, fontWeight: 600, fontSize: 13, color: '#6b7280' }}>
                  {form.fixedPCBA || '—'}
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '20px' }}>
            <h4 style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}><GlassIcon name="alert" size={18} color="#2563eb" /> How It Works</h4>
            <p className="text-sm text-muted" style={{ lineHeight: 1.7 }}>
              <strong>🔒 Fixed Mode (Enabled):</strong> All users get the admin-configured battery and PCBA for every SKU.<br /><br />
              <strong>⚡ Auto-Battery Mode (Disabled):</strong> Battery is automatically assigned based on SKU ring size — smaller rings (size 5–8) get 24mah, larger rings (size 9+) get 32mah. PCBA remains fixed.
            </p>
          </div>
        </div>
      </div>

      {/* Confirm Toggle Modal */}
      {confirmToggle && (
        <ModalPortal>
          <div className="modal-overlay" onClick={() => setConfirmToggle(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
              <div className="modal-header">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {isAutoMode ? '🔒 Switch to Fixed Mode?' : '⚡ Switch to Auto-Battery Mode?'}
                </h3>
                <button className="btn-icon" onClick={() => setConfirmToggle(false)}>✕</button>
              </div>

              {isAutoMode ? (
                <div>
                  <div className="alert alert-success" style={{ marginBottom: 16 }}>
                    <strong>Fixed Mode will become ACTIVE.</strong> Auto-battery rule will go to sleep.
                  </div>
                  <p className="text-sm text-muted" style={{ lineHeight: 1.6 }}>
                    All new data entries will use the admin-configured fixed battery (<strong>{config.fixedBattery}</strong>) and PCBA values, regardless of SKU size.
                  </p>
                </div>
              ) : (
                <div>
                  <div className="alert alert-warning" style={{ marginBottom: 16 }}>
                    <strong>Auto-Battery Mode will become ACTIVE.</strong> Fixed battery rule will go to sleep.
                  </div>
                  <p className="text-sm text-muted" style={{ lineHeight: 1.6, marginBottom: 12 }}>
                    Battery will now be automatically assigned based on SKU ring size:
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 14px', background: '#f5f3ff', borderRadius: 8, marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: 13, color: '#4f46e5' }}>
                      <span>🔢 SKU ending 5, 6, 7, 8</span>
                      <span>→ 24mah battery</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: 13, color: '#7c3aed' }}>
                      <span>🔢 SKU ending 9, 10, 11, 12, 13, 14...</span>
                      <span>→ 32mah battery</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted">PCBA (<strong>{config.fixedPCBA}</strong>) remains fixed in all modes.</p>
                </div>
              )}

              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setConfirmToggle(false)}>Cancel</button>
                <button
                  className={`btn ${isAutoMode ? 'btn-success' : 'btn-primary'}`}
                  onClick={handleToggleMode}
                  disabled={toggling}
                  style={!isAutoMode ? { background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' } : {}}
                >
                  {toggling ? 'Switching...' : isAutoMode ? '🔒 Enable Fixed Mode' : '⚡ Enable Auto-Battery Mode'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}

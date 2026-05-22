import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import GlassIcon from '../components/GlassIcon';
import ModalPortal from '../components/ModalPortal';

export default function PlatformPage({ onSelectPlan, onSelectScrap, onSelectRework, onSelectRnd, onAdmin, onDashboard }) {
  const { user } = useAuth();

  const modules = [
    { id: 'plan',   icon: 'plan',    label: 'Plan',   desc: 'Manage production schedules, input MO data, and review SKU component breakdowns.', active: true, badge: 'Active Shift' },
    { id: 'scrap',  icon: 'scrap',   label: 'Scrap',  desc: 'Log production waste, defective components, and material loss for quality tracking.',  active: true },
    { id: 'rework', icon: 'history', label: 'Rework', desc: 'Track components sent for rework, log return quantities and update WIP status automatically.', active: true },
    { id: 'rnd',    icon: 'settings',label: 'R&D',    desc: 'Log experimental product data, test results, and auto-fetch product specs from catalog.', active: true },
  ];

  const [showHelpDocs, setShowHelpDocs] = useState(false);

  return (
    <div style={{ minHeight: '100vh', background: 'transparent' }}>
      {/* Navbar */}
      <nav className="navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="navbar-brand">
            <div className="navbar-logo">◇</div>
            UltraHuman Assembly
          </div>
          <div className="navbar-breadcrumb">
            <span>Platform</span>
          </div>
        </div>
        <div className="navbar-right">
          <button className="btn-icon" title="Help" onClick={() => setShowHelpDocs(true)}>?</button>
          <div className="user-chip">
            <div style={{ position: 'relative' }}>
              <div className="user-avatar">{user?.fullName?.[0] || 'U'}</div>
              <div className="online-dot" />
            </div>
            <div className="user-info-text">
              <div className="name">{user?.fullName}</div>
              <div className="role">{user?.role === 'admin' ? 'Administrator' : 'Data Entry'}</div>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onDashboard} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <GlassIcon name="dashboard" size={14} color="#374151" /> User Dashboard
          </button>
          {user?.role === 'admin' && (
            <button className="btn btn-primary btn-sm" onClick={onAdmin} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <GlassIcon name="settings" size={14} color="#ffffff" /> Admin Panel
            </button>
          )}
        </div>
      </nav>

      {/* Content */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '60px 24px 40px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h1 style={{ fontSize: '2.2rem', marginBottom: 10 }}>Welcome back, {user?.fullName?.split(' ')[0]}.</h1>
          <p className="text-muted">Select an operational module below to begin your manufacturing data entry or management tasks.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 40 }}>
          {modules.map(mod => (
            <div
              key={mod.id}
          onClick={mod.id === 'plan' ? onSelectPlan : mod.id === 'scrap' ? onSelectScrap : mod.id === 'rework' ? onSelectRework : mod.id === 'rnd' ? onSelectRnd : undefined}
              className="card"
              style={{
                padding: '32px 24px',
                textAlign: 'center',
                cursor: mod.active ? 'pointer' : 'default',
                transition: 'all 0.25s ease',
                position: 'relative',
                border: mod.active ? '2px solid #2563eb' : '1px solid #e5e7eb',
                opacity: 1,
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 25px rgba(37,99,235,0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
            >
              {mod.badge && (
                <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)' }}>
                  <span className="badge badge-success">{mod.badge}</span>
                </div>
              )}
              <div style={{ fontSize: '3rem', marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: 72, height: 72, borderRadius: 18, background: mod.active ? '#2563eb' : '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <GlassIcon name={mod.icon} color={mod.active ? '#ffffff' : '#2563eb'} size={36} />
                </div>
              </div>
              <h3 style={{ marginBottom: 8, fontSize: '1.15rem' }}>{mod.label}</h3>
              <p className="text-muted" style={{ fontSize: 13 }}>{mod.desc}</p>
            </div>
          ))}
        </div>

        {/* Help */}
        <div className="card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><GlassIcon name="alert" size={24} color="#9ca3af" /></span>
            <div>
              <h4 style={{ marginBottom: 2 }}>Need Assistance?</h4>
              <p className="text-sm text-muted">If you lack access to a specific module or encounter technical issues, please contact your shift administrator.</p>
            </div>
          </div>
          <button className="btn btn-secondary" onClick={() => setShowHelpDocs(true)}>View Help Docs</button>
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '20px', borderTop: '1px solid #e5e7eb', background: 'white', marginTop: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', maxWidth: 900, margin: '0 auto' }}>
          <span className="text-sm text-muted">© 2024 UltraHuman Assembly Inc. All rights reserved.</span>
          <div style={{ display: 'flex', gap: 20 }}>
            <span className="text-sm text-muted" style={{ cursor: 'pointer' }} onClick={() => setShowHelpDocs(true)}>Help Docs</span>
            <span className="text-sm text-muted" style={{ cursor: 'pointer' }}>Support</span>
          </div>
        </div>
      </div>

      {/* Help Docs Modal */}
      {showHelpDocs && (
        <ModalPortal>
          <div className="modal-overlay" onClick={() => setShowHelpDocs(false)} style={{ zIndex: 9999 }}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 750, maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0 }}>
              <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '1.5rem' }}>📘</span>
                  <h3 style={{ margin: 0 }}>UltraHuman Assembly User Guidance</h3>
                </div>
                <button className="btn-icon" onClick={() => setShowHelpDocs(false)}>✕</button>
              </div>
              
              <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                <div style={{ marginBottom: 24 }}>
                  <h4 style={{ color: '#2563eb', marginBottom: 8, fontSize: '1.1rem' }}>1. Introduction & Workflow</h4>
                  <p className="text-sm text-muted" style={{ lineHeight: 1.6 }}>
                    UltraHuman Assembly is your central hub for Manufacturing Orders (MOs). The core workflow goes: <strong>Plan Data Entry (Collecting Parts) ➡ Confirmation ➡ Production Dashboard (Tracking Assembly) ➡ MO Close.</strong>
                  </p>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <h4 style={{ color: '#2563eb', marginBottom: 8, fontSize: '1.1rem' }}>2. Plan Data Entry (Component Collection)</h4>
                  <p className="text-sm text-muted" style={{ lineHeight: 1.6, marginBottom: 8 }}>
                    Click on the <strong>Plan</strong> module to start logging new manufacturing orders. This step is where you log parts you have <em>collected</em> from the warehouse.
                  </p>
                  <ul className="text-sm text-muted" style={{ paddingLeft: 20, lineHeight: 1.6 }}>
                    <li><strong>Target QTY:</strong> The total number of rings required for the MO.</li>
                    <li><strong>REFER codes:</strong> When you enter a SKU, you must enter a Refer code. Typing the letter <strong>"O"</strong> or number <strong>"0"</strong> automatically maps the Shell to <strong>0.2mm</strong> thickness. Any other letter defaults to <strong>0.3mm</strong>.</li>
                    <li><strong>Row Editing:</strong> If you collect fewer parts than the Target QTY, click the ✏️ Edit icon on the row and adjust the <em>"Collected"</em> amounts (Battery Collected, PCBA Collected, etc.).</li>
                  </ul>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <h4 style={{ color: '#2563eb', marginBottom: 8, fontSize: '1.1rem' }}>3. The Production Dashboard</h4>
                  <p className="text-sm text-muted" style={{ lineHeight: 1.6, marginBottom: 8 }}>
                    Once a plan is confirmed, you can track it via the <strong>User Dashboard</strong> button on the top right.
                  </p>
                  <ul className="text-sm text-muted" style={{ paddingLeft: 20, lineHeight: 1.6 }}>
                    <li><strong>Progress Fractions:</strong> A display of <code>100 / 120</code> means you have successfully assembled 100 components out of the 120 required target.</li>
                    <li><strong>Qty Update Button:</strong> If you assemble more rings or have defective parts, click this button to explicitly set the exact assembled quantities.</li>
                    <li><strong>MO Close:</strong> Once an MO is completely manufactured, click this button to officially lock and finalize the order.</li>
                  </ul>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <h4 style={{ color: '#2563eb', marginBottom: 8, fontSize: '1.1rem' }}>4. Administrator Privileges</h4>
                  <p className="text-sm text-muted" style={{ lineHeight: 1.6 }}>
                    If you have an Admin account, click <strong>⚙️ Admin Panel</strong> to view system-wide stats. Admins have exclusive access to the <strong>Database Manager</strong>, where you can download `.csv` and `.json` system exports, or override data directly in the database.
                  </p>
                </div>

                <div className="alert alert-info" style={{ marginTop: 10 }}>
                  <GlassIcon name="alert" size={14} color="#eab308" /> <strong>Pro Tip:</strong> Always double-check your quantities on the Confirmation Summary screen before submitting your plan!
                </div>
              </div>
              
              <div className="modal-footer" style={{ borderTop: '1px solid #e5e7eb', padding: '16px 24px' }}>
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setShowHelpDocs(false)}>Understood</button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}

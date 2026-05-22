import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import AdminDashboard from './AdminDashboard';
import UserManagement from './UserManagement';
import MOPlans from './MOPlans';
import ComponentTypes from './ComponentTypes';
import AccessControls from './AccessControls';
import AuditLog from './AuditLog';
import AdminScrapData from './AdminScrapData';
import AdminReturnData from './AdminReturnData';
import AdminDBManager from './AdminDBManager';
import AdminTrash from './AdminTrash';
import AdminRndProducts from './AdminRndProducts';
import AdminRndData from './AdminRndData';
import GlassIcon from '../../components/GlassIcon';

const NAV = [
  { id: 'dashboard',   icon: 'dashboard', label: 'Dashboard' },
  { id: 'moplans',     icon: 'plan',      label: 'Plan Data' },
  { id: 'scrapdata',   icon: 'scrap',     label: 'Scrap Data' },
  { id: 'returndata',  icon: 'history',   label: 'Return Data' },
  { id: 'dbmanager',   icon: 'database',  label: 'DB Manager' },
  { id: 'users',       icon: 'users',     label: 'User Management' },
  { id: 'components',  icon: 'settings',  label: 'Component Types' },
  { id: 'rnddata',     icon: 'history',   label: 'R&D Data' },
  { id: 'rndproducts', icon: 'settings',  label: 'R&D Products' },
  { id: 'access',      icon: 'export',    label: 'Access Controls' },
  { id: 'audit',       icon: 'audit',     label: 'Audit Log' },
];

export default function AdminLayout({ onBack }) {
  const { user, logout } = useAuth();
  const [active, setActive] = useState('dashboard');

  const renderPage = () => {
    switch (active) {
      case 'dashboard':  return <AdminDashboard onNavigate={setActive} />;
      case 'moplans':    return <MOPlans />;
      case 'scrapdata':  return <AdminScrapData />;
      case 'returndata': return <AdminReturnData />;
      case 'dbmanager':  return <AdminDBManager />;
      case 'trash':      return <AdminTrash />;
      case 'users':      return <UserManagement />;
      case 'components': return <ComponentTypes />;
      case 'rnddata':    return <AdminRndData />;
      case 'rndproducts':return <AdminRndProducts />;
      case 'access':     return <AccessControls />;
      case 'audit':      return <AuditLog />;
      default:           return <AdminDashboard onNavigate={setActive} />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      {/* Navbar */}
      <nav className="navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="navbar-brand"><div className="navbar-logo">◇</div>UltraHuman Assembly</div>
        </div>
        <div className="navbar-right">
          <button className="btn btn-secondary btn-sm" onClick={onBack}>← Back to Platform</button>
          <div className="user-chip">
            <div style={{ position: 'relative' }}>
              <div className="user-avatar" style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
                {user?.fullName?.[0]}
              </div>
              <div className="online-dot" />
            </div>
            <div className="user-info-text">
              <div className="name">{user?.fullName}</div>
              <div className="role">Admin</div>
            </div>
          </div>
        </div>
      </nav>

      <div className="admin-shell">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-nav">
            {NAV.map(item => (
              <div
                key={item.id}
                className={`sidebar-item ${active === item.id ? 'active' : ''}`}
                onClick={() => setActive(item.id)}
              >
                <GlassIcon name={item.icon} size={22} color={active === item.id ? '#ffffff' : '#94a3b8'} style={{ marginRight: 4 }} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
          <div className="sidebar-footer">
            <button className="sidebar-logout" onClick={() => { logout(); }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><GlassIcon name="arrow-left" size={14} color="#6b7280" /> Logout</span>
            </button>
          </div>
        </aside>

        {/* Page content */}
        <main className="main-content animate-fade">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import PlatformPage from './pages/PlatformPage';
import PlanPage from './pages/PlanPage';
import ConfirmPage from './pages/ConfirmPage';
import UserDashboard from './pages/UserDashboard';
import ScrapPage from './pages/ScrapPage';
import ReworkPage from './pages/ReworkPage';
import RndPage from './pages/RndPage';
import RndDashboard from './pages/RndDashboard';
import AdminLayout from './pages/admin/AdminLayout';
import './App.css';

const AppContent = () => {
  const { user } = useAuth();
  const [view, setView] = useState(user ? 'platform' : 'login');
  const [pendingRows, setPendingRows] = useState([]);
  const [batchId, setBatchId] = useState('');

  if (!user) return <LoginPage onLogin={() => setView('platform')} />;

  if (view === 'admin') return <AdminLayout onBack={() => setView('platform')} />;
  if (view === 'platform') return (
    <PlatformPage
      onSelectPlan={() => setView('plan')}
      onSelectScrap={() => setView('scrap')}
      onSelectRework={() => setView('rework')}
      onSelectRnd={() => setView('rnd')}
      onAdmin={() => setView('admin')}
      onDashboard={() => setView('dashboard')}
    />
  );
  if (view === 'plan') return (
    <PlanPage
      initialRows={pendingRows}
      onBack={() => setView('platform')}
      onConfirm={(rows, bid) => { setPendingRows(rows); setBatchId(bid); setView('confirm'); }}
    />
  );
  if (view === 'confirm') return (
    <ConfirmPage
      rows={pendingRows}
      batchId={batchId}
      onBack={() => setView('plan')}
      onSubmit={() => {
        setPendingRows([]);
        setBatchId('');
        setView('dashboard');
      }}
    />
  );
  if (view === 'dashboard') return (
    <UserDashboard onBack={() => setView('platform')} onNavigateScrap={() => setView('scrap')} />
  );
  if (view === 'scrap') return (
    <ScrapPage onBack={() => setView('platform')} />
  );
  if (view === 'rework') return (
    <ReworkPage onBack={() => setView('platform')} />
  );
  if (view === 'rnd') return (
    <RndPage
      onBack={() => setView('platform')}
      onDashboard={() => setView('rnd-dashboard')}
    />
  );
  if (view === 'rnd-dashboard') return (
    <RndDashboard
      onBack={() => setView('platform')}
      onNewEntry={() => setView('rnd')}
    />
  );
  return null;
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import GlassIcon from '../components/GlassIcon';
import { api } from '../services/api';

export default function RndPage({ onBack, onDashboard }) {
  const { user } = useAuth();
  const [catalog, setCatalog] = useState([]);
  const [form, setForm] = useState({ code: '', description: '', category: '' });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [codeMatch, setCodeMatch] = useState(null); // null=untouched, false=no match, true=match

  // Fetch product catalog on mount
  useEffect(() => {
    api.getRndProducts()
      .then(data => setCatalog(data))
      .catch(err => console.error('Failed to fetch R&D catalog', err));
  }, []);

  // Handle product code change & auto-fill
  const handleCodeChange = (e) => {
    const code = e.target.value;
    setForm(prev => ({ ...prev, code }));

    if (!code.trim()) {
      setCodeMatch(null);
      setForm(prev => ({ ...prev, code, description: '', category: '' }));
      return;
    }

    const matchedProduct = catalog.find(p => p.code.toLowerCase() === code.trim().toLowerCase());
    if (matchedProduct) {
      setCodeMatch(true);
      setForm(prev => ({
        ...prev,
        code,
        description: matchedProduct.description,
        category: matchedProduct.category
      }));
    } else {
      setCodeMatch(false);
      setForm(prev => ({ ...prev, code, description: '', category: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      await api.createRndEntry({ ...form, submittedBy: user?.fullName || 'Unknown' });
      
      setMessage({ type: 'success', text: 'R&D data successfully logged.' });
      setForm({ code: '', description: '', category: '' });
      setCodeMatch(null);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      {/* Navbar */}
      <nav className="navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="navbar-brand">
            <div className="navbar-logo">◇</div>
            UltraHuman Assembly
          </div>
          <div className="navbar-breadcrumb">
            <span style={{ cursor: 'pointer', color: '#6b7280' }} onClick={onBack}>Platform</span>
            <span style={{ margin: '0 8px', color: '#d1d5db' }}>/</span>
            <span>R&D Data Entry</span>
          </div>
        </div>
        <div className="navbar-right">
          <button
            className="btn btn-secondary btn-sm"
            onClick={onDashboard}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <GlassIcon name="dashboard" size={14} color="#374151" /> R&D Dashboard
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onBack}>← Back</button>
        </div>
      </nav>

      <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 24px' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: '2rem', marginBottom: 8 }}>R&D Module</h1>
          <p className="text-muted">Log experimental entries. Enter a valid product code to automatically load description and category.</p>
        </div>

        <div className="card" style={{ padding: 32 }}>
          {message.text && (
            <div className={`alert alert-${message.type === 'error' ? 'danger' : 'success'}`} style={{ marginBottom: 24 }}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label className="text-sm font-medium" style={{ display: 'block', marginBottom: 8 }}>Product Code</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="Enter code (e.g. RD-001)" 
                value={form.code} 
                onChange={handleCodeChange} 
                required 
                style={{ fontSize: '1.1rem', padding: '12px' }}
              />
              <p className="text-xs text-muted" style={{ marginTop: 6 }}>
                Matches against {catalog.length} products in the database.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}>
              <div>
                <label className="text-sm font-medium" style={{ display: 'block', marginBottom: 8 }}>Product Description</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Auto-filled or manual entry" 
                  value={form.description} 
                  onChange={e => setForm({ ...form, description: e.target.value })} 
                  required 
                />
              </div>
              <div>
                <label className="text-sm font-medium" style={{ display: 'block', marginBottom: 8 }}>Product Category</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Auto-filled or manual entry" 
                  value={form.category} 
                  onChange={e => setForm({ ...form, category: e.target.value })} 
                  required 
                />
              </div>
            </div>

            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={isSubmitting || !form.code || !form.description || !form.category}
                style={{ minWidth: 150, height: 44, fontSize: '1.05rem' }}
              >
                {isSubmitting ? 'Submitting...' : 'Log R&D Entry'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

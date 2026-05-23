import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import GlassIcon from '../components/GlassIcon';
import { api } from '../services/api';

export default function RndPage({ onBack, onDashboard }) {
  const { user } = useAuth();
  const [catalog, setCatalog] = useState([]);
  const [form, setForm] = useState({
    code: '',
    description: '',
    category: '',
    pickNumber: '',
    acceptReject: 'Accept',
    receivedCount: '',
    remark: '',
  });
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
      setForm({
        code: '',
        description: '',
        category: '',
        pickNumber: '',
        acceptReject: 'Accept',
        receivedCount: '',
        remark: '',
      });
      setCodeMatch(null);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = { fontSize: '0.95rem', padding: '10px 14px' };
  const labelStyle = { display: 'block', marginBottom: 8, fontWeight: 600, fontSize: '0.82rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#6b7280' };

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

      <div style={{ maxWidth: 860, margin: '40px auto', padding: '0 24px' }}>
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
            {/* Row 1: Code + auto-fill status */}
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Product Code</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Enter code (e.g. RD-001)"
                  value={form.code}
                  onChange={handleCodeChange}
                  required
                  style={{ ...inputStyle, fontSize: '1.05rem', paddingRight: 40 }}
                />
                {codeMatch === true && (
                  <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#16a34a', fontSize: 18 }}>✓</span>
                )}
                {codeMatch === false && (
                  <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#ef4444', fontSize: 18 }}>✗</span>
                )}
              </div>
              <p className="text-xs text-muted" style={{ marginTop: 6 }}>
                {codeMatch === true && <span style={{ color: '#16a34a', fontWeight: 600 }}>✓ Matched — description &amp; category auto-filled</span>}
                {codeMatch === false && <span style={{ color: '#ef4444' }}>No match found — fill description &amp; category manually</span>}
                {codeMatch === null && `Matches against ${catalog.length} products in the database.`}
              </p>
            </div>

            {/* Row 2: Description + Category */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
              <div>
                <label style={labelStyle}>Product Description</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Auto-filled or manual entry"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Product Category</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Auto-filled or manual entry"
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  required
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Divider */}
            <div style={{ borderTop: '1px dashed #e5e7eb', margin: '4px 0 24px' }} />

            {/* Row 3: Pick Number + Accept/Reject + Received Count */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 24 }}>
              <div>
                <label style={labelStyle}>Pick Number</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. PKG-042"
                  value={form.pickNumber}
                  onChange={e => setForm({ ...form, pickNumber: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Result / Status</label>
                <select
                  className="input-field"
                  value={form.acceptReject}
                  onChange={e => setForm({ ...form, acceptReject: e.target.value })}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="Accept">✅ Accept</option>
                  <option value="Reject">❌ Reject</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Received Count</label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="0"
                  min="0"
                  value={form.receivedCount}
                  onChange={e => setForm({ ...form, receivedCount: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Row 4: Remark */}
            <div style={{ marginBottom: 32 }}>
              <label style={labelStyle}>Remark</label>
              <input
                type="text"
                className="input-field"
                placeholder="Optional note or observation..."
                value={form.remark}
                onChange={e => setForm({ ...form, remark: e.target.value })}
                style={inputStyle}
              />
            </div>

            {/* Submit */}
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setForm({ code: '', description: '', category: '', pickNumber: '', acceptReject: 'Accept', receivedCount: '', remark: '' });
                  setCodeMatch(null);
                  setMessage({ type: '', text: '' });
                }}
                style={{ minWidth: 100, height: 44 }}
              >
                Clear
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting || !form.code || !form.description || !form.category}
                style={{ minWidth: 160, height: 44, fontSize: '1.0rem' }}
              >
                {isSubmitting ? 'Submitting…' : 'Log R&D Entry'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

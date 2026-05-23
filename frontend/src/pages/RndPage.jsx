import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import GlassIcon from '../components/GlassIcon';
import { api } from '../services/api';

export default function RndPage({ onBack, onDashboard }) {
  const { user } = useAuth();
  const [catalog, setCatalog] = useState([]);
  
  // Batch Level Info
  const [batchForm, setBatchForm] = useState({
    pickNumber: '',
    acceptReject: 'Accept',
    remark: '',
  });

  // Array of Product Items
  const [products, setProducts] = useState([
    { id: Date.now(), code: '', description: '', category: '', receivedCount: '', codeMatch: null }
  ]);

  const [message, setMessage] = useState({ type: '', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch product catalog on mount
  useEffect(() => {
    api.getRndProducts()
      .then(data => setCatalog(data))
      .catch(err => console.error('Failed to fetch R&D catalog', err));
  }, []);

  // Handle product code change & auto-fill
  const handleProductChange = (id, field, value) => {
    setProducts(prevProducts => 
      prevProducts.map(prod => {
        if (prod.id !== id) return prod;

        let updatedProd = { ...prod, [field]: value };

        // If code changed, attempt auto-fill
        if (field === 'code') {
          const codeTrimmed = value.trim();
          if (!codeTrimmed) {
            updatedProd.codeMatch = null;
            updatedProd.description = '';
            updatedProd.category = '';
          } else {
            const matchedProduct = catalog.find(p => p.code.toLowerCase() === codeTrimmed.toLowerCase());
            if (matchedProduct) {
              updatedProd.codeMatch = true;
              updatedProd.description = matchedProduct.description;
              updatedProd.category = matchedProduct.category;
            } else {
              updatedProd.codeMatch = false;
              updatedProd.description = '';
              updatedProd.category = '';
            }
          }
        }
        return updatedProd;
      })
    );
  };

  const addProductRow = () => {
    setProducts(prev => [
      ...prev, 
      { id: Date.now(), code: '', description: '', category: '', receivedCount: '', codeMatch: null }
    ]);
  };

  const removeProductRow = (id) => {
    setProducts(prev => {
      if (prev.length <= 1) return prev; // Keep at least one row
      return prev.filter(p => p.id !== id);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      // Validate all products have code, desc, category, and received count
      for (const prod of products) {
        if (!prod.code || !prod.description || !prod.category || prod.receivedCount === '') {
          throw new Error('Please fill all required fields for each product (Code, Description, Category, Received Count).');
        }
      }

      // Prepare payload: Combine batch info with each product
      const payload = products.map(prod => ({
        code: prod.code,
        description: prod.description,
        category: prod.category,
        receivedCount: prod.receivedCount,
        pickNumber: batchForm.pickNumber,
        acceptReject: batchForm.acceptReject,
        remark: batchForm.remark,
        submittedBy: user?.fullName || 'Unknown'
      }));

      await api.createRndEntry(payload);
      
      setMessage({ type: 'success', text: `Successfully logged ${products.length} R&D entry(s).` });
      
      // Reset forms
      setBatchForm({
        pickNumber: '',
        acceptReject: 'Accept',
        remark: '',
      });
      setProducts([{ id: Date.now(), code: '', description: '', category: '', receivedCount: '', codeMatch: null }]);

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

      <div style={{ maxWidth: 1400, margin: '40px auto', padding: '0 24px' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: '2rem', marginBottom: 8 }}>R&D Module</h1>
          <p className="text-muted">Log experimental entries. You can add multiple products under the same Pick Number.</p>
        </div>

        <div className="card" style={{ padding: 32 }}>
          {message.text && (
            <div className={`alert alert-${message.type === 'error' ? 'danger' : 'success'}`} style={{ marginBottom: 24 }}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* --- TOP SECTION: Batch Level Info --- */}
            <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '12px', marginBottom: '32px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ marginTop: 0, marginBottom: 20, color: '#334155', fontSize: '1.1rem' }}>Batch Information</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 20 }}>
                <div>
                  <label style={labelStyle}>Pick Number <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. PKG-042"
                    value={batchForm.pickNumber}
                    onChange={e => setBatchForm({ ...batchForm, pickNumber: e.target.value })}
                    style={inputStyle}
                    required
                  />
                </div>
                <div>
                  <label style={labelStyle}>Result / Status <span style={{ color: '#ef4444' }}>*</span></label>
                  <select
                    className="input-field"
                    value={batchForm.acceptReject}
                    onChange={e => setBatchForm({ ...batchForm, acceptReject: e.target.value })}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                    required
                  >
                    <option value="Accept">✅ Accept</option>
                    <option value="Reject">❌ Reject</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Remark (Optional)</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Optional note or observation..."
                    value={batchForm.remark}
                    onChange={e => setBatchForm({ ...batchForm, remark: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            {/* --- BOTTOM SECTION: Products List --- */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ margin: 0, color: '#334155', fontSize: '1.1rem' }}>Products</h3>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm" 
                  onClick={addProductRow}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <span style={{ fontSize: 16 }}>+</span> Add Another Product
                </button>
              </div>

              {products.map((prod, index) => (
                <div key={prod.id} style={{ 
                  display: 'grid', gridTemplateColumns: '1.5fr 2fr 1.5fr 1fr 40px', gap: 16, alignItems: 'flex-start',
                  padding: '16px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '16px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}>
                  {/* Product Code */}
                  <div>
                    <label style={labelStyle}>Product Code <span style={{ color: '#ef4444' }}>*</span></label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="e.g. RD-001"
                        value={prod.code}
                        onChange={(e) => handleProductChange(prod.id, 'code', e.target.value)}
                        required
                        style={{ ...inputStyle, paddingRight: 36 }}
                      />
                      {prod.codeMatch === true && (
                        <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#16a34a', fontSize: 16 }}>✓</span>
                      )}
                      {prod.codeMatch === false && (
                        <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#ef4444', fontSize: 16 }}>✗</span>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label style={labelStyle}>Description <span style={{ color: '#ef4444' }}>*</span></label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Product Description"
                      value={prod.description}
                      onChange={(e) => handleProductChange(prod.id, 'description', e.target.value)}
                      required
                      style={inputStyle}
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label style={labelStyle}>Category <span style={{ color: '#ef4444' }}>*</span></label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Category"
                      value={prod.category}
                      onChange={(e) => handleProductChange(prod.id, 'category', e.target.value)}
                      required
                      style={inputStyle}
                    />
                  </div>

                  {/* Received Count */}
                  <div>
                    <label style={labelStyle}>Received <span style={{ color: '#ef4444' }}>*</span></label>
                    <input
                      type="number"
                      className="input-field"
                      placeholder="0"
                      min="0"
                      value={prod.receivedCount}
                      onChange={(e) => handleProductChange(prod.id, 'receivedCount', e.target.value)}
                      required
                      style={inputStyle}
                    />
                  </div>

                  {/* Remove Button */}
                  <div style={{ paddingTop: '28px', display: 'flex', justifyContent: 'center' }}>
                    <button
                      type="button"
                      onClick={() => removeProductRow(prod.id)}
                      disabled={products.length <= 1}
                      style={{ 
                        background: 'none', border: 'none', cursor: products.length <= 1 ? 'not-allowed' : 'pointer',
                        color: products.length <= 1 ? '#cbd5e1' : '#ef4444', padding: '8px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px'
                      }}
                      title="Remove Product"
                    >
                      <GlassIcon name="trash" size={18} color={products.length <= 1 ? '#cbd5e1' : '#ef4444'} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Submit Actions */}
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setBatchForm({ pickNumber: '', acceptReject: 'Accept', remark: '' });
                  setProducts([{ id: Date.now(), code: '', description: '', category: '', receivedCount: '', codeMatch: null }]);
                  setMessage({ type: '', text: '' });
                }}
                style={{ minWidth: 100, height: 44 }}
              >
                Clear All
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting || products.length === 0}
                style={{ minWidth: 160, height: 44, fontSize: '1.0rem' }}
              >
                {isSubmitting ? 'Submitting…' : `Log ${products.length} Entry(s)`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

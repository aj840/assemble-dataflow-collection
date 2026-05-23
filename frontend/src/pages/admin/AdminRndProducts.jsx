import { useState, useEffect } from 'react';
import GlassIcon from '../../components/GlassIcon';
import { api } from '../../services/api';

export default function AdminRndProducts() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState({ code: '', description: '', category: '' });
  const [error, setError] = useState('');

  const fetchProducts = async () => {
    try {
      const data = await api.getRndProducts();
      setProducts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.createRndProduct(form);
      
      setForm({ code: '', description: '', category: '' });
      fetchProducts();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await api.deleteRndProduct(id);
      fetchProducts();
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) return <div style={{ padding: 24 }}>Loading R&D products...</div>;

  return (
    <div className="admin-view" style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: 8 }}>R&D Products</h2>
        <p className="text-muted">Manage products available in the R&D module.</p>
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16 }}>Add New Product</h3>
        {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr auto', gap: 12, alignItems: 'end' }}>
          <div>
            <label className="text-sm font-medium" style={{ display: 'block', marginBottom: 6 }}>Product Code</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="e.g. RD-001" 
              value={form.code} 
              onChange={e => setForm({ ...form, code: e.target.value })} 
              required 
            />
          </div>
          <div>
            <label className="text-sm font-medium" style={{ display: 'block', marginBottom: 6 }}>Description</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="e.g. Experimental Core" 
              value={form.description} 
              onChange={e => setForm({ ...form, description: e.target.value })} 
              required 
            />
          </div>
          <div>
            <label className="text-sm font-medium" style={{ display: 'block', marginBottom: 6 }}>Category</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="e.g. Hardware" 
              value={form.category} 
              onChange={e => setForm({ ...form, category: e.target.value })} 
              required 
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ height: 38 }}>Add</button>
        </form>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ marginBottom: 16 }}>Existing Products ({products.length})</h3>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Description</th>
                <th>Category</th>
                <th style={{ width: 80 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id}>
                  <td><span className="badge badge-info">{p.code}</span></td>
                  <td>{p.description}</td>
                  <td>{p.category}</td>
                  <td>
                    <button className="btn-icon" onClick={() => handleDelete(p.id)} title="Delete">
                      <GlassIcon name="trash" size={16} color="#ef4444" />
                    </button>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af' }}>
                    No products found. Create one above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

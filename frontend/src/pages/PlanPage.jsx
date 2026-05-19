import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import GlassIcon from '../components/GlassIcon';
import ImageScanModal from '../components/ImageScanModal';
import ModalPortal from '../components/ModalPortal';

const EMPTY_FORM = { refer: '', moNumber: '', sku: '', qty: '', od: '', batteryQty: '', pcbaQty: '', coilQty: '', shellQty: '', lensQty: '' };

export default function PlanPage({ initialRows = [], onBack, onConfirm }) {
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);
  const [derived, setDerived] = useState({ battery: '', pcba: '', coil: '', shell: '', lens: '', isProRing: false });
  const [config, setConfig] = useState({ fixedBattery: '', fixedPCBA: '', autoMode: false });
  const [rows, setRows] = useState(initialRows);
  const [editId, setEditId] = useState(null);

  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState('');
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);

  // Plan date — one date for the whole pending batch
  const todayStr = new Date().toISOString().split('T')[0];
  const [planDate, setPlanDate] = useState(todayStr);

  // Multi-select & Bulk Edit
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkForm, setBulkForm] = useState({ batteryQty: '', pcbaQty: '', coilQty: '', shellQty: '', lensQty: '' });

  const toggleSelectAll = () => {
    if (selectedIds.length === rows.length && rows.length > 0) setSelectedIds([]);
    else setSelectedIds(rows.map(r => r.id));
  };
  
  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  
  const handleBulkSave = () => {
    setRows(rows.map(r => {
      if (selectedIds.includes(r.id)) {
        return {
          ...r,
          batteryQty: bulkForm.batteryQty !== '' ? bulkForm.batteryQty : r.batteryQty,
          pcbaQty:    bulkForm.pcbaQty    !== '' ? bulkForm.pcbaQty    : r.pcbaQty,
          coilQty:    bulkForm.coilQty    !== '' ? bulkForm.coilQty    : r.coilQty,
          shellQty:   bulkForm.shellQty   !== '' ? bulkForm.shellQty   : r.shellQty,
          lensQty:    bulkForm.lensQty    !== '' ? bulkForm.lensQty    : r.lensQty,
        };
      }
      return r;
    }));
    setShowBulkModal(false);
    setSelectedIds([]);
    setBulkForm({ batteryQty: '', pcbaQty: '', coilQty: '', shellQty: '', lensQty: '' });
  };

  useEffect(() => {
    api.getConfig().then(setConfig).catch(() => {});
  }, []);

  // Live SKU auto-fill
  useEffect(() => {
    if (!form.sku) {
      const t = setTimeout(() => setDerived({ battery: config.fixedBattery, pcba: config.fixedPCBA, coil: '', shell: '' }), 0);
      return () => clearTimeout(t);
    }
    const timer = setTimeout(async () => {
      setParsing(true);
      try {
        const result = await api.parseSKU({ sku: form.sku, refer: form.refer || 'o' });
        setDerived(result);
      } catch {
        // fallback local parse — mirrors server logic including autoMode
        const num = form.sku.toUpperCase().match(/\d+$/)?.[0] || '';
        const ref = (form.refer || 'o').toLowerCase().trim();
        const prefix = ['o', '0'].includes(ref) ? '0.2mm' : '0.3mm';
        let battery = config.fixedBattery;
        if (config.autoMode) {
          const endNum = num ? parseInt(num, 10) : 0;
          battery = (endNum >= 5 && endNum <= 8) ? '24mah battery' : '32mah battery';
        }
        setDerived({
          battery,
          pcba: config.fixedPCBA,
          coil: num ? `Ring RX Coil-${num}` : 'N/A',
          shell: num ? `${prefix} ${form.sku.toUpperCase()}` : form.sku.toUpperCase()
        });
      } finally {
        setParsing(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [form.sku, form.refer, config]);

  const handleAddRow = async (e) => {
    e.preventDefault();
    if (!form.refer || !form.moNumber || !form.sku || !form.qty || !form.od) { 
      setError('Refer, MO Number, SKU, QTY, and OD are completely required.'); 
      return; 
    }

    // Check if moNumber is already in the pending rows list
    const isDuplicateInRows = rows.some(r => r.moNumber === form.moNumber && r.id !== editId);
    if (isDuplicateInRows) {
      setError(`MO Number '${form.moNumber}' is already in the pending plan list below.`);
      return;
    }

    // Check if moNumber is already taken in the database
    try {
      const existingMOs = await api.getMOs({ moNumber: form.moNumber });
      const exactMatch = existingMOs.find(m => m.moNumber === form.moNumber);
      if (exactMatch) {
        setError(`MO Number '${form.moNumber}' is already taken in the database.`);
        return;
      }
    } catch (e) { console.error(e); }

    setError('');
    const isProRing = derived.isProRing === true;
    const bQty = form.batteryQty !== '' && form.batteryQty !== undefined ? form.batteryQty : form.qty;
    const pQty = form.pcbaQty    !== '' && form.pcbaQty    !== undefined ? form.pcbaQty    : form.qty;
    const cQty = isProRing ? 0 : (form.coilQty !== '' && form.coilQty !== undefined ? form.coilQty : form.qty);
    const sQty = form.shellQty   !== '' && form.shellQty   !== undefined ? form.shellQty   : form.qty;
    const lQty = isProRing ? (form.lensQty !== '' && form.lensQty !== undefined ? form.lensQty : form.qty) : 0;

    if (editId) {
      setRows(rows.map(r => r.id === editId ? { ...r, ...form, planDate, batteryQty: bQty, pcbaQty: pQty, coilQty: cQty, shellQty: sQty, lensQty: lQty, ...derived } : r));
      setEditId(null);
    } else {
      setRows([...rows, { id: Date.now().toString(), planDate, ...form, batteryQty: bQty, pcbaQty: pQty, coilQty: cQty, shellQty: sQty, lensQty: lQty, ...derived }]);
    }
    setForm(EMPTY_FORM);
  };

  const handleEdit = (row) => {
    setForm({ 
      refer: row.refer || '', moNumber: row.moNumber || '', sku: row.sku || '', qty: row.qty || '',
      od: row.od || '',
      batteryQty: row.batteryQty || '', pcbaQty: row.pcbaQty || '', coilQty: row.coilQty || '', shellQty: row.shellQty || '', lensQty: row.lensQty || ''
    });
    setEditId(row.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id) => setRows(rows.filter(r => r.id !== id));

  // Called when ImageScanModal finishes — resolves SKU derivations for each row
  const handleRowsExtracted = useCallback(async (scannedRows) => {
    if (!scannedRows.length) return;
    setScanLoading(true);
    try {
      const resolved = await Promise.all(
        scannedRows.map(async (r) => {
          let derivedComps = { battery: '', pcba: '', coil: '', shell: '' };
          if (r.sku) {
            try {
              derivedComps = await api.parseSKU({ sku: r.sku, refer: r.refer || 'o' });
            } catch {
              const skuUpper = (r.sku || '').toUpperCase().trim();
              const numMatch = skuUpper.match(/\d+$/);
              const num = numMatch ? numMatch[0] : '';
              const ref = (r.refer || '').toLowerCase().trim();
              const is02mm = ['o', '0'].includes(ref);

              const prefixMatch = skuUpper.match(/^[A-Z]+/);
              const letterPrefix = prefixMatch ? prefixMatch[0] : '';

              let finalShell = skuUpper; // Default fallback

              if (letterPrefix === 'LR') finalShell = `RARE ROSE GOLD SHELL RS${num}`;
              else if (letterPrefix === 'LP') finalShell = `RARE PLATINUM SHELL S${num}`;
              else if (letterPrefix === 'LG') finalShell = `RARE YELLOW GOLD SHELL LG${num}`;
              else if (letterPrefix === 'DS') finalShell = `DIESEL SILVER SHELL DS${num}`;
              else if (letterPrefix === 'DB') finalShell = `DIESEL BLACK SHELL DB${num}`;
              else if (letterPrefix === 'BRG') finalShell = `Brushed Rose gold 0.2MM - SIZE ${num}`;
              else {
                // For standard SKUs (e.g., AA05)
                finalShell = is02mm ? (num ? `0.2mm ${skuUpper}` : skuUpper) : skuUpper;
              }

              const isRare = ['LG', 'LR', 'LP'].includes(letterPrefix);

              derivedComps = {
                battery: config.fixedBattery || '32mah battery',
                pcba: config.fixedPCBA || '',
                coil: num ? (isRare ? `Rare Ring RX Coil-${num}` : `Ring RX Coil-${num}`) : 'N/A',
                shell: finalShell,
              };
            }
          }
          return {
            id: `scan-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            planDate,
            ...r,
            ...derivedComps,
          };
        })
      );
      setRows(prev => [...prev, ...resolved]);
    } finally {
      setScanLoading(false);
    }
  }, [config, planDate]);

  // CSV Upload handler
  const handleCsvUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // reset input so same file can be re-uploaded
    setCsvLoading(true);
    try {
      let text = await file.text();
      // Strip Byte Order Mark (BOM) which can break header matching
      text = text.replace(/^\uFEFF/, '');
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) { alert('CSV must have a header row + at least one data row.'); return; }
      
      // Auto-detect delimiter
      const headerLine = lines[0];
      let delimiter = ',';
      if (headerLine.includes('\t')) delimiter = '\t';
      else if (headerLine.includes(';') && !headerLine.includes(',')) delimiter = ';';

      const parseLine = (line) => {
        // Fallback for simple split if regex is too complex/slow for large files
        if (!line.includes('"')) {
          return line.split(delimiter).map(c => c.trim());
        }
        
        let cols = line.split(delimiter); // naive split, good enough for most basic data without commas in values
        return cols.map(c => c.trim().replace(/^"|"$/g, ''));
      };

      const headers = parseLine(lines[0]).map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
      
      // Map flexible header names
      const colIdx = (names) => { for (const n of names) { const i = headers.indexOf(n); if (i !== -1) return i; } return -1; };
      const odIdx    = colIdx(['od','refer','o','outerdiameter']);
      const moIdx    = colIdx(['monumber','mo','mononumber','order','ordernumber','productionorder','mfgorder','id']);
      const skuIdx   = colIdx(['sku','item','itemcode','partnumber','product','material']);
      const qtyIdx   = colIdx(['qty','quantity','count','amount','target']);
      const referIdx = colIdx(['refer','ref','reference','od']);

      if (skuIdx === -1 || qtyIdx === -1 || moIdx === -1) {
        alert(`CSV must have columns for MO Number, SKU, and QTY.\nDetected headers: ${parseLine(lines[0]).join(', ')}\nPlease check your CSV headers.`);
        return;
      }

      const parsed = lines.slice(1).map(line => {
        const cols = parseLine(line);
        return {
          refer: odIdx !== -1 ? cols[odIdx] || 'o' : 'o',
          od:    referIdx !== -1 && referIdx !== odIdx ? cols[referIdx] || '' : cols[odIdx] || '',
          moNumber: moIdx !== -1 ? cols[moIdx] || '' : '',
          sku:   skuIdx !== -1 ? cols[skuIdx] || '' : '',
          qty:   qtyIdx !== -1 ? cols[qtyIdx] || '0' : '0',
        };
      }).filter(r => r.sku && r.moNumber && parseInt(r.qty) > 0);

      if (!parsed.length) { alert('No valid rows found in CSV.'); return; }
      await handleRowsExtracted(parsed);
    } catch (err) {
      alert('Failed to parse CSV: ' + err.message);
    } finally {
      setCsvLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!rows.length) return;
    const bid = `BATCH-${Date.now()}`;
    onConfirm(rows.map(r => ({ ...r, submittedBy: user?.fullName, batchId: bid })), bid);
  };

  const totalQty = rows.reduce((s, r) => s + parseInt(r.qty || 0), 0);

  return (
    <div style={{ minHeight: '100vh', background: 'transparent' }}>
      {/* Navbar */}
      <nav className="navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="navbar-brand"><div className="navbar-logo">◇</div>UltraHuman Assembly</div>
          <div className="navbar-breadcrumb">
            <span style={{ cursor: 'pointer', color: '#6b7280' }} onClick={onBack}>Platform</span>
            <span>›</span>
            <span style={{ color: '#111827', fontWeight: 600 }}>Plan</span>
          </div>
        </div>
        <div className="navbar-right">
          <button className="btn-icon">?</button>
          <div className="user-chip">
            <div style={{ position: 'relative' }}>
              <div className="user-avatar">{user?.fullName?.[0]}</div>
              <div className="online-dot" />
            </div>
            <div className="user-info-text">
              <div className="name">{user?.fullName}</div>
              <div className="role">Data Entry</div>
            </div>
          </div>
          {rows.length > 0 && (
            <button className="btn btn-primary" onClick={handleConfirm} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <GlassIcon name="history" size={16} color="#ffffff" /> Confirm Plan ({rows.length})
            </button>
          )}
        </div>
      </nav>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px' }}>
        <div style={{ marginBottom: 24 }}>
          <h2>Plan Data Entry</h2>
          <p className="text-muted text-sm">Log new production items and verify SKU-derived component mappings.</p>
        </div>

        {/* Progress bar if rows exist */}
        {rows.length > 0 && (
          <div className="card" style={{ padding: '12px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20 }}>
            <span className="text-sm font-semibold">{rows.length} row(s) pending</span>
            <span className="text-sm text-muted">Total QTY: <strong>{totalQty.toLocaleString()}</strong></span>
            <span className="text-sm text-muted">Unique SKUs: <strong>{new Set(rows.map(r => r.sku)).size}</strong></span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
          {/* Left: Form + Table */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Entry Form */}
            <div className="card">
              <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <GlassIcon name="plan" size={20} color="#2563eb" />
                  <h3 style={{ margin: 0 }}>{editId ? 'Edit Row' : 'Add New Production Row'}</h3>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowScanModal(true)}
                    disabled={scanLoading || csvLoading}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: 'linear-gradient(135deg,#ede9fe,#eff6ff)',
                      border: '1.5px solid #c4b5fd',
                      color: '#7c3aed', fontWeight: 700,
                      padding: '6px 14px', borderRadius: 8,
                      cursor: 'pointer', fontSize: 13,
                      transition: 'all 0.2s',
                    }}
                  >
                    {scanLoading ? (
                      <><span className="spinner" style={{ display: 'inline-block', width: 14, height: 14, borderWidth: 2 }} /> Resolving SKUs…</>
                    ) : <><GlassIcon name="camera" size={14} /> Scan Image</>}
                  </button>
                  <label
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: 'linear-gradient(135deg,#dcfce7,#eff6ff)',
                      border: '1.5px solid #86efac',
                      color: '#15803d', fontWeight: 700,
                      padding: '6px 14px', borderRadius: 8,
                      cursor: csvLoading ? 'not-allowed' : 'pointer', fontSize: 13,
                      transition: 'all 0.2s', whiteSpace: 'nowrap',
                    }}
                    title="Upload CSV — columns: OD, MO Number, SKU, QTY, Refer"
                  >
                    {csvLoading ? (
                      <><span className="spinner" style={{ display: 'inline-block', width: 14, height: 14, borderWidth: 2 }} /> Processing…</>
                    ) : <><GlassIcon name="folder" size={14} /> Upload CSV</>}
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      style={{ display: 'none' }}
                      disabled={csvLoading || scanLoading}
                      onChange={handleCsvUpload}
                    />
                  </label>
                </div>

              </div>
              <div className="card-body">
                {error && <div className="alert alert-danger" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}><GlassIcon name="alert" size={16} /> {error}</div>}
                <form onSubmit={handleAddRow}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 16 }}>
                    <div className="form-group">
                      <label>OD</label>
                      <input
                        placeholder='o = 0.2mm, s = 0.3mm'
                        value={form.refer}
                        onChange={e => setForm({ ...form, refer: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>REFER</label>
                      <input
                        placeholder="Reference details"
                        value={form.od}
                        onChange={e => setForm({ ...form, od: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>MO Number</label>
                      <input
                        placeholder="MO-"
                        value={form.moNumber}
                        onChange={e => setForm({ ...form, moNumber: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>SKU <span style={{ color: config.autoMode ? '#7c3aed' : '#2563eb', fontSize: 11 }}>{config.autoMode ? '(⚡ AUTO-BATTERY ACTIVE)' : '(AUTO-PARSING ACTIVE)'}</span></label>
                      <input
                        placeholder="Ex: AA10"
                        value={form.sku}
                        onChange={e => setForm({ ...form, sku: e.target.value })}
                        required
                        style={{ borderColor: form.sku ? '#2563eb' : '' }}
                      />
                    </div>
                    <div className="form-group">
                      <label>{editId ? 'Target MO Qty' : 'Quantity'}</label>
                      <input
                        type="number"
                        min="1"
                        placeholder="QTY"
                        value={form.qty}
                        onChange={e => setForm({ ...form, qty: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  {editId && (
                    <div style={{ marginTop: 10, marginBottom: 20, padding: 12, background: '#eff6ff', borderRadius: 8, display: 'grid', gridTemplateColumns: derived.isProRing ? 'repeat(4,1fr)' : 'repeat(4,1fr)', gap: 12 }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ color: '#1e40af' }}>Battery Collected</label>
                        <input type="number" min="0" value={form.batteryQty} onChange={e => setForm({ ...form, batteryQty: e.target.value })} />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ color: '#1e40af' }}>PCBA Collected</label>
                        <input type="number" min="0" value={form.pcbaQty} onChange={e => setForm({ ...form, pcbaQty: e.target.value })} />
                      </div>
                      {!derived.isProRing && (
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ color: '#1e40af' }}>Coil Collected</label>
                          <input type="number" min="0" value={form.coilQty} onChange={e => setForm({ ...form, coilQty: e.target.value })} />
                        </div>
                      )}
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ color: '#1e40af' }}>Shell Collected</label>
                        <input type="number" min="0" value={form.shellQty} onChange={e => setForm({ ...form, shellQty: e.target.value })} />
                      </div>
                      {derived.isProRing && (
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ color: '#e67e22', fontWeight: 700 }}>🔬 Lens Collected</label>
                          <input type="number" min="0" value={form.lensQty} onChange={e => setForm({ ...form, lensQty: e.target.value })} style={{ borderColor: '#e67e22' }} />
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="submit" className="btn btn-primary">
                      {editId ? <><GlassIcon name="save" size={14} /> Save Changes</> : <><GlassIcon name="add" size={14} /> Add Row</>}
                    </button>
                    {editId && (
                      <button type="button" className="btn btn-secondary" onClick={() => { setEditId(null); setForm(EMPTY_FORM); }}>
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>

            {/* Pending Table */}
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>Pending Plan Items</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {selectedIds.length > 0 && (
                    <button 
                      className="btn btn-primary btn-sm" 
                      onClick={() => setShowBulkModal(true)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#4f46e5', border: 'none' }}
                    >
                      <GlassIcon name="edit" size={14} color="#ffffff" /> Bulk Edit ({selectedIds.length})
                    </button>
                  )}
                  <span className="text-sm text-muted">Showing {rows.length} production {rows.length === 1 ? 'entry' : 'entries'}</span>
                  {/* Plan Date Picker */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 8, padding: '5px 12px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: '#2563eb', whiteSpace: 'nowrap' }}><GlassIcon name="history" size={14} /> Plan Date:</span>
                    <input
                      type="date"
                      value={planDate}
                      onChange={e => {
                        const newDate = e.target.value;
                        setPlanDate(newDate);
                        setRows(rows.map(r => ({ ...r, planDate: newDate })));
                      }}
                      style={{ border: 'none', background: 'transparent', fontSize: 13, color: '#1e40af', fontWeight: 600, outline: 'none', cursor: 'pointer' }}
                      title="Set plan date — applies to all MOs in this batch"
                    />
                  </div>
                </div>
              </div>
              {rows.length === 0 ? (
                <div className="empty-state">
                  <div className="icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><GlassIcon name="document" size={48} color="#9ca3af" /></div>
                  <p>No rows added yet. Fill in the form above to add a production entry.</p>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 40, textAlign: 'center' }}>
                          <input 
                            type="checkbox" 
                            checked={rows.length > 0 && selectedIds.length === rows.length} 
                            onChange={toggleSelectAll} 
                            style={{ cursor: 'pointer' }} 
                          />
                        </th>
                        <th>Plan Date</th>
                        <th>OD</th>
                        <th>MO</th>
                        <th>SKU</th>
                        <th>QTY</th>
                        <th>Refer</th>
                        <th>Battery</th>
                        <th>PCBA</th>
                        <th>Coil</th>
                        <th>Shell</th>
                        <th style={{ color: '#e67e22' }}>Lens</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(row => {
                        const bQ = parseInt(row.batteryQty || 0);
                        const pQ = parseInt(row.pcbaQty || 0);
                        const cQ = parseInt(row.coilQty || 0);
                        const sQ = parseInt(row.shellQty || 0);
                        const maxQ = Math.max(bQ, pQ, cQ, sQ);
                        const hasLowComp = (bQ < maxQ || pQ < maxQ || cQ < maxQ || sQ < maxQ || bQ === 0 || pQ === 0 || cQ === 0 || sQ === 0);

                        return (
                        <tr key={row.id} style={{ background: editId === row.id ? '#eff6ff' : '' }}>
                          <td style={{ textAlign: 'center' }}>
                            <input 
                              type="checkbox" 
                              checked={selectedIds.includes(row.id)} 
                              onChange={() => toggleSelect(row.id)} 
                              style={{ cursor: 'pointer' }} 
                            />
                          </td>
                          <td>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#2563eb', background: '#eff6ff', padding: '2px 8px', borderRadius: 6, whiteSpace: 'nowrap' }}>
                              <GlassIcon name="history" size={12} color="#2563eb" /> {row.planDate || '—'}
                            </span>
                          </td>
                          <td className="font-mono">{row.od || '—'}</td>
                          <td className="font-mono" style={{ color: '#2563eb', fontWeight: 600 }}>
                            {row.moNumber || '—'}
                            {hasLowComp && (
                              <span title="Incomplete component collection" style={{ marginLeft: 6, cursor: 'help' }}><GlassIcon name="alert" size={14} color="#ef4444" /></span>
                            )}
                          </td>
                          <td><span className="badge badge-primary">{row.sku}</span></td>
                          <td style={{ fontWeight: 600 }}>{parseInt(row.qty).toLocaleString()}</td>
                          <td>{row.refer || '—'}</td>
                          <td className="text-sm">{row.battery} <strong style={{color:'#2563eb'}}>(Collected: {row.batteryQty})</strong></td>
                          <td className="text-sm">{row.pcba} <strong style={{color:'#7c3aed'}}>(Collected: {row.pcbaQty})</strong></td>
                          <td className="text-sm">{row.isProRing ? <span style={{color:'#9ca3af',fontSize:11}}>N/A</span> : <>{row.coil} <strong style={{color:'#059669'}}>(Collected: {row.coilQty})</strong></>}</td>
                          <td className="text-sm">{row.shell} <strong style={{color:'#d97706'}}>(Collected: {row.shellQty})</strong></td>
                          <td className="text-sm">{row.isProRing ? <><span style={{color:'#e67e22'}}>{row.lens}</span> <strong style={{color:'#e67e22'}}>(Collected: {row.lensQty})</strong></> : <span style={{color:'#9ca3af',fontSize:11}}>N/A</span>}</td>
                          <td>
                            <div className="td-actions">
                              <button className="btn-icon" onClick={() => handleEdit(row)} title="Edit">
                                <GlassIcon name="edit" size={16} color="#2563eb" />
                              </button>
                              <button className="btn-icon danger" onClick={() => handleDelete(row.id)} title="Delete">
                                <GlassIcon name="delete" size={16} color="#dc2626" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right: Derived Components Panel */}
          <div className="card" style={{ height: 'fit-content', position: 'sticky', top: 80 }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <GlassIcon name="settings" size={20} color="#111827" /> Derived Components
              </h3>
              {parsing && <span className="spinner" />}
            </div>
            <div className="card-body">
              <p className="text-sm text-muted" style={{ marginBottom: 16 }}>
                Real-time SKU analysis for: <strong>{form.sku || '---'}</strong>
              </p>
              {!form.sku ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: '#9ca3af' }}>
                  <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
                    <GlassIcon name="settings" size={40} color="#9ca3af" />
                  </div>
                  <p className="text-sm">Enter an SKU in the entry form to see derived component details.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    { label: 'BATTERY', value: derived.battery, isAuto: derived.isProRing || config.autoMode, color: derived.isProRing ? '#e67e22' : config.autoMode ? '#7c3aed' : '#2563eb' },
                    { label: 'PCBA', value: derived.pcba, locked: true, color: '#7c3aed' },
                    ...(!derived.isProRing ? [{ label: 'COIL', value: derived.coil, locked: false, color: '#059669' }] : []),
                    { label: 'SHELL', value: derived.shell, locked: false, color: '#d97706' },
                    ...(derived.isProRing ? [{ label: 'LENS 🔬', value: derived.lens, locked: false, color: '#e67e22' }] : []),
                  ].map(item => (
                    <div key={item.label} style={{ padding: '12px', border: `1px solid ${item.isAuto ? '#ddd6fe' : '#e5e7eb'}`, borderRadius: 8, background: item.isAuto ? '#faf5ff' : 'transparent' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', letterSpacing: '0.05em' }}>{item.label}</span>
                        {item.isAuto
                          ? <span style={{ fontSize: 10, background: '#ede9fe', color: '#7c3aed', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>⚡ AUTO</span>
                          : item.locked
                            ? <span style={{ fontSize: 10, background: '#eff6ff', color: '#2563eb', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>🔒 FIXED</span>
                            : null
                        }
                      </div>
                      <div style={{ fontWeight: 600, color: item.color, fontSize: 13.5 }}>{item.value || 'Calculating...'}</div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #f3f4f6' }}>
                <p style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, marginBottom: 8 }}>LEGEND</p>
                {[
                  { dot: '#2563eb', label: 'Primary system match' },
                  { dot: '#d97706', label: 'Manual override available' },
                  { dot: '#6b7280', label: 'Admin restriction active' },
                ].map(l => (
                  <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.dot }} />
                    <span style={{ fontSize: 12, color: '#6b7280' }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Scan Modal */}
      {showScanModal && (
        <ImageScanModal
          onClose={() => setShowScanModal(false)}
          onRowsExtracted={handleRowsExtracted}
        />
      )}

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '16px 24px', borderTop: '1px solid #e5e7eb', background: 'white', marginTop: 40, display: 'flex', justifyContent: 'space-between' }}>
        <span className="text-sm text-muted">© 2024 UltraHuman Assembly Inc. All rights reserved.</span>
        <div style={{ display: 'flex', gap: 20 }}>
          {['Privacy Policy', 'Terms of Service', 'Support'].map(l => (
            <span key={l} className="text-sm text-muted" style={{ cursor: 'pointer' }}>{l}</span>
          ))}
        </div>
      </div>

      {/* Bulk Edit Modal */}
      {showBulkModal && (
        <ModalPortal>
          <div className="modal-overlay" onClick={() => setShowBulkModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <GlassIcon name="edit" size={20} color="#4f46e5" />
                  <h3 style={{ margin: 0 }}>Bulk Edit ({selectedIds.length} MOs selected)</h3>
                </div>
                <button className="btn-icon" onClick={() => setShowBulkModal(false)}>✕</button>
              </div>
              <div style={{ padding: '20px 24px' }}>
                <p className="text-muted text-sm" style={{ marginBottom: 20 }}>
                  Enter values for the components you want to update for all selected MOs. 
                  Leave a field empty to keep its existing value.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label style={{ color: '#2563eb' }}>Battery Collected</label>
                    <input type="number" min="0" placeholder="Leave empty to skip" value={bulkForm.batteryQty} onChange={e => setBulkForm({ ...bulkForm, batteryQty: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label style={{ color: '#7c3aed' }}>PCBA Collected</label>
                    <input type="number" min="0" placeholder="Leave empty to skip" value={bulkForm.pcbaQty} onChange={e => setBulkForm({ ...bulkForm, pcbaQty: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label style={{ color: '#059669' }}>Coil Collected <span style={{fontSize:11,color:'#9ca3af'}}>(skip for PR)</span></label>
                    <input type="number" min="0" placeholder="Leave empty to skip" value={bulkForm.coilQty} onChange={e => setBulkForm({ ...bulkForm, coilQty: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label style={{ color: '#d97706' }}>Shell Collected</label>
                    <input type="number" min="0" placeholder="Leave empty to skip" value={bulkForm.shellQty} onChange={e => setBulkForm({ ...bulkForm, shellQty: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label style={{ color: '#e67e22' }}>🔬 Lens Collected <span style={{fontSize:11,color:'#9ca3af'}}>(PR only)</span></label>
                    <input type="number" min="0" placeholder="Leave empty to skip" value={bulkForm.lensQty} onChange={e => setBulkForm({ ...bulkForm, lensQty: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowBulkModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleBulkSave} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#4f46e5', border: 'none' }}>
                  <GlassIcon name="save" size={14} color="#ffffff" /> Apply to {selectedIds.length} MOs
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}

import { useState, useRef, useCallback } from 'react';
import ModalPortal from './ModalPortal';
import { extractPlanDataFromImage } from '../services/vision';

const STAGES = {
  IDLE: 'idle',
  UPLOADING: 'uploading',
  SCANNING: 'scanning',
  DONE: 'done',
  ERROR: 'error',
};

export default function ImageScanModal({ onClose, onRowsExtracted }) {
  const [stage, setStage] = useState(STAGES.IDLE);
  const [preview, setPreview] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [extractedRows, setExtractedRows] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [fileName, setFileName] = useState('');
  const fileRef = useRef(null);

  const processFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setErrorMsg('Please upload a valid image file (PNG, JPG, WEBP, etc.)');
      setStage(STAGES.ERROR);
      return;
    }

    // Show preview
    const url = URL.createObjectURL(file);
    setPreview(url);
    setFileName(file.name);
    setStage(STAGES.SCANNING);
    setErrorMsg('');

    try {
      const rows = await extractPlanDataFromImage(file);
      setExtractedRows(rows);
      if (rows.length === 0) {
        setErrorMsg('No production data found in the image. Try a clearer photo of the plan document.');
        setStage(STAGES.ERROR);
      } else {
        setStage(STAGES.DONE);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to extract data from image.');
      setStage(STAGES.ERROR);
    }
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);

  const handleConfirm = () => {
    onRowsExtracted(extractedRows);
    onClose();
  };

  const handleRetry = () => {
    setStage(STAGES.IDLE);
    setPreview(null);
    setExtractedRows([]);
    setErrorMsg('');
    setFileName('');
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <ModalPortal>
      <div className="modal-overlay" onClick={stage === STAGES.SCANNING ? undefined : onClose}>
        <div
          className="modal"
          onClick={e => e.stopPropagation()}
          style={{ maxWidth: 700, width: '95vw' }}
        >
          {/* Header */}
          <div className="modal-header">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
              <span style={{ fontSize: 22 }}>🤖</span>
              AI Image Scan
              <span style={{
                fontSize: 11, background: 'linear-gradient(90deg,#39cfbe,#0a2540)',
                color: '#fff', padding: '2px 8px', borderRadius: 20, fontWeight: 600
              }}>
                Cohere Vision
              </span>
            </h3>
            {stage !== STAGES.SCANNING && (
              <button className="btn-icon" onClick={onClose}>✕</button>
            )}
          </div>

          {/* Body */}
          <div style={{ padding: '20px 24px' }}>

            {/* ── IDLE: Drop zone ── */}
            {stage === STAGES.IDLE && (
              <>
                <p className="text-sm text-muted" style={{ marginBottom: 20 }}>
                  Upload a photo or screenshot of your production plan. Cohere AI will automatically extract all rows and fill the entry list.
                </p>
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileRef.current?.click()}
                  style={{
                    border: `2px dashed ${dragging ? '#2563eb' : '#d1d5db'}`,
                    borderRadius: 16,
                    padding: '48px 24px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: dragging ? '#eff6ff' : '#f9fafb',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ fontSize: 48, marginBottom: 12 }}>📸</div>
                  <p style={{ fontWeight: 600, color: '#111827', marginBottom: 6 }}>
                    {dragging ? 'Drop your image here!' : 'Drop image or click to browse'}
                  </p>
                  <p className="text-sm text-muted">Supports PNG, JPG, WEBP, BMP — max 20MB</p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                </div>
                <div style={{ marginTop: 16, padding: '10px 14px', background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe' }}>
                  <p className="text-sm" style={{ color: '#1e40af', margin: 0 }}>
                    <GlassIcon name="alert" size={14} color="#eab308" /> <strong>Tip:</strong> Works best with clear photos of Excel sheets, MO printouts, or handwritten tables containing SKU, MO Number, and Quantity columns.
                  </p>
                </div>
              </>
            )}

            {/* ── SCANNING: Loading ── */}
            {stage === STAGES.SCANNING && (
              <div style={{ textAlign: 'center', padding: '32px 24px' }}>
                {preview && (
                  <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'center' }}>
                    <img
                      src={preview}
                      alt="Uploaded plan"
                      style={{ maxHeight: 220, maxWidth: '100%', borderRadius: 10, border: '2px solid #e5e7eb', objectFit: 'contain' }}
                    />
                  </div>
                )}
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 12,
                  background: 'linear-gradient(135deg,#ede9fe,#eff6ff)',
                  borderRadius: 12, padding: '16px 28px', marginBottom: 16
                }}>
                  <span className="spinner" style={{ display: 'inline-block', width: 24, height: 24, borderWidth: 3 }} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 700, color: '#39cfbe', fontSize: 15 }}>Cohere AI is reading your image…</div>
                    <div className="text-sm text-muted">{fileName}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap', color: '#6b7280', fontSize: 13 }}>
                  {['Detecting text','Parsing rows','Extracting SKUs','Mapping quantities'].map((s, i) => (
                    <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: '#7c3aed',
                        animation: `pulse 1.2s ${i * 0.3}s infinite`
                      }} />
                      {s}
                    </span>
                  ))}
                </div>
                <style>{`@keyframes pulse{0%,100%{opacity:0.3}50%{opacity:1}}`}</style>
              </div>
            )}

            {/* ── DONE: Preview extracted rows ── */}
            {stage === STAGES.DONE && (
              <>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
                  padding: '10px 14px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8
                }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><GlassIcon name="success" size={20} color="#16a34a" /></div>
                  <div>
                    <strong style={{ color: '#166534' }}>{extractedRows.length} row{extractedRows.length !== 1 ? 's' : ''} extracted</strong>
                    <p className="text-sm" style={{ color: '#166534', margin: 0 }}>Review below, then click "Add to Plan" to insert all rows.</p>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  {preview && (
                    <img
                      src={preview}
                      alt="Scanned document"
                      style={{ width: '100%', borderRadius: 8, border: '1px solid #e5e7eb', objectFit: 'contain', maxHeight: 200 }}
                    />
                  )}
                  <div className="table-wrapper" style={{ maxHeight: 200, overflowY: 'auto', fontSize: 12 }}>
                    <table>
                      <thead>
                        <tr>
                          <th>MO</th>
                          <th>SKU</th>
                          <th>QTY</th>
                          <th>OD</th>
                          <th>Refer</th>
                        </tr>
                      </thead>
                      <tbody>
                        {extractedRows.map((r, i) => (
                          <tr key={i}>
                            <td style={{ color: '#2563eb', fontWeight: 600 }}>{r.moNumber || '—'}</td>
                            <td><span className="badge badge-primary">{r.sku}</span></td>
                            <td style={{ fontWeight: 600 }}>{parseInt(r.qty).toLocaleString()}</td>
                            <td className="font-mono">{r.refer || '—'}</td>
                            <td>{r.od || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* ── ERROR ── */}
            {stage === STAGES.ERROR && (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                {preview && (
                  <img
                    src={preview}
                    alt="Uploaded"
                    style={{ maxHeight: 160, maxWidth: '100%', borderRadius: 8, border: '2px solid #fee2e2', objectFit: 'contain', marginBottom: 16 }}
                  />
                )}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}><GlassIcon name="alert" size={40} color="#92400e" /></div>
                <p style={{ color: '#dc2626', fontWeight: 600, marginBottom: 6 }}>Extraction Failed</p>
                <p className="text-sm text-muted">{errorMsg}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="modal-footer">
            {(stage === STAGES.ERROR || stage === STAGES.DONE) && (
              <button className="btn btn-secondary" onClick={handleRetry}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><GlassIcon name="refresh" size={14} /> Try Another Image</div>
              </button>
            )}
            {stage !== STAGES.SCANNING && (
              <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            )}
            {stage === STAGES.DONE && (
              <button className="btn btn-primary" onClick={handleConfirm} style={{
                background: 'linear-gradient(90deg,#7c3aed,#2563eb)', border: 'none'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><GlassIcon name="success" size={14} color="#fff" /> Add {extractedRows.length} Row{extractedRows.length !== 1 ? 's' : ''} to Plan</div>
              </button>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

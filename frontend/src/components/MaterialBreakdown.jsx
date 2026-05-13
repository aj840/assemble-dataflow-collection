import { useState } from 'react';
import GlassIcon from './GlassIcon';

const COLORS = {
  Battery: { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af', icon: '#2563eb' },
  PCBA:    { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534', icon: '#16a34a' },
  Coil:    { bg: '#fdf4ff', border: '#e9d5ff', text: '#6b21a8', icon: '#7c3aed' },
  Shell:   { bg: '#fffbeb', border: '#fde68a', text: '#92400e', icon: '#d97706' },
  Lens:    { bg: '#fff7ed', border: '#fed7aa', text: '#9a3412', icon: '#e67e22' },
};

function BreakdownSection({ title, type, items, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const c = COLORS[type] || COLORS.Battery;
  const total = items.reduce((s, i) => s + i.qty, 0);

  return (
    <div style={{ border: `1.5px solid ${c.border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', background: c.bg, border: 'none', cursor: 'pointer',
          fontWeight: 700, color: c.text, fontSize: 13,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <GlassIcon name={type === 'Battery' ? 'database' : type === 'PCBA' ? 'card' : type === 'Coil' ? 'shield' : type === 'Lens' ? 'shield' : 'plan'} size={16} color={c.icon} />
          {title}
          <span style={{ background: c.icon, color: '#fff', borderRadius: 20, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>
            {items.length} types
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: c.text }}>Total: <strong>{total.toLocaleString()}</strong></span>
          <span style={{ fontSize: 14, transition: 'transform 0.2s', display: 'inline-block', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</span>
        </div>
      </button>
      {open && (
        <div style={{ padding: '8px 12px 12px', background: '#fff' }}>
          {items.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>No data yet</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8, marginTop: 8 }}>
              {items.map((item, i) => {
                const pct = total > 0 ? (item.qty / total) * 100 : 0;
                return (
                  <div key={i} style={{ background: c.bg, borderRadius: 8, padding: '10px 12px', border: `1px solid ${c.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: c.text, flex: 1, marginRight: 8, lineHeight: 1.3 }}>{item.name}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: c.icon, whiteSpace: 'nowrap' }}>{item.qty.toLocaleString()}</span>
                    </div>
                    <div style={{ height: 4, background: '#e5e7eb', borderRadius: 4 }}>
                      <div style={{ height: 4, background: c.icon, borderRadius: 4, width: `${pct}%`, transition: 'width 0.4s' }} />
                    </div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>{pct.toFixed(1)}% of total</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MaterialBreakdown({ breakdown }) {
  if (!breakdown) return null;
  return (
    <div>
      <BreakdownSection title="Battery Types"                      type="Battery" items={breakdown.batteries || []} defaultOpen={true} />
      <BreakdownSection title="PCBA Types"                         type="PCBA"    items={breakdown.pcbas    || []} defaultOpen={true} />
      <BreakdownSection title="Coil Variants (by Size)"            type="Coil"    items={breakdown.coils    || []} />
      <BreakdownSection title="Shell Materials (by Thickness & Series)" type="Shell" items={breakdown.shells || []} />
      {(breakdown.lenses || []).length > 0 && (
        <BreakdownSection title="Lenses — Pro Ring 🔬"              type="Lens"    items={breakdown.lenses   || []} />
      )}
    </div>
  );
}

/**
 * migrate.js — Pro Ring (PR) backfill migration
 *
 * Runs once to:
 * 1. Ensure db.data.components.lenses exists
 * 2. For every MO: if SKU starts with "PR" → set isProRing fields;
 *    else → zero-out lens fields
 */

import db from './db.js';

function getBatteryForSize(size) {
  if (size === 5) return '24mah';
  if (size === 6) return '32mah';
  if (size >= 7 && size <= 14) return '39mah';
  return '39mah';
}

function derivePRComponents(sku) {
  const upper = (sku || '').toUpperCase().trim();
  const numMatch = upper.match(/PR(\d+)/);
  const size = numMatch ? parseInt(numMatch[1], 10) : 0;
  const nn = size < 10 ? `0${size}` : `${size}`;
  return {
    battery: getBatteryForSize(size),
    pcba:    'Ring Pro 3.5 PCBA',
    coil:    'N/A',
    shell:   `Shell S${nn}`,
    lens:    `PC LENS S${nn}`,
    isProRing: true,
  };
}

console.log('🔄  Starting Pro Ring migration…');

// ── 1. Ensure lenses category exists ─────────────────────────────────────────
if (!db.data.components.lenses) {
  db.data.components.lenses = [];
  console.log('  ✅  Created empty lenses category.');
}

if (db.data.components.lenses.length === 0) {
  for (let s = 5; s <= 14; s++) {
    const nn = s < 10 ? `0${s}` : `${s}`;
    db.data.components.lenses.push({
      id: `lens-s${nn}`,
      name: `PC LENS S${nn}`,
      status: 'Active',
      updatedAt: new Date().toISOString().split('T')[0],
    });
  }
  console.log(`  ✅  Seeded ${db.data.components.lenses.length} lens entries.`);
}

// ── 2. Backfill MO entries ────────────────────────────────────────────────────
let updated = 0;
let skipped = 0;

for (const mo of db.data.moEntries || []) {
  const isPR = (mo.sku || '').toUpperCase().trim().startsWith('PR');

  if (isPR) {
    const derived = derivePRComponents(mo.sku);
    const needsUpdate =
      mo.isProRing !== true ||
      mo.lens !== derived.lens ||
      mo.lensQty  === undefined ||
      mo.lensComp === undefined ||
      mo.coil !== 'N/A';

    if (needsUpdate) {
      mo.isProRing = true;
      mo.lens      = derived.lens;
      mo.lensQty   = mo.lensQty  !== undefined ? mo.lensQty  : (mo.qty || 0);
      mo.lensComp  = mo.lensComp !== undefined ? mo.lensComp : 0;
      mo.coil      = 'N/A';
      mo.coilQty   = 0;
      mo.coilComp  = 0;
      mo.battery   = mo.battery || derived.battery;
      mo.pcba      = mo.pcba    || derived.pcba;
      mo.shell     = mo.shell   || derived.shell;
      updated++;
    } else {
      skipped++;
    }
  } else {
    const needsUpdate =
      mo.isProRing !== false ||
      mo.lens  !== 'N/A'    ||
      mo.lensQty  !== 0     ||
      mo.lensComp !== 0;

    if (needsUpdate) {
      mo.isProRing = false;
      mo.lens      = 'N/A';
      mo.lensQty   = 0;
      mo.lensComp  = 0;
      updated++;
    } else {
      skipped++;
    }
  }
}

await db.write();

console.log(`\n✅  Migration complete!`);
console.log(`    MOs updated  : ${updated}`);
console.log(`    MOs skipped  : ${skipped}`);
console.log(`    Lenses in DB : ${db.data.components.lenses.length}`);
console.log('\nYou can now restart the server. This script is safe to re-run.');

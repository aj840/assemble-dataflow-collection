import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'data', 'db.json');

async function fixComponentsList() {
  if (!fs.existsSync(dbPath)) return;
  const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

  if (!dbData.components) {
    dbData.components = { batteries: [], pcbas: [], coils: [], shells: [] };
  }

  let added = 0;

  const ensureComponent = (category, value) => {
    if (!value || value === 'Unknown' || value === 'N/A') return;
    const list = dbData.components[category];
    const exists = list.some(c => (typeof c === 'string' ? c === value : c.name === value));
    if (!exists) {
      list.push(value);
      added++;
    }
  };

  dbData.moEntries.forEach(mo => {
    ensureComponent('batteries', mo.battery);
    ensureComponent('pcbas', mo.pcba);
    ensureComponent('coils', mo.coil);
    ensureComponent('shells', mo.shell);
  });

  if (added > 0) {
    fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2));
    console.log(`Fixed Component Lists: Added ${added} missing components.`);
  } else {
    console.log('All components are already registered.');
  }
}

fixComponentsList();

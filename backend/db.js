import { JSONFilePreset } from 'lowdb/node';
import { randomUUID } from 'crypto';

const defaultData = {
  users: [
    {
      id: '1',
      employeeId: process.env.ADMIN_ID || 'admin',
      password: process.env.ADMIN_PASSWORD || 'change-me-in-env',
      role: 'admin',
      fullName: 'System Admin',
      status: 'Active',
      createdAt: new Date().toISOString(),
      lastLogin: null
    },
    {
      id: '2',
      employeeId: process.env.USER_ID || 'user',
      password: process.env.USER_PASSWORD || 'change-me-in-env',
      role: 'user',
      fullName: 'Ajay Kumar',
      status: 'Active',
      createdAt: new Date().toISOString(),
      lastLogin: null
    }
  ],
  config: {
    fixedBattery: '24mah battery',
    fixedPCBA: 'Ring PCBA V1.60',
    autoMode: false,
    accessRules: []
  },
  moEntries: [],
  scrapEntries: [],
  returnEntries: [],
  trashEntries: [],
  auditLogs: [],
  rndProducts: [],
  rndEntries: [],
  components: {
    batteries: [
      { id: 'B-001', name: '24mah battery', status: 'Active', updatedAt: '2024-03-12' },
      { id: 'B-002', name: '32mah battery', status: 'Active', updatedAt: '2024-03-10' },
      { id: 'B-003', name: '39mah battery', status: 'Active', updatedAt: '2024-02-28' }
    ],
    pcbas: [
      { id: 'P-001', name: 'Ring PCBA V1.60', status: 'Active', updatedAt: '2024-03-12' },
      { id: 'P-002', name: 'Ring PCBA V1.61', status: 'Active', updatedAt: '2024-03-10' },
      { id: 'P-003', name: 'Ring PCBA V1.62', status: 'Active', updatedAt: '2024-02-28' },
      { id: 'P-004', name: 'Ring Pro 3.5 PCBA', status: 'Active', updatedAt: '2024-03-15' }
    ],
    coils: [
      { id: 'C-001', name: 'Ring RX Coil-05', status: 'Active' },
      { id: 'C-002', name: 'Ring RX Coil-06', status: 'Active' },
      { id: 'C-003', name: 'Ring RX Coil-07', status: 'Active' },
      { id: 'C-004', name: 'Ring RX Coil-08', status: 'Active' },
      { id: 'C-005', name: 'Ring RX Coil-09', status: 'Active' },
      { id: 'C-006', name: 'Ring RX Coil-10', status: 'Active' },
      { id: 'C-007', name: 'Ring RX Coil-11', status: 'Active' },
      { id: 'C-008', name: 'Ring RX Coil-12', status: 'Active' },
      { id: 'C-009', name: 'Ring RX Coil-13', status: 'Active' },
      { id: 'C-010', name: 'Ring RX Coil-14', status: 'Active' },
      { id: 'C-011', name: 'Rare Ring RX Coil-05', status: 'Active' },
      { id: 'C-012', name: 'Rare Ring RX Coil-06', status: 'Active' },
      { id: 'C-013', name: 'Rare Ring RX Coil-07', status: 'Active' },
      { id: 'C-014', name: 'Rare Ring RX Coil-08', status: 'Active' },
      { id: 'C-015', name: 'Rare Ring RX Coil-09', status: 'Active' },
      { id: 'C-016', name: 'Rare Ring RX Coil-10', status: 'Active' },
      { id: 'C-017', name: 'Rare Ring RX Coil-11', status: 'Active' },
      { id: 'C-018', name: 'Rare Ring RX Coil-12', status: 'Active' },
      { id: 'C-019', name: 'Rare Ring RX Coil-13', status: 'Active' },
      { id: 'C-020', name: 'Rare Ring RX Coil-14', status: 'Active' }
    ],
    lenses: [
      { id: 'L-001', name: 'PC LENS S05', status: 'Active', updatedAt: '2024-03-15' },
      { id: 'L-002', name: 'PC LENS S06', status: 'Active', updatedAt: '2024-03-15' },
      { id: 'L-003', name: 'PC LENS S07', status: 'Active', updatedAt: '2024-03-15' },
      { id: 'L-004', name: 'PC LENS S08', status: 'Active', updatedAt: '2024-03-15' },
      { id: 'L-005', name: 'PC LENS S09', status: 'Active', updatedAt: '2024-03-15' },
      { id: 'L-006', name: 'PC LENS S10', status: 'Active', updatedAt: '2024-03-15' },
      { id: 'L-007', name: 'PC LENS S11', status: 'Active', updatedAt: '2024-03-15' },
      { id: 'L-008', name: 'PC LENS S12', status: 'Active', updatedAt: '2024-03-15' },
      { id: 'L-009', name: 'PC LENS S13', status: 'Active', updatedAt: '2024-03-15' },
      { id: 'L-010', name: 'PC LENS S14', status: 'Active', updatedAt: '2024-03-15' }
    ],
    shells: [
      '0.2mm AA05', '0.2mm AA06', '0.2mm AA07', '0.2mm AA08', '0.2mm AA09', '0.2mm AA10',
      '0.2mm AA11', '0.2mm AA12', '0.2mm AA13', '0.2mm AA14',
      '0.2mm AG05', '0.2mm AG06', '0.2mm AG07', '0.2mm AG08', '0.2mm AG09', '0.2mm AG10',
      '0.2mm AG11', '0.2mm AG12', '0.2mm AG13', '0.2mm AG14',
      '0.2mm AS05', '0.2mm AS06', '0.2mm AS07', '0.2mm AS08', '0.2mm AS09', '0.2mm AS10',
      '0.2mm AS11', '0.2mm AS12', '0.2mm AS13', '0.2mm AS14',
      '0.2mm MG05', '0.2mm MG06', '0.2mm MG07', '0.2mm MG08', '0.2mm MG09', '0.2mm MG10',
      '0.2mm MG11', '0.2mm MG12', '0.2mm MG13', '0.2mm MG14',
      '0.2mm RT05', '0.2mm RT06', '0.2mm RT07', '0.2mm RT08', '0.2mm RT09', '0.2mm RT10',
      '0.2mm RT11', '0.2mm RT12', '0.2mm RT13', '0.2mm RT14',
      'Brushed Rose gold 0.2MM - SIZE 05', 'Brushed Rose gold 0.2MM - SIZE 06',
      'Brushed Rose gold 0.2MM - SIZE 07', 'Brushed Rose gold 0.2MM - SIZE 08',
      'Brushed Rose gold 0.2MM - SIZE 09', 'Brushed Rose gold 0.2MM - SIZE 10',
      'Brushed Rose gold 0.2MM - SIZE 11', 'Brushed Rose gold 0.2MM - SIZE 12',
      'Brushed Rose gold 0.2MM - SIZE 13', 'Brushed Rose gold 0.2MM - SIZE 14',
      'AA05', 'AA06', 'AA07', 'AA08', 'AA09', 'AA10', 'AA11', 'AA12', 'AA13', 'AA14',
      'AG05', 'AG06', 'AG07', 'AG08', 'AG09', 'AG10', 'AG11', 'AG12', 'AG13', 'AG14',
      'AS05', 'AS06', 'AS07', 'AS08', 'AS09', 'AS10', 'AS11', 'AS12', 'AS13', 'AS14',
      'MG05', 'MG06', 'MG07', 'MG08', 'MG09', 'MG10', 'MG11', 'MG12', 'MG13', 'MG14',
      'RT05', 'RT06', 'RT07', 'RT08', 'RT09', 'RT10', 'RT11', 'RT12', 'RT13', 'RT14',
      'Kapton Tape (Roll)',
      'RARE YELLOW GOLD SHELL LG05', 'RARE YELLOW GOLD SHELL LG06', 'RARE YELLOW GOLD SHELL LG07',
      'RARE YELLOW GOLD SHELL LG08', 'RARE YELLOW GOLD SHELL LG09', 'RARE YELLOW GOLD SHELL LG10',
      'RARE YELLOW GOLD SHELL LG11', 'RARE YELLOW GOLD SHELL LG12', 'RARE YELLOW GOLD SHELL LG13',
      'RARE YELLOW GOLD SHELL LG14',
      'RARE ROSE GOLD SHELL RS05', 'RARE ROSE GOLD SHELL RS06', 'RARE ROSE GOLD SHELL RS07',
      'RARE ROSE GOLD SHELL RS08', 'RARE ROSE GOLD SHELL RS09', 'RARE ROSE GOLD SHELL RS10',
      'RARE ROSE GOLD SHELL RS11', 'RARE ROSE GOLD SHELL RS12', 'RARE ROSE GOLD SHELL RS13',
      'RARE ROSE GOLD SHELL RS14',
      'RARE PLATINUM SHELL S05', 'RARE PLATINUM SHELL S06', 'RARE PLATINUM SHELL S07',
      'RARE PLATINUM SHELL S08', 'RARE PLATINUM SHELL S09', 'RARE PLATINUM SHELL S10',
      'RARE PLATINUM SHELL S11', 'RARE PLATINUM SHELL S12', 'RARE PLATINUM SHELL S13',
      'RARE PLATINUM SHELL S14',
      'Shell S05', 'Shell S06', 'Shell S07', 'Shell S08', 'Shell S09', 'Shell S10',
      'Shell S11', 'Shell S12', 'Shell S13', 'Shell S14',
      'DIESEL BLACK SHELL S05', 'DIESEL BLACK SHELL S06', 'DIESEL BLACK SHELL S07',
      'DIESEL BLACK SHELL S08', 'DIESEL BLACK SHELL S09', 'DIESEL BLACK SHELL S10',
      'DIESEL BLACK SHELL S11', 'DIESEL BLACK SHELL S12', 'DIESEL BLACK SHELL S13',
      'DIESEL BLACK SHELL S14',
      'DIESEL SILVER SHELL S05', 'DIESEL SILVER SHELL S06', 'DIESEL SILVER SHELL S07',
      'DIESEL SILVER SHELL S08', 'DIESEL SILVER SHELL S09', 'DIESEL SILVER SHELL S10',
      'DIESEL SILVER SHELL S11', 'DIESEL SILVER SHELL S12', 'DIESEL SILVER SHELL S13',
      'DIESEL SILVER SHELL S14'
    ]
  }
};

const db = await JSONFilePreset('./data/db.json', defaultData);

// Ensure backward compatibility for existing db.json files that are missing newer fields
let needsWrite = false;
for (const key of Object.keys(defaultData)) {
  if (db.data[key] === undefined) {
    db.data[key] = defaultData[key];
    needsWrite = true;
  }
}
if (needsWrite) {
  await db.write();
}

export { randomUUID };
export default db;

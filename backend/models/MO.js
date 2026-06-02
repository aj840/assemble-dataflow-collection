import mongoose from 'mongoose';

const MOEntrySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  moNumber: { type: String, default: '' },
  sku: { type: String, required: true },
  qty: { type: Number, required: true },
  od: { type: String, default: '' },
  refer: { type: String, default: 'o' },
  
  batteryQty: { type: Number, default: 0 },
  pcbaQty: { type: Number, default: 0 },
  coilQty: { type: Number, default: 0 },
  shellQty: { type: Number, default: 0 },
  lensQty: { type: Number, default: 0 },
  
  batteryComp: { type: Number, default: 0 },
  pcbaComp: { type: Number, default: 0 },
  coilComp: { type: Number, default: 0 },
  shellComp: { type: Number, default: 0 },
  lensComp: { type: Number, default: 0 },
  
  battery: { type: String, default: '' },
  pcba: { type: String, default: '' },
  coil: { type: String, default: '' },
  shell: { type: String, default: '' },
  lens: { type: String, default: 'N/A' },
  
  isProRing: { type: Boolean, default: false },
  status: { type: String, default: 'Pending' },
  completedQty: { type: Number, default: 0 },
  
  createdAt: { type: String },
  completedAt: { type: String },
  submittedBy: { type: String },
  date: { type: String },
  planDate: { type: String, default: '' }
}, { timestamps: false });

export const MOEntry = mongoose.model('MOEntry', MOEntrySchema);

import mongoose from 'mongoose';

const BaseEntrySchema = {
  id: { type: String, required: true, unique: true },
  moId: { type: String, required: true },
  moNumber: { type: String, required: true },
  sku: { type: String, required: true },
  component: { type: String, required: true },
  submittedBy: { type: String, required: true },
  submittedAt: { type: String, required: true }
};

export const ScrapEntry = mongoose.model('ScrapEntry', new mongoose.Schema({
  ...BaseEntrySchema,
  receive: { type: Number, default: 0 },
  reject: { type: Number, default: 0 }
}));

export const ReworkEntry = mongoose.model('ReworkEntry', new mongoose.Schema({
  ...BaseEntrySchema,
  qty: { type: Number, default: 0 },
  targetComponent: { type: String, default: '' },
  description: { type: String, default: '' }
}));

// Returns uses different keys sometimes
export const ReturnEntry = mongoose.model('ReturnEntry', new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  moId: { type: String, required: true },
  moNumber: { type: String, required: true },
  sku: { type: String, required: true },
  component: { type: String, required: true },
  qty: { type: Number, default: 0 },
  returnedBy: { type: String, required: true },
  returnedAt: { type: String, required: true },
  status: { type: String, default: 'Pending' }
}));

// Audit logs
export const AuditLog = mongoose.model('AuditLog', new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  action: { type: String, required: true },
  details: { type: String },
  user: { type: String },
  timestamp: { type: String, required: true }
}));

// Trash
export const TrashEntry = mongoose.model('TrashEntry', new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  originalId: { type: String },
  type: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed },
  deletedAt: { type: String, required: true }
}));

// R&D
export const RndProduct = mongoose.model('RndProduct', new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  status: { type: String, default: 'Active' },
  createdAt: { type: String }
}));

export const RndEntry = mongoose.model('RndEntry', new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  productId: { type: String },
  productName: { type: String },
  component: { type: String },
  inQty: { type: Number, default: 0 },
  outQty: { type: Number, default: 0 },
  scrapQty: { type: Number, default: 0 },
  date: { type: String },
  description: { type: String }
}));

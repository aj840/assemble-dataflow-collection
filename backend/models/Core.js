import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true, enum: ['admin', 'user'] },
  fullName: { type: String, required: true },
  status: { type: String, default: 'Active' },
  createdAt: { type: String },
  lastLogin: { type: String, default: null }
});

const ConfigSchema = new mongoose.Schema({
  fixedBattery: { type: String, default: '' },
  fixedPCBA: { type: String, default: '' },
  autoMode: { type: Boolean, default: false },
  accessRules: [{ type: String }]
});

// Since the JSON DB has a single config object, we'll ensure we only ever use one document.

const ComponentSchema = new mongoose.Schema({
  category: { type: String, required: true, enum: ['batteries', 'pcbas', 'coils', 'lenses', 'shells'] },
  // 'shells' in lowdb were just an array of strings, but for batteries/pcbas they were objects (id, name, status, updatedAt).
  // We'll normalize this. If it's a shell, status/updatedAt can be absent or defaulted.
  name: { type: String, required: true },
  status: { type: String, default: 'Active' },
  updatedAt: { type: String }
});

// In lowdb, ID generation used crypto.randomUUID(). For mongo, we'll keep the previous IDs in an `oldId` field or just map them to `_id` where applicable, or continue using a string `id` field.
// To make migration easier, we will add a string `id` to all schemas because the frontend expects `m.id`.
UserSchema.add({ id: { type: String, unique: true } });
ComponentSchema.add({ id: { type: String } });

export const User = mongoose.model('User', UserSchema);
export const Config = mongoose.model('Config', ConfigSchema);
export const Component = mongoose.model('Component', ComponentSchema);

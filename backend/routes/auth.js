import { randomUUID } from '../db.js';
import { User } from '../models/Core.js';
import { AuditLog } from '../models/Entries.js';

// POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { employeeId, password } = req.body;
    if (!employeeId || !password) return res.status(400).json({ message: 'Employee ID and password required' });

    const user = await User.findOne({ employeeId: new RegExp(`^${employeeId}$`, 'i'), password });
    if (!user) {
      console.warn(`[Auth] Failed login attempt for ID: ${employeeId}`);
      return res.status(401).json({ message: 'Invalid credentials. Please check your ID and password.' });
    }

    user.lastLogin = new Date().toISOString();
    await user.save();

    await AuditLog.create({ id: randomUUID(), action: `${user.fullName} logged in`, user: user.fullName, timestamp: new Date().toISOString() });

    res.json({ success: true, user: { id: user.id, employeeId: user.employeeId, role: user.role, fullName: user.fullName } });
  } catch (err) {
    console.error('[Auth] Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

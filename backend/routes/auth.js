import db, { randomUUID } from '../db.js';

// POST /api/auth/login
export const login = async (req, res) => {
  const { employeeId, password } = req.body;
  if (!employeeId || !password) return res.status(400).json({ message: 'Employee ID and password required' });

  const user = db.data.users.find(u => 
    u.employeeId.toLowerCase() === employeeId.toLowerCase() && 
    u.password === password
  );
  
  if (!user) {
    console.warn(`[Auth] Failed login attempt for ID: ${employeeId}`);
    return res.status(401).json({ message: 'Invalid credentials. Please check your ID and password.' });
  }

  // Update last login
  user.lastLogin = new Date().toISOString();
  await db.write();

  // Add audit log
  db.data.auditLogs.unshift({ id: randomUUID(), action: `${user.fullName} logged in`, user: user.fullName, time: new Date().toISOString() });
  await db.write();

  res.json({ success: true, user: { id: user.id, employeeId: user.employeeId, role: user.role, fullName: user.fullName } });
};

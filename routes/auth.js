import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { authenticate, attachUser, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Forcibly synchronize admin credentials from .env to the database on server startup
setTimeout(async () => {
  try {
    const adminEmail = (process.env.ADMIN_EMAIL || 'ranjith.kumardevendhiran@tvs.in').toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || 'Ranj@199826';
    
    const admin = await User.findOne({ email: adminEmail, role: 'admin' });
    if (admin) {
      admin.name = 'Ranjith';
      admin.password = adminPassword; // Triggers the pre-save password hashing hook
      await admin.save();
      console.log(`[Database] Admin password successfully synchronized for: ${adminEmail}`);
    }
  } catch (err) {
    console.error('[Database] Failed to sync admin password:', err.message);
  }
}, 2000); // 2 second delay to ensure DB connection is ready

function createToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ message: 'Email, password, and role are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim(), role });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials for selected role' });
    }

    const token = createToken(user);
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/register-user', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: 'user',
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/me', authenticate, attachUser, (req, res) => {
  res.json({ user: req.currentUser });
});

export default router;

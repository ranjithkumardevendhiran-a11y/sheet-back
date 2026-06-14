import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    next();
  };
}

export async function attachUser(req, res, next) {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    req.currentUser = user;
    next();
  } catch {
    return res.status(500).json({ message: 'Failed to load user' });
  }
}

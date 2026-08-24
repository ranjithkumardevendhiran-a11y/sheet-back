import express from 'express';
import { authenticate, requireRole, attachUser } from '../middleware/auth.js';
import Update from '../models/Update.js';

const router = express.Router();

router.get('/latest', authenticate, async (_req, res) => {
  try {
    const latestUpdate = await Update.findOne()
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email');
    res.json(latestUpdate ? { update: latestUpdate } : { update: null });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch latest update' });
  }
});

router.post('/', authenticate, attachUser, requireRole('admin'), async (req, res) => {
  try {
    const content = req.body.content?.trim();
    if (!content) {
      return res.status(400).json({ message: 'Update content is required' });
    }

    const newUpdate = await Update.create({ content, createdBy: req.currentUser._id });
    await newUpdate.populate('createdBy', 'name email');
    res.status(201).json({ message: 'Update posted successfully', update: newUpdate });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create update' });
  }
});

export default router;

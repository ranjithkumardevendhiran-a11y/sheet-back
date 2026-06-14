import express from 'express';
import multer from 'multer';
import Sheet from '../models/Sheet.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { parseWorkbookBuffer } from '../utils/parseSheet.js';
import { fetchGoogleSheetData } from '../utils/googleSheets.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(csv|xls|xlsx)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV or Excel files are allowed'));
    }
  },
});

const buildSheetKeywords = (title, tab, headers, rows) => {
  const tokens = new Set();
  const addText = (value) => {
    const text = String(value ?? '').trim().toLowerCase();
    if (!text) return;
    text.split(/[^a-z0-9]+/i).forEach((token) => {
      const normalized = token.trim();
      if (normalized) tokens.add(normalized);
    });
  };

  addText(title);
  addText(tab);
  (headers || []).forEach(addText);
  (rows || []).forEach((row) => {
    (row || []).forEach((cell) => addText(cell));
  });

  return Array.from(tokens);
};

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { search, tab } = req.query;
    const filter = {};

    if (tab && tab !== 'All') {
      filter.tab = tab;
    }

    if (search?.trim()) {
      const keyword = search.trim();
      const tokens = keyword
        .toLowerCase()
        .split(/\s+/)
        .map((token) => token.trim())
        .filter(Boolean);

      filter.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { tab: { $regex: keyword, $options: 'i' } },
        { keywords: { $in: tokens } },
      ];
    }

    const sheets = await Sheet.find(filter)
      .select('title tab sourceType createdAt updatedAt uploadedBy')
      .populate('uploadedBy', 'name email')
      .sort({ updatedAt: -1 });

    res.json(sheets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const sheet = await Sheet.findById(req.params.id).populate('uploadedBy', 'name email');
    if (!sheet) {
      return res.status(404).json({ message: 'Sheet not found' });
    }
    res.json(sheet);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post(
  '/upload',
  requireRole('admin'),
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Please upload a CSV or Excel file' });
      }

      const title = req.body.title?.trim() || req.file.originalname;
      const tab = req.body.tab?.trim() || 'General';
      const { headers, rows } = parseWorkbookBuffer(req.file.buffer);
      const keywords = buildSheetKeywords(title, tab, headers, rows);

      const sheet = await Sheet.create({
        title,
        tab,
        sourceType: 'upload',
        headers,
        rows,
        keywords,
        uploadedBy: req.user.id,
      });

      res.status(201).json(sheet);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

router.post('/import-google', requireRole('admin'), async (req, res) => {
  try {
    const { title, googleSheetUrl } = req.body;
    if (!googleSheetUrl) {
      return res.status(400).json({ message: 'Google Sheet URL is required' });
    }

    const { sheetId, headers, rows } = await fetchGoogleSheetData(googleSheetUrl);

    const tab = req.body.tab?.trim() || 'General';
    const titleText = title?.trim() || 'Imported Google Sheet';
    const keywords = buildSheetKeywords(titleText, tab, headers, rows);

    const sheet = await Sheet.create({
      title: titleText,
      tab,
      sourceType: 'google',
      googleSheetId: sheetId,
      googleSheetUrl,
      headers,
      rows,
      keywords,
      uploadedBy: req.user.id,
    });

    res.status(201).json(sheet);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put('/:id', requireRole('admin'), async (req, res) => {
  try {
    const { title, headers, rows, tab } = req.body;
    const sheet = await Sheet.findById(req.params.id);

    if (!sheet) {
      return res.status(404).json({ message: 'Sheet not found' });
    }

    if (title !== undefined) sheet.title = title;
    if (tab !== undefined) sheet.tab = tab?.trim() || 'General';
    if (headers !== undefined) sheet.headers = headers;
    if (rows !== undefined) sheet.rows = rows;

    sheet.keywords = buildSheetKeywords(sheet.title, sheet.tab, sheet.headers, sheet.rows);
    await sheet.save();
    res.json(sheet);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const sheet = await Sheet.findByIdAndDelete(req.params.id);
    if (!sheet) {
      return res.status(404).json({ message: 'Sheet not found' });
    }
    res.json({ message: 'Sheet deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

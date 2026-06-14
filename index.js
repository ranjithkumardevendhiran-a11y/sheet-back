import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import User from './models/User.js';
import authRoutes from './routes/auth.js';
import sheetRoutes from './routes/sheets.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLIENT_BUILD_PATH = path.join(__dirname, '../client/dist');

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'ranjith.kumardevendhiran@tvs.in';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123';

app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '10mb' }));

if (process.env.SERVE_CLIENT === 'true') {
  app.use(express.static(CLIENT_BUILD_PATH));
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/sheets', sheetRoutes);

if (process.env.SERVE_CLIENT === 'true') {
  app.get('*', (req, res) => {
    if (req.originalUrl.startsWith('/api')) {
      return res.status(404).json({ message: 'API route not found' });
    }

    res.sendFile(path.join(CLIENT_BUILD_PATH, 'index.html'));
  });
}

app.use((err, _req, res, _next) => {
  res.status(400).json({ message: err.message || 'Something went wrong' });
});

async function ensureDefaultAdmin() {
  const existing = await User.findOne({ email: ADMIN_EMAIL });
  if (!existing) {
    await User.create({
      name: 'Admin',
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      role: 'admin',
    });
    console.log(`Default admin created: ${ADMIN_EMAIL}`);
  }
}

async function start() {
  await connectDB();
  await ensureDefaultAdmin();

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

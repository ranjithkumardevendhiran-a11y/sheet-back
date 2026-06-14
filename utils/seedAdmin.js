import dotenv from 'dotenv';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';

dotenv.config();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'ranjith.kumardevendhiran@tvs.in';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123';

async function seedAdmin() {
  await connectDB();

  const existing = await User.findOne({ email: ADMIN_EMAIL });
  if (existing) {
    console.log(`Admin already exists: ${ADMIN_EMAIL}`);
    process.exit(0);
  }

  await User.create({
    name: 'Admin',
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    role: 'admin',
  });

  console.log(`Admin created: ${ADMIN_EMAIL}`);
  console.log(`Default password: ${ADMIN_PASSWORD}`);
  process.exit(0);
}

seedAdmin().catch((error) => {
  console.error(error);
  process.exit(1);
});

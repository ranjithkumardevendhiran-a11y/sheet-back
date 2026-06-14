import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let memoryServer;

export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb+srv://ranjith:ranjit124@cluster0.t4opo0l.mongodb.net/sheets-manager?retryWrites=true&w=majority';

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
    console.log('MongoDB connected');
    return;
  } catch (error) {
    console.log('MongoDB Atlas unavailable, starting in-memory database...');
  }

  memoryServer = await MongoMemoryServer.create();
  await mongoose.connect(memoryServer.getUri());
  console.log('In-memory MongoDB connected');
}

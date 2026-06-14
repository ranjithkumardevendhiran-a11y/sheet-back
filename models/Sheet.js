import mongoose from 'mongoose';

const sheetSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    tab: { type: String, trim: true, default: 'General' },
    sourceType: { type: String, enum: ['upload', 'google'], default: 'upload' },
    googleSheetId: { type: String, default: null },
    googleSheetUrl: { type: String, default: null },
    headers: [{ type: String }],
    rows: [[mongoose.Schema.Types.Mixed]],
    keywords: [{ type: String }],
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export default mongoose.model('Sheet', sheetSchema);

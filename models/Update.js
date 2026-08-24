import mongoose from 'mongoose'; 
const updateSchema = new mongoose.Schema({ 
  content: { type: String, required: true, trim: true }, 
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, 
  createdAt: { type: Date, default: Date.now } 
}); 
const Update = mongoose.model('Update', updateSchema); 
export default Update; 

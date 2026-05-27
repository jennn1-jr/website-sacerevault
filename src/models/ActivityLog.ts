import mongoose from 'mongoose';

const ActivityLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true },
  resourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
  ipAddress: { type: String },
  userAgent: { type: String },
  details: { type: String },
  status: { type: String, required: true }
}, { timestamps: true });

export const ActivityLog = mongoose.models.ActivityLog || mongoose.model('ActivityLog', ActivityLogSchema);

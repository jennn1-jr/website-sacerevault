import mongoose from 'mongoose';

const SessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', required: true },
  token: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  ipAddress: { type: String },
  userAgent: { type: String }
}, { timestamps: true });

export const Session = mongoose.models.Session || mongoose.model('Session', SessionSchema);

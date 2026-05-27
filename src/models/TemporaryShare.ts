import mongoose from 'mongoose';

const TemporaryShareSchema = new mongoose.Schema({
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true, unique: true },
  encryptedFileKey: { type: String, required: true },
  mimeType: { type: String, required: true },
  originalName: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  maxAccess: { type: Number, required: true },
  accessCount: { type: Number, default: 0 },
  status: { type: String, enum: ['ACTIVE', 'EXPIRED', 'REVOKED'], default: 'ACTIVE' }
}, { timestamps: true });

export const TemporaryShare = mongoose.models.TemporaryShare || mongoose.model('TemporaryShare', TemporaryShareSchema);

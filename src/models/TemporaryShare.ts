import mongoose from 'mongoose';

const TemporaryShareSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mimeType: { type: String, required: true },
  originalName: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  maxAccess: { type: Number, required: true },
  accessCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  encryptedAesKey: { type: String, required: true },
  iv: { type: String, required: true },
  authTag: { type: String, required: true },
  passcodeHash: { type: String, default: null }
}, { timestamps: true });

export const TemporaryShare = mongoose.models.TemporaryShare || mongoose.model('TemporaryShare', TemporaryShareSchema);

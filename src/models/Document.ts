import mongoose from 'mongoose';

const DocumentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  originalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  storagePath: { type: String, required: true },
  fileHash: { type: String, required: true },
  signature: { type: String, required: true },
  type: { type: String, enum: ['FILE', 'NOTE'], default: 'FILE' },
  folderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
  status: { type: String, enum: ['ACTIVE', 'DELETED'], default: 'ACTIVE' },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

export const Document = mongoose.models.Document || mongoose.model('Document', DocumentSchema);

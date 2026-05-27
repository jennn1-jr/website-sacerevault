import mongoose from 'mongoose';

const SharedAccessSchema = new mongoose.Schema({
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  encryptedFileKey: { type: String, required: true },
  grantedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

export const SharedAccess = mongoose.models.SharedAccess || mongoose.model('SharedAccess', SharedAccessSchema);

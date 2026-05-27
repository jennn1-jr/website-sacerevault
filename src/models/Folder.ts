import mongoose from 'mongoose';

const FolderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null }
}, { timestamps: true });

export const Folder = mongoose.models.Folder || mongoose.model('Folder', FolderSchema);
export default Folder;

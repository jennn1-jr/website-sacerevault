import mongoose from 'mongoose';

const DeviceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  deviceName: { type: String, required: true },
  deviceId: { type: String, required: true, unique: true },
  publicKey: { type: String, required: true },
  lastSeen: { type: Date, default: Date.now }
}, { timestamps: true });

export const Device = mongoose.models.Device || mongoose.model('Device', DeviceSchema);

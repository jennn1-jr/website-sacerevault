import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  passwordHash: { type: String },
  publicKey: { type: String },
  encryptedPrivKey: { type: String },
  twoFactorSecret: { type: String },
  isTwoFactorEnabled: { type: Boolean, default: false },
  role: { type: String, enum: ['USER', 'ADMIN'], default: 'USER' }
}, { timestamps: true });

export const User = mongoose.models.User || mongoose.model('User', UserSchema);
export default User;
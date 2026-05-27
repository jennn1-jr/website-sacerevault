import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  actionUrl: { type: String },
  data: { type: String }
}, { timestamps: true });

export const Notification = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);

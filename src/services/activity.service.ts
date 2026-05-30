import crypto from 'crypto';
import { ActivityLog } from '../models/ActivityLog';
import { connectDB } from '../lib/mongoose';

interface ActivityLogPayload {
  userId?: any;
  action: string;
  resourceId?: any;
  ipAddress?: string;
  userAgent?: string;
  details?: string;
  status: string;
}

export class ActivityService {
  /**
   * Logs an activity using a Hash-Chain to ensure tamper-evident records.
   * The new log's hash is calculated using the previous log's hash + current log data.
   */
  static async logActivity(payload: ActivityLogPayload) {
    await connectDB();

    // 1. Get the most recent log to get its hash
    const lastLog = await ActivityLog.findOne().sort({ createdAt: -1 });
    const previousHash = lastLog ? lastLog.currentHash : null;

    // 2. Prepare data string for hashing
    const timestamp = new Date().toISOString();
    const dataString = JSON.stringify({
      ...payload,
      previousHash,
      timestamp
    });

    // 3. Calculate SHA-256 Hash
    const currentHash = crypto.createHash('sha256').update(dataString).digest('hex');

    // 4. Save to Database
    const log = await ActivityLog.create({
      ...payload,
      previousHash,
      currentHash
    });

    return log;
  }
}

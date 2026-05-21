import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const STORE_PATH = path.join(process.cwd(), 'storage', 'webrtc-sessions.json');
const SESSION_TTL_MINUTES = 30;

export interface WebRtcSignal {
  id: string;
  from: string;
  payload: unknown;
  delivered: boolean;
  createdAt: string;
}

export interface WebRtcSession {
  sessionId: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  isActive: boolean;
  signals: WebRtcSignal[];
}

async function ensureStoreFile() {
  const dir = path.dirname(STORE_PATH);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(STORE_PATH);
  } catch {
    await fs.writeFile(STORE_PATH, JSON.stringify([]), 'utf8');
  }
}

async function readStore(): Promise<WebRtcSession[]> {
  await ensureStoreFile();
  const file = await fs.readFile(STORE_PATH, 'utf8');
  try {
    return JSON.parse(file) as WebRtcSession[];
  } catch {
    return [];
  }
}

async function writeStore(sessions: WebRtcSession[]) {
  await ensureStoreFile();
  await fs.writeFile(STORE_PATH, JSON.stringify(sessions, null, 2), 'utf8');
}

async function cleanupExpiredSessions() {
  const sessions = await readStore();
  const now = new Date();
  const activeSessions = sessions.filter((session) => new Date(session.expiresAt) > now && session.isActive);
  if (activeSessions.length !== sessions.length) {
    await writeStore(activeSessions);
  }
  return activeSessions;
}

export async function createWebRtcSession(createdBy: string) {
  await cleanupExpiredSessions();
  const sessionId = crypto.randomBytes(12).toString('hex');
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MINUTES * 60 * 1000).toISOString();
  const session: WebRtcSession = {
    sessionId,
    createdBy,
    createdAt,
    expiresAt,
    isActive: true,
    signals: [],
  };
  const sessions = await readStore();
  sessions.push(session);
  await writeStore(sessions);
  return session;
}

export async function getWebRtcSession(sessionId: string) {
  await cleanupExpiredSessions();
  const sessions = await readStore();
  return sessions.find((session) => session.sessionId === sessionId && session.isActive) ?? null;
}

export async function addWebRtcSignal(sessionId: string, from: string, payload: unknown) {
  const sessions = await readStore();
  const session = sessions.find((item) => item.sessionId === sessionId && item.isActive);
  if (!session) {
    return null;
  }
  const signal: WebRtcSignal = {
    id: crypto.randomUUID(),
    from,
    payload,
    delivered: false,
    createdAt: new Date().toISOString(),
  };
  session.signals.push(signal);
  await writeStore(sessions);
  return signal;
}

export async function getPendingSignals(sessionId: string, clientId: string) {
  const sessions = await readStore();
  const session = sessions.find((item) => item.sessionId === sessionId && item.isActive);
  if (!session) {
    return null;
  }

  const pending = session.signals.filter((signal) => signal.from !== clientId && !signal.delivered);
  pending.forEach((signal) => {
    signal.delivered = true;
  });
  await writeStore(sessions);
  return pending;
}

export async function deactivateWebRtcSession(sessionId: string) {
  const sessions = await readStore();
  const session = sessions.find((item) => item.sessionId === sessionId);
  if (!session) return false;
  session.isActive = false;
  await writeStore(sessions);
  return true;
}

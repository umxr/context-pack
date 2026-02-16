import type { User, Session } from "./types";

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

const sessions = new Map<string, Session>();

export function createSession(user: User): Session {
  const session: Session = {
    id: generateSessionId(),
    userId: user.id,
    expiresAt: new Date(Date.now() + SESSION_TIMEOUT_MS),
    createdAt: new Date(),
  };
  sessions.set(session.id, session);
  return session;
}

export function getSession(sessionId: string): Session | null {
  const session = sessions.get(sessionId);
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    sessions.delete(sessionId);
    return null;
  }
  return session;
}

function generateSessionId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

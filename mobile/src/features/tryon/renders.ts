import { useSyncExternalStore } from 'react';

// Try-on renders for one session (person photo + garment photo + body + chart), in memory only.
// The anchor (recommended size) is rendered from the person photo; every other size is edited from the anchor.
export type SizeRender = { status: 'loading' | 'done' | 'error' | 'too_small'; image?: string; error?: string };
export type Session = { anchorSize?: string; anchorImage?: string; garmentImage?: string; engine?: string; sizes: Record<string, SizeRender> };

const sessions = new Map<string, Session>();
const listeners = new Set<() => void>();
let version = 0;
const MAX_SESSIONS = 2;

function emit() { version++; listeners.forEach(listener => listener()); }
function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }

export function getSession(key: string): Session {
  let session = sessions.get(key);
  if (!session) {
    session = { sizes: {} };
    sessions.set(key, session);
    // Generated images are large; keep only the most recent sessions.
    while (sessions.size > MAX_SESSIONS) sessions.delete(sessions.keys().next().value!);
  }
  return session;
}

export function updateSession(key: string, change: Partial<Session>) { Object.assign(getSession(key), change); emit(); }
export function setSizeRender(key: string, size: string, value: SizeRender) { getSession(key).sizes[size] = value; emit(); }
export function resetSession(key: string) { sessions.delete(key); emit(); }

export function useSession(key: string): Session {
  useSyncExternalStore(subscribe, () => version);
  return sessions.get(key) ?? { sizes: {} };
}

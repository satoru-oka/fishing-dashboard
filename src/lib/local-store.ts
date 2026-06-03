import type { Catch } from '../types';

const STORAGE_KEY = 'fishing-dashboard:user-catches:v1';

interface SerializedCatch extends Omit<Catch, 'caught_at'> {
  caught_at: string;
}

function safeStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadUserCatches(): Catch[] {
  const ls = safeStorage();
  if (!ls) return [];
  const raw = ls.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as SerializedCatch[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((r) => ({ ...r, caught_at: new Date(r.caught_at) }))
      .filter((r) => !Number.isNaN(r.caught_at.getTime()));
  } catch {
    return [];
  }
}

export function saveUserCatches(rows: Catch[]): void {
  const ls = safeStorage();
  if (!ls) return;
  const serialized: SerializedCatch[] = rows.map((r) => ({
    ...r,
    caught_at: r.caught_at.toISOString(),
  }));
  try {
    ls.setItem(STORAGE_KEY, JSON.stringify(serialized));
  } catch {
    // Storage quota or disabled — silently drop. UI surfaces user-data only.
  }
}

export function clearUserCatches(): void {
  const ls = safeStorage();
  if (!ls) return;
  ls.removeItem(STORAGE_KEY);
}

const DRAFT_KEY = 'fishing-dashboard:catch-draft:v1';

export function loadDraft<T>(): T | null {
  const ls = safeStorage();
  if (!ls) return null;
  const raw = ls.getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function saveDraft<T>(value: T): void {
  const ls = safeStorage();
  if (!ls) return;
  try {
    ls.setItem(DRAFT_KEY, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export function clearDraft(): void {
  const ls = safeStorage();
  if (!ls) return;
  ls.removeItem(DRAFT_KEY);
}

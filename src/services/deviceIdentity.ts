import { ensureClientStorageReset } from './firestoreService.ts';

ensureClientStorageReset();

const STUDIO_ENTERED_KEY = 'aitimes_studio_entered';
const SUBMITTED_RECEIPTS_KEY = 'aitimes_submitted_receipts';

export interface SubmittedReceipt {
  id: string;
  accessToken: string;
  title: string;
  customerEmail: string;
  createdAt: string;
}

export function getAuthHeaders(extra?: Record<string, string>): Record<string, string> {
  return { ...(extra || {}) };
}

export function hasEnteredStudio(): boolean {
  try {
    return sessionStorage.getItem(STUDIO_ENTERED_KEY) === 'true' || localStorage.getItem(STUDIO_ENTERED_KEY) === 'true';
  } catch {
    return false;
  }
}

export function enterStudio(): void {
  try {
    sessionStorage.setItem(STUDIO_ENTERED_KEY, 'true');
    localStorage.setItem(STUDIO_ENTERED_KEY, 'true');
  } catch {}
}

export function exitToWelcome(): void {
  try {
    sessionStorage.removeItem(STUDIO_ENTERED_KEY);
    localStorage.removeItem(STUDIO_ENTERED_KEY);
  } catch {}
}

export function saveSubmittedReceipt(receipt: SubmittedReceipt): void {
  try {
    const existing = getSubmittedReceipts();
    const filtered = existing.filter((r) => r.id !== receipt.id);
    const updated = [receipt, ...filtered].slice(0, 20);
    localStorage.setItem(SUBMITTED_RECEIPTS_KEY, JSON.stringify(updated));
  } catch {}
}

export function getSubmittedReceipts(): SubmittedReceipt[] {
  try {
    const raw = localStorage.getItem(SUBMITTED_RECEIPTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

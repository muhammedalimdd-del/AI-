import { safeFetchJson } from './apiClient.ts';
import { ensureClientStorageReset } from './firestoreService.ts';
import { UserAccount } from '../types/client.ts';

ensureClientStorageReset();

export const SESSION_TOKEN_KEY = 'aitimes_session_token';
export const CACHED_USER_KEY = 'aitimes_cached_user';

export function getSessionToken(): string {
  try {
    return localStorage.getItem(SESSION_TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function getAuthHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getSessionToken();
  const headers: Record<string, string> = { ...(extra || {}) };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['x-session-token'] = token;
  }
  return headers;
}

/**
 * First-Time Customer Account Registration (Backend DB)
 */
export async function registerCustomerAccount(params: {
  username: string;
  password: string;
  confirmPassword: string;
  email?: string;
}): Promise<{ user: UserAccount; token: string; recoveryKey?: string }> {
  const username = (params.username || '').trim();
  const password = params.password || '';
  const confirmPassword = params.confirmPassword || '';
  const email = (params.email || '').trim().toLowerCase();

  if (!username || username.length < 2) {
    throw new Error('Please enter a name or username (at least 2 characters).');
  }
  if (!/^[a-zA-Z0-9_.\- ]+$/.test(username)) {
    throw new Error('Username may only contain letters, numbers, spaces, underscores, dots, and hyphens.');
  }
  if (email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      throw new Error('Please enter a valid recovery email address.');
    }
  }
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }
  if (password !== confirmPassword) {
    throw new Error('Passwords do not match. Please verify and try again.');
  }

  const result = await safeFetchJson<{
    success?: boolean;
    user?: UserAccount;
    token?: string;
    recoveryKey?: string;
    error?: string;
  }>('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      password,
      confirmPassword,
      email: email || undefined
    })
  });

  if (!result.ok || !result.data?.user || !result.data?.token) {
    throw new Error(result.data?.error || result.error || 'Failed to create account. Please try again.');
  }

  try {
    localStorage.setItem(SESSION_TOKEN_KEY, result.data.token);
    localStorage.setItem(CACHED_USER_KEY, JSON.stringify(result.data.user));
  } catch {}

  return {
    user: result.data.user,
    token: result.data.token,
    recoveryKey: result.data.recoveryKey
  };
}

/**
 * Returning Customer Login (Username + Password only; never auto-creates accounts)
 */
export async function loginCustomerAccount(params: {
  username: string;
  password: string;
}): Promise<{ user: UserAccount; token: string }> {
  const username = (params.username || '').trim();
  const password = params.password || '';

  if (!username || !password) {
    throw new Error('Incorrect username or password. Please try again.');
  }

  const result = await safeFetchJson<{
    success?: boolean;
    user?: UserAccount;
    token?: string;
    error?: string;
  }>('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  if (!result.ok || !result.data?.token || !result.data?.user) {
    throw new Error(result.data?.error || 'Incorrect username or password. Please try again.');
  }

  try {
    localStorage.setItem(SESSION_TOKEN_KEY, result.data.token);
    localStorage.setItem(CACHED_USER_KEY, JSON.stringify(result.data.user));
  } catch {}

  return {
    user: result.data.user,
    token: result.data.token
  };
}

/**
 * Request Password Reset (Step 1)
 */
export async function requestPasswordReset(params: {
  username: string;
  email?: string;
}): Promise<{ method: 'email_or_key' | 'recovery_key'; message: string }> {
  const result = await safeFetchJson<{
    success?: boolean;
    method?: 'email_or_key' | 'recovery_key';
    message?: string;
    error?: string;
  }>('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });

  if (!result.ok || !result.data?.success) {
    throw new Error(result.data?.error || result.error || 'Could not start password reset.');
  }

  return {
    method: result.data.method || 'recovery_key',
    message: result.data.message || 'Enter your recovery code or Recovery Key to reset your password.'
  };
}

/**
 * Complete Password Reset (Step 2)
 */
export async function completePasswordReset(params: {
  username: string;
  resetCodeOrKey: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<string> {
  const result = await safeFetchJson<{
    success?: boolean;
    message?: string;
    error?: string;
  }>('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });

  if (!result.ok || !result.data?.success) {
    throw new Error(result.data?.error || result.error || 'Password reset failed.');
  }

  return result.data.message || 'Password updated successfully.';
}

/**
 * Restore and verify active session against backend server
 */
export async function checkActiveSession(): Promise<UserAccount | null> {
  const token = getSessionToken();
  if (!token) return null;

  try {
    const result = await safeFetchJson<{ user?: UserAccount; error?: string }>('/api/auth/session', {
      headers: {
        Authorization: `Bearer ${token}`,
        'x-session-token': token
      }
    });

    if (result.ok && result.data?.user && result.data.user.role !== 'admin') {
      try {
        localStorage.setItem(CACHED_USER_KEY, JSON.stringify(result.data.user));
      } catch {}
      return result.data.user;
    }

    // Clear invalid/expired/admin session from customer storage
    try {
      localStorage.removeItem(SESSION_TOKEN_KEY);
      localStorage.removeItem(CACHED_USER_KEY);
    } catch {}
    return null;
  } catch {
    return null;
  }
}

/**
 * Secure Sign Out
 */
export async function logoutDeviceUser(): Promise<void> {
  const token = getSessionToken();

  if (token) {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-session-token': token
        }
      });
    } catch {}
  }

  try {
    localStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem(CACHED_USER_KEY);
    sessionStorage.removeItem('aivm_preview_mode');
  } catch {}
}

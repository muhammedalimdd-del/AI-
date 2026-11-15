import { UserAccount, VideoRequestClient } from '../types/client.ts';
import { safeFetchJson } from './apiClient.ts';

const RESET_EPOCH_KEY = 'aitimes_clean_reset_epoch';
const CURRENT_RESET_EPOCH = 'aitimes_reset_2026_11_15_v4';

export function ensureClientStorageReset(): void {
  if (typeof window === 'undefined') return;
  try {
    const appliedEpoch = localStorage.getItem(RESET_EPOCH_KEY);
    if (appliedEpoch !== CURRENT_RESET_EPOCH) {
      const keysToPurge = [
        'aivm_cached_user',
        'aivm_session_token',
        'aivm_device_id',
        'aivm_device_registry_v1',
        'aivm_local_users_store',
        'aivm_local_devices_store',
        'aivm_local_sessions_store',
        'studio_local_requests',
        'studio_budget_requests',
        'ai_video_maker_draft_v2',
        'zenvora_draft_v1',
        'zenvora_cached_user',
        'zenvora_session_token',
        'zenvora_device_id',
        'zenvora_device_registered',
        'zenvora_device_registry_v1',
        'zenvora_local_users_store',
        'zenvora_local_devices_store',
        'zenvora_local_sessions_store',
        'zenvora_local_requests',
        'zenvora_budget_requests',
        'studio_admin_token'
      ];
      for (const key of keysToPurge) {
        try {
          localStorage.removeItem(key);
        } catch {}
        try {
          sessionStorage.removeItem(key);
        } catch {}
      }
      try {
        sessionStorage.removeItem('aivm_preview_mode');
      } catch {}
      try {
        document.cookie = 'aivm_device_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'zenvora_device_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      } catch {}
      localStorage.setItem(RESET_EPOCH_KEY, CURRENT_RESET_EPOCH);
    }
  } catch {}
}

ensureClientStorageReset();

export async function saveVideoRequestToFirestore(_request: VideoRequestClient): Promise<void> {
  // Requests are persisted directly in the backend database via /api/requests
}

export async function saveBudgetRequestToFirestore(_budgetRequest: any): Promise<void> {
  // Budget requests are persisted directly in the backend database via /api/budget-requests
}

export async function getAllVideoRequestsFromFirestore(): Promise<VideoRequestClient[]> {
  try {
    const token = localStorage.getItem('studio_admin_token') || '';
    if (!token) return [];
    const res = await safeFetchJson<{ requests?: VideoRequestClient[] }>('/api/admin/requests', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok && Array.isArray(res.data?.requests)) {
      return res.data.requests;
    }
  } catch {}
  return [];
}

export async function getAllUsersFromFirestore(): Promise<UserAccount[]> {
  try {
    const token = localStorage.getItem('studio_admin_token') || '';
    if (!token) return [];
    const res = await safeFetchJson<{ users?: UserAccount[] }>('/api/admin/users', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok && Array.isArray(res.data?.users)) {
      return res.data.users;
    }
  } catch {}
  return [];
}

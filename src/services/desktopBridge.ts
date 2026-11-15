import { safeFetchJson } from './apiClient.ts';

export interface DesktopUpdateStatus {
  state: 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'up-to-date' | 'error';
  currentVersion: string;
  availableVersion?: string | null;
  percent?: number;
  message?: string;
}

export interface DesktopRuntimeInfo {
  isElectron: boolean;
  appName: string;
  version: string;
  platform: string;
  arch: string;
  serverUrl: string;
  updateStatus?: DesktopUpdateStatus;
}

export interface DesktopInstallerInfo {
  available: boolean;
  appName: string;
  version: string;
  fileName: string;
  sizeBytes: number;
  sizeFormatted: string;
  updatedAt: string | null;
  platform: string;
  downloadUrl: string;
}

export interface DownloadProgressState {
  loadedBytes: number;
  totalBytes: number;
  percent: number;
}

declare global {
  interface Window {
    aivmDesktop?: {
      isElectron: boolean;
      platform: string;
      arch: string;
      getInfo: () => Promise<DesktopRuntimeInfo>;
      setServerUrl: (url: string) => Promise<{ success: boolean; serverUrl?: string; error?: string }>;
      checkForUpdates: () => Promise<{ success: boolean; status?: DesktopUpdateStatus; error?: string }>;
      downloadUpdate: () => Promise<{ success: boolean; error?: string }>;
      installUpdate: () => Promise<{ success: boolean }>;
      openExternal: (url: string) => Promise<{ success: boolean }>;
      navigate: (route: 'home' | 'admin') => Promise<{ success: boolean }>;
      onUpdateStatus: (callback: (status: DesktopUpdateStatus) => void) => () => void;
    };
  }
}

export function isRunningInElectron(): boolean {
  return typeof window !== 'undefined' && Boolean(window.aivmDesktop?.isElectron);
}

export async function fetchDesktopInstallerInfo(): Promise<DesktopInstallerInfo | null> {
  const res = await safeFetchJson<DesktopInstallerInfo>('/api/desktop/info');
  if (!res.ok || !res.data) return null;
  return res.data;
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  const kb = bytes / 1024;
  return `${kb.toFixed(0)} KB`;
}

export async function downloadWindowsInstaller(
  onProgress: (progress: DownloadProgressState) => void
): Promise<{ fileName: string; sizeBytes: number }> {
  const downloadEndpoint = '/downloads/AI-Video-Maker-Setup.exe';
  const response = await fetch(downloadEndpoint, {
    method: 'GET',
    cache: 'no-store'
  });

  if (!response.ok) {
    let errMsg = `Installer download unavailable (HTTP ${response.status}).`;
    try {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = await response.json();
        if (json?.error) errMsg = json.error;
      }
    } catch {}
    throw new Error(errMsg);
  }

  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  if (contentType.includes('text/html')) {
    throw new Error('Windows installer file is currently rebuilding. Please try again in a moment.');
  }

  const totalBytes = Number(response.headers.get('content-length') || '0');
  const reader = response.body?.getReader();

  if (!reader) {
    const blob = await response.blob();
    if (blob.size < 1024 * 100) {
      throw new Error('Downloaded installer appears incomplete. Please retry.');
    }
    onProgress({ loadedBytes: blob.size, totalBytes: blob.size, percent: 100 });
    triggerBrowserFileSave(blob, 'AI-Video-Maker-Setup.exe');
    return { fileName: 'AI-Video-Maker-Setup.exe', sizeBytes: blob.size };
  }

  const chunks: Uint8Array[] = [];
  let loadedBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      loadedBytes += value.length;
      const percent = totalBytes > 0 ? Math.min(99, Math.round((loadedBytes / totalBytes) * 100)) : 50;
      onProgress({ loadedBytes, totalBytes, percent });
    }
  }

  const blob = new Blob(chunks as BlobPart[], {
    type: 'application/vnd.microsoft.portable-executable'
  });

  if (blob.size < 1024 * 100) {
    throw new Error('Installer file could not be verified. Please retry the download.');
  }

  onProgress({ loadedBytes: blob.size, totalBytes: blob.size, percent: 100 });
  triggerBrowserFileSave(blob, 'AI-Video-Maker-Setup.exe');

  return { fileName: 'AI-Video-Maker-Setup.exe', sizeBytes: blob.size };
}

function triggerBrowserFileSave(blob: Blob, filename: string) {
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(blobUrl);
  }, 5000);
}

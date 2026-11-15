import React, { useEffect, useState } from 'react';
import { DesktopUpdateStatus, isRunningInElectron } from '../../services/desktopBridge.ts';
import { RefreshCw, Download, CheckCircle2, X } from 'lucide-react';

export const DesktopUpdateBanner: React.FC = () => {
  const [status, setStatus] = useState<DesktopUpdateStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isRunningInElectron() || !window.aivmDesktop) return;

    window.aivmDesktop
      .getInfo()
      .then((info) => {
        if (info.updateStatus && ['available', 'downloading', 'downloaded'].includes(info.updateStatus.state)) {
          setStatus(info.updateStatus);
        }
      })
      .catch(() => {});

    const unsubscribe = window.aivmDesktop.onUpdateStatus((nextStatus) => {
      if (['available', 'downloading', 'downloaded'].includes(nextStatus.state)) {
        setDismissed(false);
      }
      setStatus(nextStatus);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  if (!isRunningInElectron() || dismissed || !status) return null;
  if (!['available', 'downloading', 'downloaded'].includes(status.state)) {
    return null;
  }

  return (
    <div className="w-full bg-indigo-950/95 border-b border-indigo-700/70 px-4 py-2.5 text-xs text-indigo-100">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {status.state === 'downloaded' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
          )}
          <span className="font-medium">
            {status.message ||
              (status.state === 'downloaded'
                ? 'A new update for AI Video Maker is ready to install.'
                : 'Downloading AI Video Maker desktop update...')}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {status.state === 'downloaded' && (
            <button
              type="button"
              onClick={() => window.aivmDesktop?.installUpdate()}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Restart &amp; Install Update</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss update notification"
            className="p-1 rounded-md text-indigo-300 hover:text-white hover:bg-indigo-900/60 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

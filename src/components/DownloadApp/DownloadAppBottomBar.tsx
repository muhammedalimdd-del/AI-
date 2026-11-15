import React from 'react';
import { isRunningInElectron } from '../../services/desktopBridge.ts';
import { Download, Monitor } from 'lucide-react';

interface DownloadAppBottomBarProps {
  onOpenDownloadPage: () => void;
  isOnDownloadPage?: boolean;
}

export const DownloadAppBottomBar: React.FC<DownloadAppBottomBarProps> = ({
  onOpenDownloadPage,
  isOnDownloadPage = false
}) => {
  if (isRunningInElectron() || isOnDownloadPage) {
    return null;
  }

  return (
    <aside
      aria-label="Download Our App Bar"
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#070B14]/95 backdrop-blur-xl border-t border-purple-500/30 shadow-[0_-10px_35px_rgba(0,0,0,0.7)] px-3 py-3 sm:px-6 sm:py-3.5 transition-all"
    >
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-400" />

      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative shrink-0">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 p-[1.5px] shadow-lg shadow-purple-900/50">
              <img
                src="/pwa-192x192.png"
                alt="AI Video Maker App Icon"
                className="w-full h-full object-cover rounded-[10px]"
              />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-white tracking-wide uppercase">
              <span>AI VIDEO MAKER DESKTOP</span>
              <span aria-hidden="true" className="hidden md:inline text-slate-500">·</span>
              <span className="hidden md:inline text-xs font-medium normal-case text-cyan-300">
                Windows 10 &amp; 11 Installer (.exe)
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-300 truncate">
              Install AI Video Maker on your Windows computer and enjoy it like a normal desktop application.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0 justify-end">
          <button
            type="button"
            onClick={onOpenDownloadPage}
            className="w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:via-indigo-500 hover:to-cyan-400 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/40 hover:shadow-indigo-600/60 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
          >
            <Monitor className="w-4 h-4 text-cyan-200 shrink-0" />
            <Download className="w-4 h-4 text-cyan-200 shrink-0" />
            <span>DOWNLOAD OUR APP</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

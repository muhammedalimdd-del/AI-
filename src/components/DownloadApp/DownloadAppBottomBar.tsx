import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall.ts';
import {
  Download,
  Smartphone,
  Monitor,
  Share2,
  PlusSquare,
  CheckCircle2,
  X,
  Sparkles,
  ExternalLink,
  Laptop
} from 'lucide-react';

export const DownloadAppBottomBar: React.FC = () => {
  const { isInstallable, isInstalled, platform, triggerInstall } = usePWAInstall();
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [isSuccessToast, setIsSuccessToast] = useState(false);

  // If the user has already installed the app and is actively running it in standalone mode, hide the bar
  if (isInstalled) {
    return null;
  }

  const handleDownloadClick = async () => {
    // 1. If standard beforeinstallprompt is available (Chromium, Android Chrome, Edge, desktop Chrome), trigger it directly!
    if (isInstallable) {
      const installed = await triggerInstall();
      if (installed) {
        setIsSuccessToast(true);
        setTimeout(() => setIsSuccessToast(false), 4000);
        return;
      }
    }

    // 2. Otherwise open platform-specific guided installation modal
    setShowInstructionsModal(true);
  };

  return (
    <>
      {/* FIXED BOTTOM DOWNLOAD APP BAR */}
      <aside
        aria-label="Download Our App Bar"
        className="fixed bottom-0 left-0 right-0 z-40 bg-[#070B14]/95 backdrop-blur-xl border-t border-purple-500/30 shadow-[0_-10px_35px_rgba(0,0,0,0.7)] px-3 py-3 sm:px-6 sm:py-3.5 transition-all"
      >
        {/* Top vibrant gradient accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-400" />

        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          {/* Left: App icon + Text & subtitle */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative shrink-0">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 p-[1.5px] shadow-lg shadow-purple-900/50">
                <img
                  src="/pwa-192x192.png"
                  alt="AI Video Maker App Icon"
                  className="w-full h-full object-cover rounded-[10px]"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-cyan-400 border-2 border-[#070B14] flex items-center justify-center">
                <Sparkles className="w-2.5 h-2.5 text-[#070B14]" />
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black text-white tracking-wide uppercase">
                  DOWNLOAD OUR APP
                </span>
                <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-700/60 text-[10px] font-bold text-purple-300">
                  {platform.platformName} Ready
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-300 truncate">
                Get the AI Video Maker app on your device.
              </p>
            </div>
          </div>

          {/* Right: Action button */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0 justify-end">
            <button
              type="button"
              onClick={handleDownloadClick}
              className="w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:via-indigo-500 hover:to-cyan-400 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/40 hover:shadow-indigo-600/60 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group"
            >
              <Download className="w-4 h-4 text-cyan-200 group-hover:translate-y-0.5 transition-transform" />
              <span>
                {isInstallable
                  ? `Install on ${platform.platformName}`
                  : platform.isIOS
                  ? 'Add to Home Screen'
                  : `Download App (${platform.platformName})`}
              </span>
            </button>
          </div>
        </div>
      </aside>

      {/* PLATFORM INSTRUCTIONS MODAL */}
      {showInstructionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-[#090E1B] border border-purple-500/40 shadow-2xl p-6 relative overflow-hidden">
            {/* Ambient Glow */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-cyan-500 p-[1.5px] shrink-0">
                  <img
                    src="/pwa-192x192.png"
                    alt="App"
                    className="w-full h-full object-cover rounded-[10px]"
                  />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    Install AI Video Maker
                  </h3>
                  <p className="text-xs text-slate-400">
                    Standalone Progressive Web App for {platform.platformName}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowInstructionsModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Platform-Specific Step Guide */}
            <div className="py-5 space-y-4 text-xs">
              {platform.isIOS ? (
                // iOS Safari Steps
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-800/40 text-purple-200">
                    Follow these 2 quick steps in Safari to add AI Video Maker to your Home Screen:
                  </div>
                  <ol className="space-y-3 text-slate-200">
                    <li className="flex items-start gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0">
                        1
                      </span>
                      <div>
                        <p className="font-semibold text-white flex items-center gap-1.5">
                          Tap the <Share2 className="w-3.5 h-3.5 text-cyan-400" /> Share button
                        </p>
                        <p className="text-slate-400 text-[11px] mt-0.5">
                          Located in the bottom Safari toolbar (or top right on iPad).
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0">
                        2
                      </span>
                      <div>
                        <p className="font-semibold text-white flex items-center gap-1.5">
                          Tap <PlusSquare className="w-3.5 h-3.5 text-emerald-400" /> Add to Home Screen
                        </p>
                        <p className="text-slate-400 text-[11px] mt-0.5">
                          Scroll down in the share sheet and tap "Add to Home Screen", then tap "Add".
                        </p>
                      </div>
                    </li>
                  </ol>
                </div>
              ) : platform.isAndroid ? (
                // Android Steps
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-800/40 text-purple-200">
                    Install AI Video Maker directly to your Android device home screen:
                  </div>
                  <ol className="space-y-3 text-slate-200">
                    <li className="flex items-start gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0">
                        1
                      </span>
                      <div>
                        <p className="font-semibold text-white">Tap Browser Menu (⋮)</p>
                        <p className="text-slate-400 text-[11px] mt-0.5">
                          In Chrome or your mobile browser, tap the three dots in the top right.
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0">
                        2
                      </span>
                      <div>
                        <p className="font-semibold text-white flex items-center gap-1.5">
                          Select <Download className="w-3.5 h-3.5 text-emerald-400" /> Install app or Add to Home Screen
                        </p>
                        <p className="text-slate-400 text-[11px] mt-0.5">
                          The app will install as a standalone app with full offline capabilities.
                        </p>
                      </div>
                    </li>
                  </ol>
                </div>
              ) : (
                // Desktop (Windows / Mac) Steps
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-800/40 text-purple-200">
                    Install AI Video Maker as a desktop application on {platform.platformName}:
                  </div>
                  <ol className="space-y-3 text-slate-200">
                    <li className="flex items-start gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0">
                        1
                      </span>
                      <div>
                        <p className="font-semibold text-white">Click the Install icon in the address bar</p>
                        <p className="text-slate-400 text-[11px] mt-0.5">
                          In Chrome, Edge, or Brave, click the app installation icon in the right side of the URL address bar.
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0">
                        2
                      </span>
                      <div>
                        <p className="font-semibold text-white">Confirm "Install"</p>
                        <p className="text-slate-400 text-[11px] mt-0.5">
                          AI Video Maker launches in its own dedicated, clean window without browser tabs.
                        </p>
                      </div>
                    </li>
                  </ol>
                </div>
              )}

              {/* App Advantages */}
              <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Fast Standalone App
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> Offline Capable
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" /> Zero Play Store Hassle
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" /> Instant Updates
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowInstructionsModal(false)}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Got It, Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

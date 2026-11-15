import React, { useEffect, useState } from 'react';
import {
  DesktopInstallerInfo,
  DownloadProgressState,
  downloadWindowsInstaller,
  fetchDesktopInstallerInfo,
  formatBytes,
  isRunningInElectron
} from '../../services/desktopBridge.ts';
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FolderOpen,
  HardDrive,
  Laptop,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  Monitor
} from 'lucide-react';

interface DownloadPageProps {
  onBack: () => void;
}

export const DownloadPage: React.FC<DownloadPageProps> = ({ onBack }) => {
  const [info, setInfo] = useState<DesktopInstallerInfo | null>(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState<DownloadProgressState | null>(null);
  const [downloadCompleted, setDownloadCompleted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const inElectron = isRunningInElectron();

  useEffect(() => {
    let mounted = true;
    fetchDesktopInstallerInfo()
      .then((data) => {
        if (mounted) setInfo(data);
      })
      .finally(() => {
        if (mounted) setIsLoadingInfo(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleDownloadExe = async () => {
    setErrorMessage(null);
    setDownloadCompleted(false);
    setIsDownloading(true);
    setProgress({ loadedBytes: 0, totalBytes: info?.sizeBytes || 0, percent: 0 });

    try {
      await downloadWindowsInstaller((p) => {
        setProgress(p);
      });
      setDownloadCompleted(true);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Download failed. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const installerReady = Boolean(info?.available);

  return (
    <section className="min-h-[82vh] bg-[#050811] text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#090E1B] border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400" />
            <span>Back to AI Video Maker</span>
          </button>

          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span>Windows 10 &amp; Windows 11 (64-bit)</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              {isLoadingInfo
                ? 'Checking build...'
                : installerReady
                ? `v${info?.version || '1.0.0'} · ${info?.sizeFormatted}`
                : 'Installer pending'}
            </span>
          </div>
        </div>

        <div className="rounded-2xl bg-[#090E1B] border border-slate-800 p-6 sm:p-10 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-[#050811] border border-slate-800 p-1.5 shrink-0 shadow-lg">
                  <img
                    src="/assets/aistudio/Gemini_Generated_Image_l9mivgl9mivgl9mi_4016af0e.png"
                    onError={(e) => {
                      e.currentTarget.src = '/pwa-512x512.png';
                    }}
                    alt="AI Video Maker Application Logo"
                    className="w-full h-full object-cover rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-amber-400 tracking-wide">
                    AI TIMES Desktop Software
                  </p>
                  <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight text-balance">
                    AI Video Maker
                  </h1>
                  <p className="text-xs text-slate-400 tabular-nums">
                    AI-Video-Maker-Setup.exe · Standalone Windows Desktop App
                  </p>
                </div>
              </div>

              <p className="text-base sm:text-lg text-slate-200 leading-relaxed max-w-2xl">
                Install AI Video Maker on your Windows computer and enjoy it like a normal desktop application.
              </p>

              {inElectron ? (
                <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-800/70 text-emerald-200 text-sm flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>
                    You are currently running the installed <strong>AI Video Maker</strong> Windows desktop application.
                  </span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <button
                      type="button"
                      onClick={handleDownloadExe}
                      disabled={isDownloading || isLoadingInfo || !installerReady}
                      className="px-7 py-4 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 hover:from-indigo-500 hover:via-purple-500 hover:to-cyan-500 disabled:opacity-60 text-white font-bold text-sm sm:text-base flex items-center gap-3 shadow-xl shadow-indigo-600/25 transition-all cursor-pointer whitespace-nowrap"
                    >
                      <Download className="w-5 h-5 text-cyan-200 shrink-0" />
                      <span>
                        {isDownloading
                          ? `Downloading Installer (${progress?.percent ?? 0}%)`
                          : 'Download for Windows (.exe)'}
                      </span>
                    </button>

                    {installerReady && !isDownloading && (
                      <a
                        href="/downloads/AI-Video-Maker-Setup.exe"
                        download="AI-Video-Maker-Setup.exe"
                        className="text-xs font-semibold text-slate-300 hover:text-white underline underline-offset-4 whitespace-nowrap"
                      >
                        Direct link: AI-Video-Maker-Setup.exe ({info?.sizeFormatted})
                      </a>
                    )}
                  </div>

                  {isDownloading && progress && (
                    <div className="p-4 rounded-xl bg-[#050811] border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs font-medium text-slate-300 tabular-nums">
                        <span>Downloading AI-Video-Maker-Setup.exe...</span>
                        <span>
                          {progress.percent}% ({formatBytes(progress.loadedBytes)}
                          {progress.totalBytes > 0 ? ` / ${formatBytes(progress.totalBytes)}` : ''})
                        </span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 transition-all duration-150"
                          style={{ width: `${Math.max(4, progress.percent)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {downloadCompleted && (
                    <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-700/70 text-emerald-100 text-xs sm:text-sm space-y-2">
                      <div className="flex items-center gap-2 font-bold text-emerald-300">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Download Complete: AI-Video-Maker-Setup.exe saved to your Downloads folder.</span>
                      </div>
                      <p className="text-emerald-200/90 leading-relaxed">
                        Open <strong>AI-Video-Maker-Setup.exe</strong> from your browser downloads bar (or press <kbd className="px-1.5 py-0.5 rounded bg-emerald-900/80 border border-emerald-700 font-mono text-[11px]">Ctrl+J</kbd>) to start the Windows installation wizard.
                      </p>
                    </div>
                  )}

                  {errorMessage && (
                    <div className="p-4 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-200 text-xs sm:text-sm flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span>{errorMessage}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-slate-800 pt-6 lg:pt-0 lg:pl-8 space-y-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Included in the Desktop App
              </h2>
              <ul className="space-y-3 text-xs sm:text-sm text-slate-300">
                <li className="flex items-start gap-3">
                  <Monitor className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>Opens in its own standalone Windows window without Chrome or browser tabs.</span>
                </li>
                <li className="flex items-start gap-3">
                  <Laptop className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span>Desktop icon &amp; Windows Start Menu entry created automatically during setup.</span>
                </li>
                <li className="flex items-start gap-3">
                  <HardDrive className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <span>Character photo uploads, custom quotes, request tracking, and video deliveries synced live with the studio server.</span>
                </li>
                <li className="flex items-start gap-3">
                  <RefreshCw className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>Built-in automatic updates keep your desktop app current with the latest AI Video Maker features.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-[#090E1B] border border-slate-800 p-6 sm:p-8 space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white">
              Windows Installation Instructions
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Install AI Video Maker on Windows 10 or Windows 11 in four simple steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="p-4 rounded-xl bg-[#050811] border border-slate-800 space-y-2">
              <p className="text-xs font-bold text-indigo-400">01. Download Installer</p>
              <h3 className="text-sm font-bold text-white">Save Setup File</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Click the Download for Windows button above to save <span className="text-slate-200 font-mono">AI-Video-Maker-Setup.exe</span>.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#050811] border border-slate-800 space-y-2">
              <p className="text-xs font-bold text-indigo-400">02. Launch Wizard</p>
              <h3 className="text-sm font-bold text-white">Run Setup.exe</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Double-click <span className="text-slate-200 font-mono">AI-Video-Maker-Setup.exe</span>. If Windows Defender SmartScreen prompts, click <strong>More info</strong> then <strong>Run anyway</strong>.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#050811] border border-slate-800 space-y-2">
              <p className="text-xs font-bold text-indigo-400">03. Choose Folder</p>
              <h3 className="text-sm font-bold text-white">Complete Setup</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pick your preferred installation folder and click <strong>Install</strong> to add the Desktop icon and Start Menu shortcut.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#050811] border border-slate-800 space-y-2">
              <p className="text-xs font-bold text-indigo-400">04. Open Desktop App</p>
              <h3 className="text-sm font-bold text-white">Click Sign In &amp; Create</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Double-click the <strong>AI Video Maker</strong> icon on your Windows Desktop, click <strong>SIGN IN</strong>, and start creating immediately.
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Full feature parity with the website — customer portal, video requests, email alerts, and custom pricing.</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <FolderOpen className="w-4 h-4 text-amber-400 shrink-0" />
              <span>File: AI-Video-Maker-Setup.exe</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

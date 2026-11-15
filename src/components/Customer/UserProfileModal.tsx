import React, { useState } from 'react';
import { UserAccount } from '../../types/client.ts';
import {
  Mail,
  ShieldCheck,
  Clock,
  Key,
  LogOut,
  X,
  Sparkles,
  Film,
  Copy,
  Check
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
  onSignOut: () => void;
  onNewRequest: () => void;
  onViewRequests: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSignOut,
  onNewRequest,
  onViewRequests
}) => {
  const [copiedKey, setCopiedKey] = useState(false);

  if (!isOpen) return null;

  let recoveryKey: string | null = null;
  try {
    recoveryKey = sessionStorage.getItem('aitimes_new_recovery_key');
  } catch {
    recoveryKey = null;
  }

  const handleCopyRecoveryKey = async () => {
    if (!recoveryKey) return;
    try {
      await navigator.clipboard.writeText(recoveryKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2500);
    } catch {
      // ignore
    }
  };

  const hasEmail = Boolean(
    currentUser.email && !currentUser.email.toLowerCase().endsWith('@aivideomaker.local')
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md rounded-3xl bg-[#090D18] border border-slate-800 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="relative z-10 space-y-6">
          {/* Header Title */}
          <div>
            <span className="text-[11px] uppercase tracking-wider font-extrabold text-indigo-400">
              Account Overview
            </span>
            <h2 className="text-2xl font-black text-white mt-0.5">My Profile</h2>
          </div>

          {/* Profile Card Header */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#0C1222] border border-slate-800/90">
            <div className="w-16 h-16 rounded-2xl bg-indigo-950 border border-indigo-700 text-indigo-300 flex items-center justify-center text-xl font-bold shrink-0">
              {(currentUser.username || currentUser.displayName || 'U')[0].toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-bold text-white truncate font-mono">
                  @{currentUser.username || currentUser.displayName}
                </h3>
                <span
                  className="p-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-700/50"
                  title="Private Customer Account"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                </span>
              </div>
              {hasEmail && (
                <p className="text-xs text-slate-300 truncate mt-0.5 flex items-center gap-1">
                  <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">{currentUser.email}</span>
                </p>
              )}
              <div className="mt-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-indigo-950/80 text-indigo-300 border border-indigo-800/60">
                  Customer Account
                </span>
              </div>
            </div>
          </div>

          {/* One-Time Recovery Key Reminder (only shown in registration session) */}
          {recoveryKey && (
            <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-700/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5" />
                  Save Your Personal Recovery Key
                </span>
                <button
                  type="button"
                  onClick={handleCopyRecoveryKey}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-200 hover:text-white bg-amber-900/50 px-2.5 py-1 rounded-lg cursor-pointer"
                >
                  {copiedKey ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="font-mono text-xs text-white bg-black/50 px-3 py-2 rounded-lg border border-amber-800/40 select-all">
                {recoveryKey}
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Keep this key somewhere safe in case you ever need to reset your password later.
              </p>
            </div>
          )}

          {/* Account Details Grid */}
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/70 border border-slate-800/70">
              <span className="text-slate-400 flex items-center gap-2">
                <Key className="w-3.5 h-3.5 text-indigo-400" />
                Account UID
              </span>
              <span className="font-mono text-slate-400 text-[11px] truncate max-w-[170px]">
                {currentUser.uid}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/70 border border-slate-800/70">
              <span className="text-slate-400 flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                Privacy &amp; Role
              </span>
              <span className="font-mono text-cyan-300 text-[11px] font-bold">
                Private Customer
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/70 border border-slate-800/70">
              <span className="text-slate-400 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                Last Login
              </span>
              <span className="text-slate-300 font-mono text-[11px]">
                {currentUser.lastLoginAt ? new Date(currentUser.lastLoginAt).toLocaleDateString() : 'Active now'}
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2 pt-2">
            <button
              onClick={() => {
                onClose();
                onNewRequest();
              }}
              className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:shadow-lg hover:shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-cyan-300" />
              <span>Create AI Video Request</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onViewRequests();
              }}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Film className="w-4 h-4 text-indigo-400" />
              <span>View My Requests</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onSignOut();
              }}
              className="w-full py-2 px-4 rounded-xl text-xs font-semibold text-rose-300 hover:text-rose-200 hover:bg-rose-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

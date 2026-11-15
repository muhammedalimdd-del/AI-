import React, { useState } from 'react';
import { AiVideoCameraLogo } from './Brand/AiVideoCameraLogo.tsx';
import {
  Sparkles,
  Menu,
  X,
  Clock,
  Download
} from 'lucide-react';
import { isRunningInElectron } from '../services/desktopBridge.ts';

interface NavbarProps {
  onNavigate: (sectionId: string) => void;
  onRequestClick: () => void;
  onTrackClick: () => void;
  onContactClick: () => void;
  onBudgetContactClick: () => void;
  onDownloadAppClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onNavigate,
  onRequestClick,
  onTrackClick,
  onBudgetContactClick,
  onDownloadAppClick
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNav = (id: string) => {
    onNavigate(id);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-[#050811]/90 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <button
          onClick={() => handleNav('hero')}
          className="flex items-center gap-3 text-left transition-opacity hover:opacity-95 cursor-pointer"
        >
          <AiVideoCameraLogo size="md" showText={true} />
        </button>

        {/* Desktop Nav Links */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-300">
          <button
            onClick={() => handleNav('hero')}
            className="hover:text-white transition-colors cursor-pointer py-1"
          >
            Home
          </button>
          <button
            onClick={() => handleNav('how-it-works')}
            className="hover:text-white transition-colors cursor-pointer py-1"
          >
            How It Works
          </button>
          <button
            onClick={() => handleNav('video-styles')}
            className="hover:text-white transition-colors cursor-pointer py-1"
          >
            Video Styles
          </button>
          <button
            onClick={onTrackClick}
            className="flex items-center gap-1.5 text-indigo-300 hover:text-white transition-colors cursor-pointer py-1 font-semibold"
          >
            <Clock className="w-4 h-4 text-indigo-400" />
            <span>Track Request</span>
          </button>
          <button
            onClick={onBudgetContactClick}
            className="flex items-center gap-1.5 text-cyan-300 hover:text-white transition-colors cursor-pointer py-1 font-semibold"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Contact &amp; Budget</span>
          </button>
          <button
            onClick={() => handleNav('faq')}
            className="hover:text-white transition-colors cursor-pointer py-1"
          >
            FAQ
          </button>
          {onDownloadAppClick && !isRunningInElectron() && (
            <button
              onClick={onDownloadAppClick}
              className="flex items-center gap-1.5 text-amber-300 hover:text-amber-200 transition-colors cursor-pointer py-1 font-semibold whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>DOWNLOAD OUR APP</span>
            </button>
          )}
        </nav>

        {/* Right Primary CTA */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={onRequestClick}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:shadow-lg hover:shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
            <span>Create Your Video</span>
          </button>
        </div>

        {/* Mobile Hamburger */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-slate-800/80 text-slate-300 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#070B14] border-b border-slate-800 px-4 pt-3 pb-6 space-y-3 animate-fadeIn">
          <button
            onClick={() => handleNav('hero')}
            className="w-full text-left py-2 text-sm text-slate-300 font-medium hover:text-white"
          >
            Home
          </button>
          <button
            onClick={() => handleNav('how-it-works')}
            className="w-full text-left py-2 text-sm text-slate-300 font-medium hover:text-white"
          >
            How It Works
          </button>
          <button
            onClick={() => handleNav('video-styles')}
            className="w-full text-left py-2 text-sm text-slate-300 font-medium hover:text-white"
          >
            Video Styles
          </button>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onTrackClick();
            }}
            className="w-full text-left py-2 text-sm text-indigo-400 font-semibold hover:text-white"
          >
            Track Request
          </button>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onBudgetContactClick();
            }}
            className="w-full text-left py-2 text-sm text-cyan-300 font-semibold hover:text-white"
          >
            Contact &amp; Video Budget
          </button>
          <button
            onClick={() => handleNav('faq')}
            className="w-full text-left py-2 text-sm text-slate-300 font-medium hover:text-white"
          >
            FAQ
          </button>
          {onDownloadAppClick && !isRunningInElectron() && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onDownloadAppClick();
              }}
              className="w-full text-left py-2 text-sm text-amber-300 font-semibold hover:text-amber-200 flex items-center gap-2"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>DOWNLOAD OUR APP</span>
            </button>
          )}

          <div className="pt-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onRequestClick();
              }}
              className="w-full py-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
              <span>Create My AI Video</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

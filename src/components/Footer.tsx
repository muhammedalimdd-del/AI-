import React from 'react';
import { AiVideoCameraLogo } from './Brand/AiVideoCameraLogo.tsx';
import { Shield, Lock } from 'lucide-react';

import { isRunningInElectron } from '../services/desktopBridge.ts';

interface FooterProps {
  onNavigate: (sectionId: string) => void;
  onRequestClick: () => void;
  onTrackClick: () => void;
  onPrivacyClick: () => void;
  onTermsClick: () => void;
  onDeleteRequestClick: () => void;
  onContactClick: () => void;
  onBudgetContactClick: () => void;
  onDownloadAppClick?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onNavigate,
  onRequestClick,
  onTrackClick,
  onPrivacyClick,
  onTermsClick,
  onDeleteRequestClick,
  onContactClick,
  onBudgetContactClick,
  onDownloadAppClick
}) => {
  return (
    <footer className="w-full bg-[#04060C] border-t border-slate-800/80 pt-16 pb-12 text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-14">
          {/* Brand info */}
          <div className="lg:col-span-2 space-y-4">
            <AiVideoCameraLogo size="sm" showText={true} />
            <p className="text-slate-400 leading-relaxed text-xs max-w-md">
              A bespoke human-and-AI video production studio. Tell us your story, provide character references, and let our dedicated creative workflow bring your vision to life with direct delivery to your chosen email address.
            </p>
            <div className="flex items-center gap-3 text-xs text-slate-400 pt-2">
              <span className="flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-indigo-400" /> Confidential Briefs
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-emerald-400" /> No Account Required
              </span>
            </div>
          </div>

          {/* Studio Navigation */}
          <div>
            <h4 className="text-xs uppercase font-bold tracking-wider text-slate-200 mb-4">Explore Studio</h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <button onClick={() => onNavigate('hero')} className="hover:text-white transition-colors cursor-pointer">
                  Home Overview
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('how-it-works')} className="hover:text-white transition-colors cursor-pointer">
                  5-Step Process
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('video-styles')} className="hover:text-white transition-colors cursor-pointer">
                  Video Styles Gallery
                </button>
              </li>
              <li>
                <button onClick={onRequestClick} className="hover:text-white transition-colors text-indigo-400 font-semibold cursor-pointer">
                  Create My AI Video
                </button>
              </li>
              <li>
                <button onClick={onTrackClick} className="hover:text-white transition-colors cursor-pointer">
                  Track Video Request
                </button>
              </li>
            </ul>
          </div>

          {/* Contact & Custom Options */}
          <div>
            <h4 className="text-xs uppercase font-bold tracking-wider text-slate-200 mb-4">Proposals &amp; Contact</h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <button onClick={onBudgetContactClick} className="hover:text-white text-cyan-400 font-semibold transition-colors cursor-pointer">
                  Contact &amp; Video Budget Form
                </button>
              </li>
              <li>
                <button onClick={onContactClick} className="hover:text-white transition-colors cursor-pointer">
                  Customer Support Inquiry
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('faq')} className="hover:text-white transition-colors cursor-pointer">
                  Frequently Asked Questions
                </button>
              </li>
              {onDownloadAppClick && !isRunningInElectron() && (
                <li>
                  <button
                    onClick={onDownloadAppClick}
                    className="hover:text-amber-200 text-amber-300 font-semibold transition-colors cursor-pointer"
                  >
                    Download Windows App (.exe)
                  </button>
                </li>
              )}
            </ul>
          </div>

          {/* Trust & Compliance */}
          <div>
            <h4 className="text-xs uppercase font-bold tracking-wider text-slate-200 mb-4">Trust &amp; Terms</h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <button onClick={onPrivacyClick} className="hover:text-white transition-colors cursor-pointer">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button onClick={onTermsClick} className="hover:text-white transition-colors cursor-pointer">
                  Terms of Service
                </button>
              </li>
              <li>
                <button onClick={onDeleteRequestClick} className="hover:text-rose-400 transition-colors cursor-pointer">
                  Request Data Deletion
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>
            &copy; {new Date().getFullYear()} AI TIMES. All creative briefs and reference assets handled confidentially.
          </p>
          <div className="flex items-center gap-1 text-slate-300 font-medium">
            <span>The payment will be based on the video.</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

import React from 'react';
import { AiVideoCameraLogo } from '../Brand/AiVideoCameraLogo.tsx';
import {
  Sparkles,
  Film,
  CreditCard,
  Mail,
  Zap,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

interface WelcomeScreenProps {
  onSignIn: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSignIn }) => {
  const previewShowcases = [
    {
      title: 'Cinematic Videos',
      image: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=600&q=80',
      badge: '4K Blockbuster'
    },
    {
      title: 'Realistic Videos',
      image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
      badge: 'Photorealistic'
    },
    {
      title: 'Superhero & VFX',
      image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=600&q=80',
      badge: 'Action VFX'
    },
    {
      title: 'Animated Stories',
      image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
      badge: 'Stylized 3D'
    }
  ];

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-12 relative overflow-hidden selection:bg-indigo-600/40 selection:text-white">
      {/* Background ambient lighting effects */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-10 right-10 w-80 h-80 bg-cyan-600/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

      <div className="w-full max-w-6xl relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Column: Cinematic Brand Showcase */}
        <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
          <div className="flex justify-center lg:justify-start">
            <AiVideoCameraLogo size="lg" />
          </div>

          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-indigo-950/80 border border-indigo-700/60 text-xs font-semibold text-indigo-300 shadow-lg shadow-indigo-950/50">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>AI TIMES · AI VIDEO MAKER</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1]">
              Welcome to{' '}
              <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-500 bg-clip-text text-transparent">
                AI TIMES
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
              Dream. Create. Beyond Limits. Request custom AI videos crafted from your story, characters, and reference photos.
            </p>
          </div>

          {/* Mini Gallery Showcase Preview Grid */}
          <div className="pt-2">
            <p className="text-[11px] uppercase font-bold tracking-wider text-slate-400 mb-3 flex items-center justify-center lg:justify-start gap-1.5">
              <Film className="w-3.5 h-3.5 text-indigo-400" />
              <span>What You Can Create in the Studio</span>
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-2xl mx-auto lg:mx-0">
              {previewShowcases.map((cat, idx) => (
                <div
                  key={idx}
                  className="group relative rounded-xl bg-[#090D18] border border-slate-800/80 overflow-hidden hover:border-indigo-500/50 transition-all duration-300 shadow-md"
                >
                  <div className="aspect-[4/3] w-full overflow-hidden bg-slate-900 relative">
                    <img
                      src={cat.image}
                      alt={cat.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-80 group-hover:opacity-100"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#090D18] via-transparent to-transparent" />
                  </div>
                  <div className="p-2 text-left">
                    <p className="text-[11px] font-bold text-white truncate">{cat.title}</p>
                    <span className="text-[9px] text-cyan-300 font-medium">{cat.badge}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Value Props */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 max-w-2xl mx-auto lg:mx-0 text-left">
            <div className="p-3 rounded-xl bg-[#090D18]/90 border border-slate-800/80 flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-950/80 border border-amber-700/60 flex items-center justify-center shrink-0 mt-0.5">
                <CreditCard className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Custom Pricing</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">The payment will be based on the video.</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#090D18]/90 border border-slate-800/80 flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-950/80 border border-indigo-700/60 flex items-center justify-center shrink-0 mt-0.5">
                <Zap className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Instant Access</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">No customer account or password needed</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#090D18]/90 border border-slate-800/80 flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-purple-950/80 border border-purple-700/60 flex items-center justify-center shrink-0 mt-0.5">
                <Mail className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Email Delivery</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Quotes &amp; finished videos sent straight to your inbox</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Simple Customer Welcome Card */}
        <div className="lg:col-span-5">
          <div className="bg-[#090E1B]/95 backdrop-blur-2xl border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-purple-950/40 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="space-y-6 relative z-10 text-center">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-indigo-950/60 border border-indigo-800/60 text-[11px] font-bold text-indigo-300 uppercase tracking-wider">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  <span>AI Video Studio</span>
                </div>
                <h2 className="text-3xl font-black text-white tracking-tight">
                  AI VIDEO MAKER
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Enter the studio to explore styles, upload reference photos, and submit your custom video request. The payment will be based on the video.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onSignIn}
                  className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 hover:from-indigo-500 hover:via-purple-500 hover:to-cyan-500 text-white font-black text-base tracking-wide flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer group"
                >
                  <span>SIGN IN</span>
                  <ArrowRight className="w-5 h-5 text-cyan-200 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              <div className="pt-4 border-t border-slate-800 text-center">
                <div className="flex items-center justify-center gap-3 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-cyan-400" /> Instant Studio Entry
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-indigo-400" /> Direct Email Video Delivery
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

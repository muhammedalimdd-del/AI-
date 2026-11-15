import React, { useState } from 'react';
import { AiVideoCameraLogo } from '../Brand/AiVideoCameraLogo.tsx';
import {
  registerCustomerAccount,
  loginCustomerAccount,
  requestPasswordReset,
  completePasswordReset
} from '../../services/deviceIdentity.ts';
import {
  Sparkles,
  ShieldCheck,
  Film,
  CreditCard,
  AlertCircle,
  Lock,
  User,
  UserPlus,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';

interface WelcomeScreenProps {
  onSuccess: (user: any) => void;
}

type AuthMode = 'welcome' | 'login' | 'register' | 'forgot';

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSuccess }) => {
  const [authMode, setAuthMode] = useState<AuthMode>('welcome');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Forgot password state
  const [forgotStep, setForgotStep] = useState<'request' | 'reset'>('request');
  const [resetCodeOrKey, setResetCodeOrKey] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [forgotPromptMsg, setForgotPromptMsg] = useState('');

  // Status & loading
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const resetMessages = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const openLoginScreen = () => {
    resetMessages();
    setUsername('');
    setPassword('');
    setShowPassword(false);
    setAuthMode('login');
  };

  const openRegisterScreen = () => {
    resetMessages();
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setRecoveryEmail('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setAuthMode('register');
  };

  const openForgotScreen = () => {
    resetMessages();
    setForgotStep('request');
    setResetCodeOrKey('');
    setNewPassword('');
    setConfirmNewPassword('');
    setForgotPromptMsg('');
    setAuthMode('forgot');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    const trimmedUser = username.trim();
    if (!trimmedUser || !password) {
      setErrorMessage('Incorrect username or password. Please try again.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await loginCustomerAccount({
        username: trimmedUser,
        password
      });
      setSuccessMessage('Login successful! Opening your account...');
      setTimeout(() => {
        onSuccess(result.user);
      }, 200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Incorrect username or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    const trimmedUser = username.trim();
    const trimmedEmail = recoveryEmail.trim().toLowerCase();

    if (!trimmedUser || trimmedUser.length < 2) {
      setErrorMessage('Please enter a name or username (at least 2 characters).');
      return;
    }
    if (!/^[a-zA-Z0-9_.\- ]+$/.test(trimmedUser)) {
      setErrorMessage('Name / Username may only contain letters, numbers, spaces, underscores, dots, and hyphens.');
      return;
    }
    if (trimmedEmail) {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(trimmedEmail)) {
        setErrorMessage('Please enter a valid recovery email address.');
        return;
      }
    }
    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please confirm your password.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await registerCustomerAccount({
        username: trimmedUser,
        password,
        confirmPassword,
        email: trimmedEmail || undefined
      });

      if (result.recoveryKey) {
        try {
          sessionStorage.setItem('aitimes_new_recovery_key', result.recoveryKey);
        } catch {}
      }

      setSuccessMessage('Account created successfully! Entering your studio...');
      setTimeout(() => {
        onSuccess(result.user);
      }, 200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!username.trim()) {
      setErrorMessage('Please enter your Name / Username.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await requestPasswordReset({
        username: username.trim(),
        email: recoveryEmail.trim() || undefined
      });
      setForgotPromptMsg(res.message);
      setForgotStep('reset');
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to start password reset.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteReset = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!resetCodeOrKey.trim()) {
      setErrorMessage('Please enter your 6-digit reset code or Recovery Key.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMessage('New passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const msg = await completePasswordReset({
        username: username.trim(),
        resetCodeOrKey: resetCodeOrKey.trim(),
        newPassword,
        confirmPassword: confirmNewPassword
      });
      setSuccessMessage(msg);
      setPassword('');
      setTimeout(() => {
        setAuthMode('login');
        setSuccessMessage('Password updated successfully. Please log in with your new password.');
      }, 600);
    } catch (err: any) {
      setErrorMessage(err.message || 'Password reset failed.');
    } finally {
      setIsLoading(false);
    }
  };

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
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-950/80 border border-indigo-700/60 text-xs font-semibold text-indigo-300 shadow-lg shadow-indigo-950/50">
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
                <User className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Private Accounts</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Your own isolated requests, quotes &amp; video deliveries</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#090D18]/90 border border-slate-800/80 flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-purple-950/80 border border-purple-700/60 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Secure Passwords</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Salted scrypt encryption for every account</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Authentication Card */}
        <div className="lg:col-span-5">
          <div className="bg-[#090E1B]/95 backdrop-blur-2xl border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-purple-950/40 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="space-y-6 relative z-10">
              {/* OPENING SCREEN */}
              {authMode === 'welcome' && (
                <div className="space-y-6 animate-fadeIn text-center">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-indigo-950/60 border border-indigo-800/60 text-[11px] font-bold text-indigo-300 uppercase tracking-wider">
                      <Lock className="w-3 h-3 text-cyan-400" />
                      <span>Customer Portal</span>
                    </div>
                    <h2 className="text-3xl font-black text-white tracking-tight">
                      AI VIDEO MAKER
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      Log in to request a custom AI video or track your projects. The payment will be based on the video.
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    <button
                      type="button"
                      onClick={openLoginScreen}
                      className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 hover:from-indigo-500 hover:via-purple-500 hover:to-cyan-500 text-white font-black text-base tracking-wide flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer group"
                    >
                      <Lock className="w-5 h-5 text-cyan-200" />
                      <span>LOG IN</span>
                      <ArrowRight className="w-4 h-4 text-cyan-300 group-hover:translate-x-1 transition-transform" />
                    </button>

                    <button
                      type="button"
                      onClick={openRegisterScreen}
                      className="w-full py-3.5 px-5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-indigo-500/60 text-slate-200 font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4 text-indigo-400" />
                      <span>First-Time Customer? Create Account</span>
                    </button>
                  </div>
                </div>
              )}

              {/* CUSTOMER LOGIN SCREEN (ONLY NAME/USERNAME AND PASSWORD) */}
              {authMode === 'login' && (
                <form onSubmit={handleLogin} className="space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between pb-1">
                    <button
                      type="button"
                      onClick={() => {
                        resetMessages();
                        setAuthMode('welcome');
                      }}
                      className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </button>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950/80 border border-cyan-700/60 px-2 py-0.5 rounded-full">
                      AI VIDEO MAKER
                    </span>
                  </div>

                  <div>
                    <h2 className="text-2xl font-black text-white tracking-tight">
                      Customer Login
                    </h2>
                    <p className="text-xs text-slate-300 mt-1">
                      Enter your username and password to access your private studio dashboard.
                    </p>
                  </div>

                  {errorMessage && (
                    <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-200 text-xs flex items-start gap-2.5 animate-fadeIn">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed font-semibold">{errorMessage}</span>
                    </div>
                  )}

                  {successMessage && (
                    <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2.5 animate-fadeIn">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{successMessage}</span>
                    </div>
                  )}

                  {/* Field 1: Name / Username */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-200">
                      Name / Username <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        autoComplete="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter your name or username"
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white placeholder-slate-500 text-sm outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Field 2: Password */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-200">
                        Password <span className="text-rose-400">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={openForgotScreen}
                        className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white placeholder-slate-500 text-sm outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Login Button */}
                  <div className="pt-2 space-y-3">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 hover:from-indigo-500 hover:via-purple-500 hover:to-cyan-500 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-75"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Logging in...</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 text-cyan-200" />
                          <span>Login</span>
                        </>
                      )}
                    </button>

                    <div className="text-center pt-1">
                      <button
                        type="button"
                        onClick={openRegisterScreen}
                        className="text-xs text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                      >
                        First-time customer? <span className="font-bold text-indigo-300 underline">Create New Account</span>
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* FIRST-TIME CUSTOMER REGISTRATION */}
              {authMode === 'register' && (
                <form onSubmit={handleCreateAccount} className="space-y-3.5 animate-fadeIn">
                  <div className="flex items-center justify-between pb-1">
                    <button
                      type="button"
                      onClick={() => {
                        resetMessages();
                        setAuthMode('welcome');
                      }}
                      className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </button>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 bg-indigo-950/80 border border-indigo-700/60 px-2 py-0.5 rounded-full">
                      First-Time Customer
                    </span>
                  </div>

                  <div>
                    <h2 className="text-2xl font-black text-white tracking-tight">
                      Create Your Account
                    </h2>
                    <p className="text-xs text-slate-300 mt-1">
                      Choose your own username and password. Your account stays completely private.
                    </p>
                  </div>

                  {errorMessage && (
                    <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-200 text-xs flex items-start gap-2.5 animate-fadeIn">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{errorMessage}</span>
                    </div>
                  )}

                  {successMessage && (
                    <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2.5 animate-fadeIn">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{successMessage}</span>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-200">
                      Name / Username <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <UserPlus className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        autoComplete="off"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Choose your own name or username"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white placeholder-slate-500 text-sm outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-200">
                      Create Password <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimum 6 characters"
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white placeholder-slate-500 text-sm outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-200">
                      Confirm Password <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password to confirm"
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white placeholder-slate-500 text-sm outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-300">
                      Recovery Email <span className="text-slate-500 font-normal">(Optional — for password reset)</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        value={recoveryEmail}
                        onChange={(e) => setRecoveryEmail(e.target.value)}
                        placeholder="Optional email for forgot-password codes"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white placeholder-slate-500 text-sm outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="pt-2 space-y-2.5">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 hover:from-indigo-500 hover:via-purple-500 hover:to-cyan-500 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-75"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Creating Account...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-cyan-200" />
                          <span>Create Account &amp; Enter Studio</span>
                        </>
                      )}
                    </button>

                    <div className="text-center">
                      <button
                        type="button"
                        onClick={openLoginScreen}
                        className="text-xs text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                      >
                        Already have an account? <span className="font-bold text-indigo-300 underline">Log In</span>
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* PASSWORD RESET FLOW */}
              {authMode === 'forgot' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between pb-1">
                    <button
                      type="button"
                      onClick={openLoginScreen}
                      className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Login</span>
                    </button>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-950/80 border border-amber-700/60 px-2 py-0.5 rounded-full">
                      Reset Password
                    </span>
                  </div>

                  <div>
                    <h2 className="text-2xl font-black text-white tracking-tight">
                      Password Recovery
                    </h2>
                    <p className="text-xs text-slate-300 mt-1">
                      Reset your password using your email verification code or personal Recovery Key.
                    </p>
                  </div>

                  {errorMessage && (
                    <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-200 text-xs flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {successMessage && (
                    <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{successMessage}</span>
                    </div>
                  )}

                  {forgotStep === 'request' ? (
                    <form onSubmit={handleRequestReset} className="space-y-3.5">
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-200">
                          Your Name / Username <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="Enter your account username"
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-indigo-500 text-white placeholder-slate-500 text-sm outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-300">
                          Email Used on Account / Requests <span className="text-slate-500 font-normal">(Optional)</span>
                        </label>
                        <input
                          type="email"
                          value={recoveryEmail}
                          onChange={(e) => setRecoveryEmail(e.target.value)}
                          placeholder="Enter email to receive a 6-digit code"
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-indigo-500 text-white placeholder-slate-500 text-sm outline-none"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3.5 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm cursor-pointer disabled:opacity-75"
                      >
                        {isLoading ? 'Checking Account...' : 'Continue Password Reset'}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleCompleteReset} className="space-y-3.5">
                      {forgotPromptMsg && (
                        <div className="p-3 rounded-xl bg-indigo-950/60 border border-indigo-800/70 text-xs text-indigo-200">
                          {forgotPromptMsg}
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-200">
                          6-Digit Email Code or Recovery Key <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={resetCodeOrKey}
                          onChange={(e) => setResetCodeOrKey(e.target.value)}
                          placeholder="Enter 6-digit code or AT-XXXX-XXXX-XXXX"
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-indigo-500 text-white placeholder-slate-500 text-sm font-mono outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-200">
                          New Password <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="password"
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Minimum 6 characters"
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-indigo-500 text-white placeholder-slate-500 text-sm outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-200">
                          Confirm New Password <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="password"
                          required
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          placeholder="Re-enter new password"
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-indigo-500 text-white placeholder-slate-500 text-sm outline-none"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3.5 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm cursor-pointer disabled:opacity-75"
                      >
                        {isLoading ? 'Updating Password...' : 'Save New Password'}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* Security info footer */}
              <div className="pt-4 border-t border-slate-800 text-center">
                <div className="flex items-center justify-center gap-3 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-cyan-400" /> Private Customer Accounts
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-indigo-400" /> Scrypt Password Protection
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

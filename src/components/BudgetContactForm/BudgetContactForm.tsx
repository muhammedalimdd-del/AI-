import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  CheckCircle2,
  AlertCircle,
  X,
  Image as ImageIcon,
  Check,
  Smartphone,
  Monitor,
  Square,
  Clock,
  ShieldCheck,
  Mail
} from 'lucide-react';
import { safeFetchJson, safeResponseJson } from '../../services/apiClient.ts';
import { getAuthHeaders } from '../../services/deviceIdentity.ts';

interface BudgetContactFormProps {
  onBackToHome?: () => void;
}

export const BudgetContactForm: React.FC<BudgetContactFormProps> = ({ onBackToHome }) => {
  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [videoIdea, setVideoIdea] = useState('');
  const [detailedMessage, setDetailedMessage] = useState('');
  const [preferredVideoType, setPreferredVideoType] = useState('cinematic');
  const [videoFormat, setVideoFormat] = useState<'portrait' | 'landscape' | 'square'>('portrait');
  const [preferredDuration, setPreferredDuration] = useState('30 seconds');
  const [customDuration, setCustomDuration] = useState('');

  // Project Scope State (No free option, no fixed pricing)
  const [budgetCategory, setBudgetCategory] = useState<'STANDARD' | 'CUSTOM'>('STANDARD');
  const [customBudgetAmount, setCustomBudgetAmount] = useState('');

  // Upload State
  const [referencePhotoUrl, setReferencePhotoUrl] = useState('');
  const [referencePhotoName, setReferencePhotoName] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Additional instructions
  const [additionalInstructions, setAdditionalInstructions] = useState('');

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<any | null>(null);

  const budgetOptions = [
    {
      id: 'STANDARD' as const,
      title: 'STANDARD VIDEO QUOTE',
      subtitle: 'Custom Studio Assessment',
      badge: 'Recommended',
      description: 'The payment will be based on the video. Our director reviews your idea and sends a tailored price before production starts.',
      tag: 'Video-Based Pricing'
    },
    {
      id: 'CUSTOM' as const,
      title: 'TARGET BUDGET NOTE',
      subtitle: 'Share Your Preferred Range',
      badge: 'Optional Target',
      description: 'Have a target production range in mind? Share it below as a guide while we prepare your custom video quote.',
      tag: 'Custom Range'
    }
  ];

  const videoTypes = [
    { id: 'realistic', label: 'Realistic' },
    { id: 'cinematic', label: 'Cinematic' },
    { id: 'cartoon', label: 'Cartoon' },
    { id: 'animation', label: 'Animation' },
    { id: 'travel', label: 'Travel' },
    { id: 'educational', label: 'Educational' },
    { id: 'custom', label: 'Custom' }
  ];

  const durations = ['10 seconds', '30 seconds', '1 minute', '3 minutes', 'custom'];

  const handlePhotoUpload = async (file: File) => {
    setUploadError(null);
    setIsUploadingPhoto(true);

    if (file.size > 15 * 1024 * 1024) {
      setUploadError('Image exceeds 15MB limit.');
      setIsUploadingPhoto(false);
      return;
    }

    try {
      let photoUrl: string | null = null;
      try {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: fd
        });
        const uploadParsed = await safeResponseJson<{ fileUrl?: string }>(res);
        if (uploadParsed.ok && uploadParsed.data?.fileUrl) {
          photoUrl = uploadParsed.data.fileUrl;
        }
      } catch {
        // Fallback preview below
      }

      if (!photoUrl) {
        photoUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Failed to read image locally.'));
          reader.readAsDataURL(file);
        });
      }

      setReferencePhotoUrl(photoUrl);
      setReferencePhotoName(file.name);
    } catch (e: any) {
      setUploadError(e.message || 'Failed to upload photo');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setSubmitError(null);

    if (!fullName.trim()) {
      setSubmitError('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setSubmitError('Please enter a valid email address.');
      return;
    }
    if (!videoIdea.trim()) {
      setSubmitError('Please describe your video idea.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        videoIdea: videoIdea.trim(),
        detailedMessage: detailedMessage.trim() || undefined,
        preferredVideoType,
        videoFormat,
        preferredDuration:
          preferredDuration === 'custom' ? customDuration || 'Custom' : preferredDuration,
        budgetCategory,
        customBudgetAmount:
          budgetCategory === 'CUSTOM' ? customBudgetAmount.trim() || undefined : undefined,
        referencePhotoUrl: referencePhotoUrl || undefined,
        referencePhotoName: referencePhotoName || undefined,
        additionalInstructions: additionalInstructions.trim() || undefined
      };

      const fetchResult = await safeFetchJson<{
        budgetRequest?: any;
        emailNotification?: any;
        message?: string;
        error?: string;
      }>('/api/budget-requests', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload)
      });

      if (!fetchResult.ok || !fetchResult.data?.budgetRequest) {
        throw new Error(
          fetchResult.data?.error ||
            fetchResult.error ||
            'Error submitting request. Please check your details and try again.'
        );
      }

      const budgetRequestData = {
        ...fetchResult.data.budgetRequest,
        emailNotification: fetchResult.data.emailNotification,
        notificationMessage: fetchResult.data.message
      };

      setSubmittedData(budgetRequestData);
      window.scrollTo({ top: 100, behavior: 'smooth' });
    } catch (err: any) {
      setSubmitError(err.message || 'Error submitting request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // SUCCESS SCREEN
  if (submittedData) {
    const gmailSubject = encodeURIComponent(
      `NEW AI VIDEO REQUEST — ${submittedData.fullName.toUpperCase()} — ${submittedData.id}`
    );
    const gmailBody = encodeURIComponent(
      [
        `NEW AI VIDEO REQUEST — ${submittedData.fullName.toUpperCase()} — ${submittedData.id}`,
        '============================================================',
        `Customer Name: ${submittedData.fullName}`,
        `Customer Email: ${submittedData.email}`,
        `Request ID: ${submittedData.id}`,
        `Submission Time: ${new Date(submittedData.createdAt).toUTCString()}`,
        `Preferred Video Type: ${submittedData.preferredVideoType}`,
        `Video Format: ${submittedData.videoFormat.toUpperCase()} (${submittedData.aspectRatio})`,
        `Preferred Duration: ${submittedData.preferredDuration}`,
        `Pricing Policy: The payment will be based on the video. (${submittedData.budgetAmount})`,
        '',
        'VIDEO IDEA:',
        submittedData.videoIdea,
        submittedData.detailedMessage ? `\nDETAILED MESSAGE:\n${submittedData.detailedMessage}` : '',
        submittedData.additionalInstructions
          ? `\nADDITIONAL INSTRUCTIONS:\n${submittedData.additionalInstructions}`
          : ''
      ]
        .filter(Boolean)
        .join('\n')
    );
    const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=muhammedalimdd@gmail.com&su=${gmailSubject}&body=${gmailBody}`;

    return (
      <div className="max-w-3xl mx-auto px-4 py-16 animate-fadeIn">
        <div className="rounded-3xl bg-[#090D16] border border-slate-800 shadow-2xl p-8 sm:p-12 text-center relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-40 bg-emerald-500/10 rounded-full blur-[90px] pointer-events-none" />

          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 p-[2px] mx-auto mb-6 shadow-xl shadow-emerald-500/20">
            <div className="w-full h-full bg-[#060911] rounded-[14px] flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
            Your Request Has Been Sent Successfully!
          </h2>

          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed mb-4">
            Thank you for sharing your video idea. Your request has been dispatched to{' '}
            <strong className="text-indigo-300 font-mono">muhammedalimdd@gmail.com</strong> and we will contact you at{' '}
            <strong className="text-white">{submittedData.email}</strong>.
          </p>

          {submittedData.emailNotification && (
            <div className="max-w-lg mx-auto mb-6 px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-center justify-center gap-2">
              <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                {submittedData.emailNotification.ownerNotificationSent || submittedData.emailNotification.sent
                  ? 'Automatic email notification delivered to muhammedalimdd@gmail.com.'
                  : submittedData.notificationMessage ||
                    'Request saved and queued for admin notification to muhammedalimdd@gmail.com.'}
              </span>
            </div>
          )}

          {/* Request ID & Pricing Notice Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto mb-8">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-left">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
                Assigned Request ID
              </span>
              <span className="font-mono font-bold text-lg text-indigo-300">
                {submittedData.id}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-left">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
                Pricing Policy
              </span>
              <span className="font-bold text-sm text-indigo-300">
                The payment will be based on the video.
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-800/50 text-xs text-indigo-200 text-left max-w-lg mx-auto mb-8 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-white font-semibold">Custom Video-Based Quote Pending</strong>
              <span>
                The payment will be based on the video. No payment has been charged through this form. The studio owner will review your creative idea and send your custom quote before production begins.
              </span>
            </div>
          </div>

          {/* Summary table */}
          <div className="rounded-2xl bg-[#0C1220] border border-slate-800 p-6 text-left mb-8 text-xs space-y-2 max-w-lg mx-auto">
            <div>
              <span className="text-slate-400">Recipient Studio Email:</span>{' '}
              <strong className="text-indigo-300 font-mono">muhammedalimdd@gmail.com</strong>
            </div>
            <div>
              <span className="text-slate-400">Customer:</span>{' '}
              <strong className="text-white">{submittedData.fullName}</strong> ({submittedData.email})
            </div>
            <div>
              <span className="text-slate-400">Preferred Type:</span>{' '}
              <span className="text-white capitalize">{submittedData.preferredVideoType}</span> · Format:{' '}
              <span className="text-white">{submittedData.videoFormat.toUpperCase()}</span> (
              {submittedData.aspectRatio})
            </div>
            <div>
              <span className="text-slate-400">Duration:</span>{' '}
              <span className="text-white">{submittedData.preferredDuration}</span>
            </div>
            <div className="pt-2 border-t border-slate-800">
              <span className="text-slate-400 block mb-1">Your Video Idea:</span>
              <p className="text-slate-300 italic">&ldquo;{submittedData.videoIdea}&rdquo;</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3">
            <a
              href={gmailComposeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs transition-colors flex items-center justify-center gap-2"
            >
              <Mail className="w-4 h-4" />
              <span>Send Direct Copy via Gmail (muhammedalimdd@gmail.com)</span>
            </a>
            <button
              onClick={() => {
                setSubmittedData(null);
                setVideoIdea('');
                setDetailedMessage('');
                setReferencePhotoUrl('');
              }}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Submit Another Video Idea &rarr;
            </button>
            {onBackToHome && (
              <button
                onClick={onBackToHome}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Return to Homepage
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <section id="budget-contact" className="py-12 sm:py-20 bg-[#060911]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-950/70 border border-indigo-800/60 text-indigo-300 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Direct Studio Contact &amp; Custom Quote Request</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Contact Us &amp; Request a Custom AI Video
          </h2>
          <p className="mt-3 text-sm text-slate-300 leading-relaxed">
            Have an idea for an AI video? Submit your concept directly to our studio director.{' '}
            <strong className="text-indigo-300">The payment will be based on the video.</strong>
          </p>
        </div>

        {/* Form Container */}
        <div className="rounded-3xl bg-[#090D16] border border-slate-800 shadow-2xl p-6 sm:p-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

          {submitError && (
            <div className="mb-6 p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs flex items-center gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* 1. Contact Information */}
            <div className="space-y-4">
              <h3 className="text-xs uppercase font-extrabold tracking-wider text-indigo-400">
                1. Your Contact Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                    Full Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    className="w-full px-4 py-3 bg-[#0C1220] border border-slate-800 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                    Email Address for Video Delivery <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full px-4 py-3 bg-[#0C1220] border border-slate-800 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
                    required
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    We&apos;ll email your custom quote, review updates, and completed video here.
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Video Idea & Detailed Message */}
            <div className="space-y-4 pt-4 border-t border-slate-800/80">
              <h3 className="text-xs uppercase font-extrabold tracking-wider text-indigo-400">
                2. Your Video Concept &amp; Message
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Video Idea <span className="text-rose-400">*</span>
                </label>
                <textarea
                  value={videoIdea}
                  onChange={(e) => setVideoIdea(e.target.value)}
                  rows={4}
                  placeholder="Describe your video idea in detail: what happens in the story, who the characters are, visual atmosphere, lighting, action beats, or desired mood..."
                  className="w-full px-4 py-3 bg-[#0C1220] border border-slate-800 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Detailed Message to Owner (Optional)
                </label>
                <textarea
                  value={detailedMessage}
                  onChange={(e) => setDetailedMessage(e.target.value)}
                  rows={2}
                  placeholder="Any background notes, target deadline, where you plan to publish, or personal context..."
                  className="w-full px-4 py-3 bg-[#0C1220] border border-slate-800 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* 3. Preferred Style, Format & Duration */}
            <div className="space-y-4 pt-4 border-t border-slate-800/80">
              <h3 className="text-xs uppercase font-extrabold tracking-wider text-indigo-400">
                3. Creative Specifications
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-2">
                  Preferred Video Type
                </label>
                <div className="flex flex-wrap gap-2">
                  {videoTypes.map((vt) => {
                    const isSelected = preferredVideoType === vt.id;
                    return (
                      <button
                        type="button"
                        key={vt.id}
                        onClick={() => setPreferredVideoType(vt.id)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                            : 'bg-[#0C1220] border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                        }`}
                      >
                        {vt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-2">
                  Video Format &amp; Canvas
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      id: 'portrait' as const,
                      label: 'PORTRAIT (9:16)',
                      sub: '1080 × 1920 · Shorts/Reels',
                      icon: Smartphone
                    },
                    {
                      id: 'landscape' as const,
                      label: 'LANDSCAPE (16:9)',
                      sub: '1920 × 1080 · YouTube/Cinema',
                      icon: Monitor
                    },
                    {
                      id: 'square' as const,
                      label: 'SQUARE (1:1)',
                      sub: '1080 × 1080 · Feed Post',
                      icon: Square
                    }
                  ].map((f) => {
                    const Icon = f.icon;
                    const isSelected = videoFormat === f.id;
                    return (
                      <button
                        type="button"
                        key={f.id}
                        onClick={() => setVideoFormat(f.id)}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                          isSelected
                            ? 'bg-indigo-950/70 border-indigo-500 text-white ring-1 ring-indigo-500'
                            : 'bg-[#0C1220] border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div
                          className={`p-2 rounded-lg ${
                            isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="block text-xs font-bold text-white">{f.label}</span>
                          <span className="text-[10px] text-slate-400">{f.sub}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  Preferred Video Duration
                </label>
                <div className="flex flex-wrap gap-2">
                  {durations.map((dur) => {
                    const isSelected = preferredDuration === dur;
                    return (
                      <button
                        type="button"
                        key={dur}
                        onClick={() => setPreferredDuration(dur)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                            : 'bg-[#0C1220] border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                        }`}
                      >
                        {dur}
                      </button>
                    );
                  })}
                </div>

                {preferredDuration === 'custom' && (
                  <div className="mt-2.5">
                    <input
                      type="text"
                      value={customDuration}
                      onChange={(e) => setCustomDuration(e.target.value)}
                      placeholder="Specify runtime (e.g. 45 seconds, 2 minutes, 5 minutes)"
                      className="w-full px-3 py-2 bg-[#0C1220] border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 4. PRICING & CUSTOM QUOTE WORKFLOW */}
            <div className="space-y-4 pt-4 border-t border-slate-800/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-xs uppercase font-extrabold tracking-wider text-indigo-400">
                  4. Video-Based Pricing
                </h3>
                <span className="text-[11px] text-slate-400">
                  No fixed prices · Quote sent after director review
                </span>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-900 border border-indigo-800/50 text-xs text-slate-300 leading-relaxed">
                <p className="font-semibold text-white mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  The payment will be based on the video.
                </p>
                Every custom AI video is quoted individually after reviewing your scenes, characters, duration, and visual finish. No payment is charged until you review and approve the custom quote.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {budgetOptions.map((opt) => {
                  const isSelected = budgetCategory === opt.id;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => setBudgetCategory(opt.id)}
                      className={`rounded-2xl border p-4 cursor-pointer transition-all flex flex-col justify-between relative group ${
                        isSelected
                          ? 'bg-gradient-to-b from-indigo-950/60 to-slate-900 border-indigo-500 shadow-xl shadow-indigo-950/50 ring-2 ring-indigo-500'
                          : 'bg-[#0C1220] border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            {opt.tag}
                          </span>

                          {isSelected && (
                            <span className="w-5 h-5 rounded-full flex items-center justify-center text-white bg-indigo-600">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </span>
                          )}
                        </div>

                        <div className="mb-2">
                          <h4 className="text-base font-extrabold text-white">{opt.title}</h4>
                          <p className="text-xs font-semibold text-indigo-300 mt-0.5">
                            {opt.subtitle}
                          </p>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed mb-3">
                          {opt.description}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                        <span>{opt.badge}</span>
                        <span className={isSelected ? 'text-indigo-400' : 'text-slate-500'}>
                          {isSelected ? 'Active Selection' : 'Click to Select'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {budgetCategory === 'CUSTOM' && (
                <div className="p-4 rounded-xl bg-[#0C1220] border border-slate-800 space-y-2 animate-fadeIn">
                  <label className="block text-xs font-semibold text-slate-200">
                    Optional Target Budget Note (for reference only)
                  </label>
                  <input
                    type="text"
                    value={customBudgetAmount}
                    onChange={(e) => setCustomBudgetAmount(e.target.value)}
                    placeholder="e.g. Flexible, or your estimated budget range"
                    className="w-full px-4 py-2.5 bg-[#090D16] border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}
            </div>

            {/* 5. Optional Reference Photo Upload */}
            <div className="space-y-3 pt-4 border-t border-slate-800/80">
              <h3 className="text-xs uppercase font-extrabold tracking-wider text-indigo-400">
                5. Reference Photo (Optional)
              </h3>
              <p className="text-xs text-slate-400">
                Have a visual reference, character look, product photo, or storyboard sketch? Upload it here (JPG, PNG, WebP up to 15MB).
              </p>

              {uploadError && (
                <p className="text-xs text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {uploadError}
                </p>
              )}

              {referencePhotoUrl ? (
                <div className="flex items-center gap-4 p-3 rounded-xl bg-[#0C1220] border border-slate-800 max-w-md">
                  <img
                    src={referencePhotoUrl}
                    alt="Uploaded reference"
                    className="w-16 h-16 rounded-lg object-cover border border-slate-700"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">
                      {referencePhotoName || 'reference-photo.jpg'}
                    </p>
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="w-3 h-3" /> Attached securely
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setReferencePhotoUrl('');
                      setReferencePhotoName('');
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-slate-700 hover:border-indigo-500 bg-[#0C1220] hover:bg-indigo-950/20 cursor-pointer transition-all max-w-md">
                  <ImageIcon className="w-5 h-5 text-indigo-400 shrink-0" />
                  <div className="text-xs text-slate-300 flex-1">
                    {isUploadingPhoto ? (
                      <span className="text-indigo-400 animate-pulse">
                        Uploading reference photo...
                      </span>
                    ) : (
                      <span>Click to upload optional reference image</span>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handlePhotoUpload(e.target.files[0]);
                    }}
                  />
                </label>
              )}
            </div>

            {/* 6. Additional Instructions */}
            <div className="space-y-3 pt-4 border-t border-slate-800/80">
              <h3 className="text-xs uppercase font-extrabold tracking-wider text-indigo-400">
                6. Additional Instructions (Optional)
              </h3>
              <textarea
                value={additionalInstructions}
                onChange={(e) => setAdditionalInstructions(e.target.value)}
                rows={2}
                placeholder="Any special notes regarding audio, color grading, pacing, or delivery format..."
                className="w-full px-4 py-3 bg-[#0C1220] border border-slate-800 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-6 border-t border-slate-800 flex flex-col items-center gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full sm:w-auto px-10 py-4 rounded-xl text-sm font-bold text-white shadow-xl transition-all flex items-center justify-center gap-2.5 cursor-pointer ${
                  isSubmitting
                    ? 'bg-slate-700 opacity-75 cursor-not-allowed'
                    : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98]'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Transmitting Request &amp; Dispatching Notifications...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-cyan-300" />
                    <span>Send Video Idea &amp; Request Review &rarr;</span>
                  </>
                )}
              </button>

              <p className="text-[11px] text-slate-400 text-center max-w-md">
                The payment will be based on the video. Dispatches your concept directly to our studio director for custom quote review.
              </p>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};

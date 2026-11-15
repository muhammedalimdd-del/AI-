import React, { useState, useEffect } from 'react';
import {
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  Video,
  Download,
  ArrowLeft,
  MessageSquare,
  ExternalLink,
  CreditCard,
  XCircle
} from 'lucide-react';
import { safeFetchJson } from '../services/apiClient.ts';
import {
  getAuthHeaders,
  getSubmittedReceipts,
  saveSubmittedReceipt,
  SubmittedReceipt
} from '../services/deviceIdentity.ts';

interface CustomerTrackerProps {
  initialRequestId?: string;
  initialToken?: string;
  onBack: () => void;
}

export const CustomerTracker: React.FC<CustomerTrackerProps> = ({
  initialRequestId,
  initialToken,
  onBack
}) => {
  const [requestId, setRequestId] = useState(initialRequestId || '');
  const [emailOrToken, setEmailOrToken] = useState(initialToken || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestData, setRequestData] = useState<any | null>(null);
  const [recentReceipts, setRecentReceipts] = useState<SubmittedReceipt[]>(() =>
    getSubmittedReceipts()
  );

  // Quote accept / decline state
  const [quoteActionLoading, setQuoteActionLoading] = useState<'accept' | 'decline' | null>(null);
  const [quoteActionNotice, setQuoteActionNotice] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Customer clarification response state
  const [replyMessage, setReplyMessage] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [replySuccess, setReplySuccess] = useState<string | null>(null);
  const [replyError, setReplyError] = useState<string | null>(null);

  // Auto-fetch if initial props are provided
  useEffect(() => {
    if (initialRequestId && initialToken) {
      handleLookup(initialRequestId, initialToken);
    }
  }, [initialRequestId, initialToken]);

  const handleLookup = async (idToLook: string, keyToLook: string) => {
    if (!idToLook.trim() || !keyToLook.trim()) {
      setError('Please provide both your Request ID and your delivery email or tracking token.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await safeFetchJson<{ request?: any; error?: string }>('/api/requests/track', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          requestId: idToLook.trim(),
          emailOrToken: keyToLook.trim()
        })
      });

      if (!result.ok || !result.data?.request) {
        throw new Error(
          result.data?.error ||
            result.error ||
            'Request not found or access denied. Verify your Request ID, email, or secret token.'
        );
      }

      setRequestData(result.data.request);
      saveSubmittedReceipt({
        id: result.data.request.id,
        accessToken: result.data.request.accessToken || '',
        title: result.data.request.title || 'Custom Video Request',
        customerEmail: result.data.request.customerEmail || '',
        createdAt: result.data.request.createdAt || new Date().toISOString()
      });
      setRecentReceipts(getSubmittedReceipts());
    } catch (e: any) {
      setError(e.message || 'Failed to locate request.');
      setRequestData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuoteAction = async (action: 'accept' | 'decline') => {
    if (!requestData || quoteActionLoading) return;
    setQuoteActionLoading(action);
    setQuoteActionNotice(null);

    try {
      const result = await safeFetchJson<{ request?: any; error?: string }>(
        `/api/requests/${requestData.id}/quote-action`,
        {
          method: 'POST',
          headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            action,
            token: requestData.accessToken,
            customerEmail: requestData.customerEmail
          })
        }
      );

      if (!result.ok || !result.data?.request) {
        throw new Error(result.data?.error || result.error || 'Could not update quote response.');
      }

      setRequestData(result.data.request);
      setQuoteActionNotice({
        type: 'success',
        text:
          action === 'accept'
            ? 'Quote accepted! We will verify payment and begin production shortly.'
            : 'Quote declined. The studio team has been notified.'
      });
    } catch (e: any) {
      setQuoteActionNotice({
        type: 'error',
        text: e.message || 'Failed to respond to quote.'
      });
    } finally {
      setQuoteActionLoading(null);
    }
  };

  const handleSendClarificationReply = async () => {
    if (!replyMessage.trim() || !requestData) return;

    setIsSendingReply(true);
    setReplySuccess(null);
    setReplyError(null);

    try {
      const result = await safeFetchJson<{ error?: string }>(
        `/api/requests/${requestData.id}/customer-message`,
        {
          method: 'POST',
          headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            message: replyMessage.trim(),
            token: requestData.accessToken,
            email: requestData.customerEmail
          })
        }
      );

      if (!result.ok) {
        throw new Error(result.data?.error || result.error || 'Failed to submit response.');
      }

      setReplyMessage('');
      setReplySuccess('Your reply has been forwarded directly to the studio director!');
      handleLookup(requestData.id, requestData.accessToken || requestData.customerEmail);
    } catch (e: any) {
      setReplyError(e.message || 'Error submitting response.');
    } finally {
      setIsSendingReply(false);
    }
  };

  const getStatusStepIndex = (status: string): number => {
    switch (status) {
      case 'Submitted':
        return 0;
      case 'Under Review':
        return 1;
      case 'Awaiting Customer Information':
        return 1;
      case 'Approved':
        return 2;
      case 'In Production':
        return 3;
      case 'Quality Check':
        return 4;
      case 'Completed':
        return 5;
      case 'Delivered':
        return 6;
      case 'Cancelled':
        return -1;
      default:
        return 0;
    }
  };

  const statusMilestones = [
    'Submitted',
    'Under Review',
    'Approved',
    'In Production',
    'Quality Check',
    'Completed',
    'Delivered'
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fadeIn">
      {/* Top navigation */}
      <button
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Homepage</span>
      </button>

      {/* Header card */}
      <div className="rounded-3xl bg-[#090D16] border border-slate-800 p-6 sm:p-10 mb-8 shadow-2xl relative overflow-hidden">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-indigo-950/80 border border-indigo-800/80 text-indigo-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Track Your Video Request
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Check real-time production status, review studio notes, and download your finished video.
            </p>
          </div>
        </div>

        {/* Lookup form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLookup(requestId, emailOrToken);
          }}
          className="mt-6 pt-6 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-12 gap-3"
        >
          <div className="sm:col-span-5">
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Request ID
            </label>
            <input
              type="text"
              value={requestId}
              onChange={(e) => setRequestId(e.target.value)}
              placeholder="e.g. VR-2026-8941"
              className="w-full px-3.5 py-2.5 bg-[#0C1220] border border-slate-800 rounded-xl text-white text-xs font-mono uppercase focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div className="sm:col-span-5">
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Delivery Email or Secret Token
            </label>
            <input
              type="text"
              value={emailOrToken}
              onChange={(e) => setEmailOrToken(e.target.value)}
              placeholder="e.g. yourname@gmail.com or sec_..."
              className="w-full px-3.5 py-2.5 bg-[#0C1220] border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div className="sm:col-span-2 flex items-end">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  <span>Look Up</span>
                </>
              )}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Recent Requests on This Browser */}
        {recentReceipts.length > 0 && (
          <div className="mt-5 pt-4 border-t border-slate-800/80">
            <p className="text-[11px] uppercase font-bold tracking-wider text-slate-400 mb-2">
              Recent Requests Submitted From This Browser
            </p>
            <div className="flex flex-wrap gap-2">
              {recentReceipts.map((rec) => (
                <button
                  key={rec.id}
                  type="button"
                  onClick={() => {
                    const key = rec.accessToken || rec.customerEmail;
                    setRequestId(rec.id);
                    setEmailOrToken(key);
                    handleLookup(rec.id, key);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#0C1220] hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/60 text-xs text-slate-200 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <span className="font-mono font-bold text-indigo-400">{rec.id}</span>
                  <span className="text-slate-400 truncate max-w-[160px]">{rec.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Request Details View */}
      {requestData && (
        <div className="space-y-6">
          {/* Status Header Banner */}
          <div className="rounded-2xl bg-[#090D16] border border-slate-800 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
              <div>
                <span className="text-xs font-mono text-indigo-400 font-bold uppercase tracking-wider block mb-1">
                  {requestData.id}
                </span>
                <h3 className="text-xl sm:text-2xl font-extrabold text-white">
                  {requestData.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Submitted on {new Date(requestData.createdAt).toLocaleDateString()} at{' '}
                  {new Date(requestData.createdAt).toLocaleTimeString()}
                </p>
              </div>

              <div className="flex flex-col sm:items-end">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">
                  Current Status
                </span>
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-950/80 border border-indigo-700/80 text-indigo-300 font-bold text-xs">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  {requestData.status}
                </span>
              </div>
            </div>

            {/* Production Milestones Bar */}
            <div className="mt-8">
              <span className="text-xs font-semibold text-slate-400 block mb-4">
                Milestone Progress
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-7 gap-2">
                {statusMilestones.map((milestone, idx) => {
                  const currentIdx = getStatusStepIndex(requestData.status);
                  const isDone = currentIdx >= idx;
                  const isCurrent = currentIdx === idx;
                  return (
                    <div
                      key={milestone}
                      className={`p-2.5 rounded-xl border text-center text-xs transition-all ${
                        isCurrent
                          ? 'bg-indigo-600/30 border-indigo-500 text-white font-bold ring-1 ring-indigo-500'
                          : isDone
                          ? 'bg-slate-900 border-slate-700 text-slate-200'
                          : 'bg-[#060911] border-slate-900 text-slate-600'
                      }`}
                    >
                      <div className="text-[10px] text-slate-500 font-mono mb-0.5">
                        0{idx + 1}
                      </div>
                      <div className="truncate">{milestone}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Turnaround & Studio Notes */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[#0C1220] border border-slate-800 text-xs">
                <span className="text-slate-400 block mb-1">Estimated Completion Date:</span>
                <span className="text-white font-semibold text-sm">
                  {requestData.estimatedCompletionDate || 'Under evaluation by production staff'}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-[#0C1220] border border-slate-800 text-xs">
                <span className="text-slate-400 block mb-1">Studio Director Updates:</span>
                <span className="text-indigo-200 leading-relaxed block">
                  {requestData.customerVisibleNotes ||
                    'No notes currently posted. Your brief is progressing according to schedule.'}
                </span>
              </div>
            </div>
          </div>

          {/* CUSTOM QUOTE APPROVAL PANEL */}
          {requestData.quote && (
            <div className="rounded-2xl bg-gradient-to-b from-indigo-950/50 to-[#090D16] border border-indigo-700/70 p-6 sm:p-8 space-y-4 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-800/40">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-900/60 text-indigo-300">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">Custom Studio Quote</h4>
                    <p className="text-xs text-slate-400">The payment will be based on the video.</p>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase ${
                    requestData.quote.status === 'accepted'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                      : requestData.quote.status === 'declined'
                      ? 'bg-rose-950 text-rose-300 border border-rose-700'
                      : 'bg-cyan-950 text-cyan-300 border border-cyan-700'
                  }`}
                >
                  {requestData.quote.status === 'accepted'
                    ? 'Accepted'
                    : requestData.quote.status === 'declined'
                    ? 'Declined'
                    : 'Awaiting Your Response'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-[#0C1220] border border-slate-800">
                  <span className="text-slate-400 block mb-1">Proposed Production Cost:</span>
                  <span className="text-2xl font-black text-white">
                    {requestData.quote.formattedAmount || `${requestData.quote.currency || ''}${requestData.quote.amount}`}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#0C1220] border border-slate-800">
                  <span className="text-slate-400 block mb-1">Scope &amp; Deliverables:</span>
                  <span className="text-slate-200 leading-relaxed block">
                    {requestData.quote.breakdown || 'Custom AI video production and final delivery.'}
                  </span>
                </div>
              </div>

              {quoteActionNotice && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    quoteActionNotice.type === 'success'
                      ? 'bg-emerald-950/60 border-emerald-700 text-emerald-200'
                      : 'bg-rose-950/60 border-rose-700 text-rose-200'
                  }`}
                >
                  {quoteActionNotice.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{quoteActionNotice.text}</span>
                </div>
              )}

              {requestData.quote.status === 'sent' && (
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    disabled={quoteActionLoading !== null}
                    onClick={() => handleQuoteAction('accept')}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{quoteActionLoading === 'accept' ? 'Accepting...' : 'Accept Custom Quote'}</span>
                  </button>

                  {requestData.quote.paymentLink && (
                    <a
                      href={requestData.quote.paymentLink}
                      target="_blank"
                      rel="noreferrer"
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Open Payment Link</span>
                    </a>
                  )}

                  <button
                    type="button"
                    disabled={quoteActionLoading !== null}
                    onClick={() => handleQuoteAction('decline')}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-950 border border-slate-700 hover:border-rose-800 disabled:opacity-60 text-slate-300 hover:text-rose-200 font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>{quoteActionLoading === 'decline' ? 'Declining...' : 'Decline Quote'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* COMPLETED VIDEO DELIVERY SECTION */}
          {(requestData.completedVideo?.directLink || requestData.completedVideo?.downloadUrl || requestData.completedVideo?.url) && (
            <div className="rounded-2xl bg-gradient-to-b from-emerald-950/40 to-slate-900 border border-emerald-800/60 p-6 sm:p-8 animate-fadeIn">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-emerald-900/60 text-emerald-400">
                  <Video className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white">Your Video Is Ready!</h4>
                  <p className="text-xs text-emerald-300">
                    Production and quality verification are complete.
                  </p>
                </div>
              </div>

              {requestData.completedVideo.message && (
                <div className="p-4 rounded-xl bg-black/40 border border-emerald-900/40 text-xs text-slate-200 mb-6 leading-relaxed">
                  <strong>Studio Message:</strong> {requestData.completedVideo.message}
                </div>
              )}

              <div className="mb-6 rounded-xl overflow-hidden bg-black border border-slate-800 max-w-xl mx-auto shadow-2xl">
                <video
                  controls
                  className="w-full max-h-[450px] object-contain"
                  src={
                    requestData.completedVideo.directLink ||
                    requestData.completedVideo.downloadUrl ||
                    requestData.completedVideo.url
                  }
                >
                  Your browser does not support the video tag.
                </video>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-4">
                <a
                  href={
                    requestData.completedVideo.directLink ||
                    requestData.completedVideo.downloadUrl ||
                    requestData.completedVideo.url
                  }
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Download High-Definition Video</span>
                </a>

                <a
                  href={
                    requestData.completedVideo.directLink ||
                    requestData.completedVideo.downloadUrl ||
                    requestData.completedVideo.url
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-2 transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open Video in New Tab</span>
                </a>
              </div>
            </div>
          )}

          {/* Interactive Clarification Thread */}
          <div className="rounded-2xl bg-[#090D16] border border-slate-800 p-6 sm:p-8">
            <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              Production Clarifications &amp; Questions
            </h4>
            <p className="text-xs text-slate-400 mb-6">
              If the director needs extra details on characters or scenes, you can respond directly here.
            </p>

            {requestData.clarifications?.length > 0 ? (
              <div className="space-y-3 mb-6">
                {requestData.clarifications.map((item: any) => (
                  <div
                    key={item.id}
                    className={`p-4 rounded-xl text-xs max-w-xl ${
                      item.from === 'admin'
                        ? 'bg-indigo-950/60 border border-indigo-800/80 text-white mr-auto'
                        : 'bg-slate-800 border border-slate-700 text-slate-200 ml-auto'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span className="font-semibold text-indigo-300">
                        {item.from === 'admin' ? 'Studio Director' : 'You (Customer)'}
                      </span>
                      <span>
                        {new Date(item.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <p className="leading-relaxed">{item.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#0C1220] border border-slate-800/80 text-xs text-slate-500 mb-6 text-center">
                No clarification messages currently pending. Everything in your brief is clear.
              </div>
            )}

            {/* Reply Input Form */}
            <div className="pt-4 border-t border-slate-800">
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Send a Message or Clarification to the Studio
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Type your response or additional instruction..."
                  className="flex-1 px-4 py-2.5 bg-[#0C1220] border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  disabled={isSendingReply || !replyMessage.trim()}
                  onClick={handleSendClarificationReply}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {isSendingReply ? 'Sending...' : 'Send Reply'}
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>

              {replyError && (
                <p className="text-xs text-rose-400 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {replyError}
                </p>
              )}

              {replySuccess && (
                <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {replySuccess}
                </p>
              )}
            </div>
          </div>

          {/* Brief Summary Recap */}
          <div className="rounded-2xl bg-[#090D16] border border-slate-800 p-6 sm:p-8 text-xs space-y-4">
            <h4 className="text-sm font-bold text-white pb-3 border-b border-slate-800">
              Registered Brief Summary
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-slate-400 block mb-1">Visual Style:</span>
                <span className="text-white font-semibold">{requestData.style}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Format:</span>
                <span className="text-white font-semibold">
                  {requestData.format.toUpperCase()} ({requestData.aspectRatio})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Duration:</span>
                <span className="text-white font-semibold">{requestData.duration}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Payment Policy:</span>
                <span className="text-indigo-300 font-semibold">
                  The payment will be based on the video.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

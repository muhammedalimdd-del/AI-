import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  RefreshCw,
  Send,
  Upload,
  Video,
  Mail,
  ExternalLink,
  X,
  Sparkles,
  AlertCircle,
  CreditCard,
  UserCheck,
  RotateCcw,
  Key,
  CheckCircle2,
  Eye,
  EyeOff
} from 'lucide-react';
import { VideoStatus } from '../../types/client.ts';
import { safeFetchJson, safeResponseJson } from '../../services/apiClient.ts';

interface AdminDashboardProps {
  onClose: () => void;
}

const ADMIN_TOKEN_KEY = 'studio_admin_token';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
  const [adminToken, setAdminToken] = useState<string>(() => {
    try {
      return localStorage.getItem(ADMIN_TOKEN_KEY) || '';
    } catch {
      return '';
    }
  });
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [isInitialized, setIsInitialized] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Admin Login / One-Time Bootstrap State (zero hardcoded passwords)
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Navigation tabs (removed Free Trials & Firebase Database tabs)
  const [activeTab, setActiveTab] = useState<'requests' | 'users' | 'budget' | 'emails' | 'settings'>('requests');

  // Inline notification banner (replaces browser alert dialogs)
  const [dashboardNotice, setDashboardNotice] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const showNotice = (type: 'success' | 'error', text: string) => {
    setDashboardNotice({ type, text });
    setTimeout(() => {
      setDashboardNotice((prev) => (prev?.text === text ? null : prev));
    }, 6000);
  };

  // Video Requests state
  const [requests, setRequests] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    total: 0,
    paid: 0,
    awaitingReview: 0,
    awaitingCustomerQuoteApproval: 0,
    inProduction: 0,
    completed: 0,
    failedEmails: 0
  });
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);

  // Selected Video Request modal / drawer
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // Edit / Action fields inside Video Request Drawer
  const [statusToSet, setStatusToSet] = useState<VideoStatus>('Under Review');
  const [estDateToSet, setEstDateToSet] = useState('');
  const [customerNotesToSet, setCustomerNotesToSet] = useState('');
  const [newInternalNote, setNewInternalNote] = useState('');
  const [videoDeliveryUrl, setVideoDeliveryUrl] = useState('');
  const [uploadedVideoFilename, setUploadedVideoFilename] = useState('');
  const [uploadedVideoSize, setUploadedVideoSize] = useState<number | undefined>(undefined);
  const [deliveryMessage, setDeliveryMessage] = useState(
    'Your AI video has been produced and quality checked.'
  );
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [isSendingVideo, setIsSendingVideo] = useState(false);

  // Custom Quote & Payment Fields
  const [quoteAmount, setQuoteAmount] = useState<number>(1500);
  const [quoteCurrency, setQuoteCurrency] = useState<string>('₹');
  const [quoteBreakdown, setQuoteBreakdown] = useState<string>(
    'Comprehensive scene generation, character likeness consistency, and professional audio/color grading'
  );
  const [quoteValidUntil, setQuoteValidUntil] = useState<string>('');
  const [quotePaymentLink, setQuotePaymentLink] = useState<string>('');
  const [transactionRefInput, setTransactionRefInput] = useState<string>('');
  const [isSendingQuote, setIsSendingQuote] = useState<boolean>(false);

  // Customer Accounts & Audit logs state
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');

  // Idea & Budget Requests state
  const [budgetRequests, setBudgetRequests] = useState<any[]>([]);
  const [selectedBudgetRequest, setSelectedBudgetRequest] = useState<any | null>(null);
  const [budgetReplyMessage, setBudgetReplyMessage] = useState('');
  const [isSendingBudgetReply, setIsSendingBudgetReply] = useState(false);

  // Email Logs State
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [previewEmailLog, setPreviewEmailLog] = useState<any | null>(null);
  const [retryingLogId, setRetryingLogId] = useState<string | null>(null);
  const [isResendingOwnerEmail, setIsResendingOwnerEmail] = useState(false);

  // Email Testing & Configuration States
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{
    success: boolean;
    recipient: string;
    subject: string;
    message: string;
    error?: string;
  } | null>(null);

  // Studio Settings Form State
  const [settings, setSettings] = useState<any>(null);
  const [settingsOwnerEmail, setSettingsOwnerEmail] = useState('muhammedalimdd@gmail.com');
  const [settingsFromEmail, setSettingsFromEmail] = useState('muhammedalimdd@gmail.com');
  const [settingsProvider, setSettingsProvider] = useState<'gmail' | 'smtp' | 'resend' | 'sendgrid'>('gmail');
  const [settingsSmtpHost, setSettingsSmtpHost] = useState('smtp.gmail.com');
  const [settingsSmtpPort, setSettingsSmtpPort] = useState(465);
  const [settingsSmtpSecure, setSettingsSmtpSecure] = useState(true);
  const [settingsSmtpUser, setSettingsSmtpUser] = useState('muhammedalimdd@gmail.com');
  const [settingsSmtpPass, setSettingsSmtpPass] = useState('');
  const [settingsApiKey, setSettingsApiKey] = useState('');
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Change Admin Password Form State
  const [currentAdminPw, setCurrentAdminPw] = useState('');
  const [newAdminPw, setNewAdminPw] = useState('');
  const [confirmNewAdminPw, setConfirmNewAdminPw] = useState('');
  const [isChangingPw, setIsChangingPw] = useState(false);
  const [changePwNotice, setChangePwNotice] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const getAdminHeaders = (token = adminToken, extra?: Record<string, string>) => ({
    ...(extra || {}),
    Authorization: `Bearer ${token}`,
    'x-session-token': token
  });

  // On mount: validate stored token via /api/admin/session or check /api/admin/bootstrap-status
  useEffect(() => {
    let active = true;
    const initAdminAuth = async () => {
      setIsCheckingAuth(true);
      try {
        if (adminToken) {
          const sessionRes = await safeFetchJson<{ success?: boolean; user?: any }>(
            '/api/admin/session',
            { headers: getAdminHeaders(adminToken) }
          );
          if (!active) return;
          if (sessionRes.ok && sessionRes.data?.user?.role === 'admin') {
            setIsAuthenticated(true);
            setIsInitialized(true);
            setIsCheckingAuth(false);
            loadData(adminToken);
            return;
          }
          try {
            localStorage.removeItem(ADMIN_TOKEN_KEY);
          } catch {}
          setAdminToken('');
        }

        const statusRes = await safeFetchJson<{ initialized?: boolean }>('/api/admin/bootstrap-status');
        if (!active) return;
        setIsInitialized(statusRes.data?.initialized !== false);
        setIsAuthenticated(false);
      } catch {
        if (active) setIsAuthenticated(false);
      } finally {
        if (active) setIsCheckingAuth(false);
      }
    };
    initAdminAuth();
    return () => {
      active = false;
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoggingIn) return;
    setLoginError(null);

    if (!usernameInput.trim() || !passwordInput) {
      setLoginError('Please enter your admin username and password.');
      return;
    }

    setIsLoggingIn(true);
    try {
      const res = await safeFetchJson<{
        success?: boolean;
        token?: string;
        user?: any;
        error?: string;
      }>('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: usernameInput.trim(),
          password: passwordInput
        })
      });

      if (!res.ok || !res.data?.token) {
        throw new Error(res.data?.error || res.error || 'Incorrect admin username or password.');
      }

      const token = res.data.token;
      setAdminToken(token);
      try {
        localStorage.setItem(ADMIN_TOKEN_KEY, token);
      } catch {}
      setIsAuthenticated(true);
      setPasswordInput('');
      loadData(token);
    } catch (err: any) {
      setLoginError(err.message || 'Incorrect admin username or password.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleInitialSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoggingIn) return;
    setLoginError(null);

    if (!passwordInput || passwordInput.length < 8) {
      setLoginError('Please create an admin password of at least 8 characters.');
      return;
    }
    if (passwordInput !== confirmPasswordInput) {
      setLoginError('Passwords do not match.');
      return;
    }

    setIsLoggingIn(true);
    try {
      const res = await safeFetchJson<{
        success?: boolean;
        token?: string;
        user?: any;
        error?: string;
      }>('/api/admin/setup-initial-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: passwordInput,
          confirmPassword: confirmPasswordInput
        })
      });

      if (!res.ok || !res.data?.token) {
        throw new Error(res.data?.error || res.error || 'Failed to initialize admin password.');
      }

      const token = res.data.token;
      setAdminToken(token);
      try {
        localStorage.setItem(ADMIN_TOKEN_KEY, token);
      } catch {}
      setIsInitialized(true);
      setIsAuthenticated(true);
      setPasswordInput('');
      setConfirmPasswordInput('');
      loadData(token);
    } catch (err: any) {
      setLoginError(err.message || 'Failed to initialize admin password.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleAdminLogout = async () => {
    if (adminToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: getAdminHeaders(adminToken)
        });
      } catch {}
    }
    try {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
    } catch {}
    setAdminToken('');
    setIsAuthenticated(false);
    setSelectedRequest(null);
    setSelectedBudgetRequest(null);
  };

  const loadData = async (token = adminToken, filterOverride?: string) => {
    if (!token) return;
    setIsLoading(true);
    const activeFilter = filterOverride !== undefined ? filterOverride : statusFilter;

    try {
      const headers = getAdminHeaders(token);
      const [reqRes, bgtRes, emlRes, setRes, usrRes, audRes] = await Promise.all([
        fetch(`/api/admin/requests?filter=${encodeURIComponent(activeFilter)}`, { headers }),
        fetch('/api/admin/budget-requests?filter=all', { headers }),
        fetch('/api/admin/email-logs', { headers }),
        fetch('/api/admin/settings', { headers }),
        fetch('/api/admin/users', { headers }),
        fetch('/api/admin/audit-logs', { headers })
      ]);

      if (reqRes.status === 401 || reqRes.status === 403) {
        handleAdminLogout();
        return;
      }

      const [parsedReq, parsedBgt, parsedEml, parsedSet, parsedUsr, parsedAud] = await Promise.all([
        safeResponseJson<any>(reqRes),
        safeResponseJson<any>(bgtRes),
        safeResponseJson<any>(emlRes),
        safeResponseJson<any>(setRes),
        safeResponseJson<any>(usrRes),
        safeResponseJson<any>(audRes)
      ]);

      if (parsedReq.ok && parsedReq.data) {
        setRequests(parsedReq.data.requests || []);
        if (parsedReq.data.stats) setStats(parsedReq.data.stats);
      }
      if (parsedBgt.ok && parsedBgt.data) {
        setBudgetRequests(parsedBgt.data.budgetRequests || []);
      }
      if (parsedEml.ok && parsedEml.data) {
        setEmailLogs(parsedEml.data.emailLogs || []);
      }
      if (parsedSet.ok && parsedSet.data) {
        setSettings(parsedSet.data.settings);
        const st = parsedSet.data;
        if (st.settings) {
          setSettingsOwnerEmail(st.settings.ownerNotificationEmail || 'muhammedalimdd@gmail.com');
          setSettingsFromEmail(st.settings.emailFromAddress || 'muhammedalimdd@gmail.com');
          setSettingsProvider(st.settings.emailProvider || 'gmail');
          setSettingsSmtpHost(st.settings.smtpHost || 'smtp.gmail.com');
          setSettingsSmtpPort(st.settings.smtpPort || 465);
          setSettingsSmtpSecure(st.settings.smtpSecure !== undefined ? st.settings.smtpSecure : true);
          setSettingsSmtpUser(
            st.settings.smtpUser || st.settings.ownerNotificationEmail || 'muhammedalimdd@gmail.com'
          );
          setSettingsSmtpPass(st.settings.smtpPass || '');
          setSettingsApiKey(st.settings.apiKey || '');
        }
      }
      if (parsedUsr.ok && parsedUsr.data) {
        setUsers(parsedUsr.data.users || []);
      }
      if (parsedAud.ok && parsedAud.data) {
        setAuditLogs(parsedAud.data.auditLogs || []);
      }
    } catch (e: any) {
      showNotice('error', e.message || 'Failed to load studio data.');
    } finally {
      setIsLoading(false);
    }
  };

  // Video Request Details
  const openRequestDrawer = async (reqId: string) => {
    setDrawerLoading(true);
    try {
      const result = await safeFetchJson<{ request?: any }>(`/api/admin/requests/${reqId}`, {
        headers: getAdminHeaders()
      });
      if (result.ok && result.data?.request) {
        const req = result.data.request;
        setSelectedRequest(req);
        setStatusToSet(req.status);
        setEstDateToSet(req.estimatedCompletionDate || '');
        setCustomerNotesToSet(req.customerVisibleNotes || '');
        setVideoDeliveryUrl(req.completedVideo?.directLink || '');
        setTransactionRefInput('TXN-' + Date.now().toString().slice(-6));
        if (req.quote?.amount) {
          setQuoteAmount(req.quote.amount);
          setQuoteCurrency(req.quote.currency || '₹');
          setQuoteBreakdown(req.quote.breakdown || '');
          setQuotePaymentLink(req.quote.paymentLink || '');
        }
      }
    } catch (e: any) {
      showNotice('error', e.message || 'Unable to open request.');
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleUpdateRequest = async () => {
    if (!selectedRequest) return;
    try {
      const result = await safeFetchJson<{ request?: any; error?: string }>(
        `/api/admin/requests/${selectedRequest.id}`,
        {
          method: 'PATCH',
          headers: getAdminHeaders(adminToken, { 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            status: statusToSet,
            estimatedCompletionDate: estDateToSet,
            customerVisibleNotes: customerNotesToSet,
            internalNote: newInternalNote ? newInternalNote.trim() : undefined
          })
        }
      );
      if (result.ok && result.data?.request) {
        setSelectedRequest(result.data.request);
        setNewInternalNote('');
        loadData();
        showNotice('success', `Request ${selectedRequest.id} updated successfully.`);
      } else {
        showNotice('error', result.data?.error || result.error || 'Update failed.');
      }
    } catch (e: any) {
      showNotice('error', e.message);
    }
  };

  // Quote Workflow
  const handleSendCustomQuote = async () => {
    if (!selectedRequest || !quoteAmount) return;
    setIsSendingQuote(true);
    try {
      const result = await safeFetchJson<{ request?: any; error?: string }>(
        `/api/admin/requests/${selectedRequest.id}/quote`,
        {
          method: 'POST',
          headers: getAdminHeaders(adminToken, { 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            amount: Number(quoteAmount),
            currency: quoteCurrency,
            breakdown: quoteBreakdown,
            validUntil: quoteValidUntil,
            paymentLink: quotePaymentLink
          })
        }
      );
      if (result.ok && result.data?.request) {
        setSelectedRequest(result.data.request);
        showNotice(
          'success',
          `Custom quote of ${quoteCurrency}${quoteAmount} dispatched to ${selectedRequest.customerEmail}!`
        );
        loadData();
      } else {
        showNotice('error', result.data?.error || result.error || 'Failed to send quote.');
      }
    } catch (e: any) {
      showNotice('error', e.message);
    } finally {
      setIsSendingQuote(false);
    }
  };

  // Payment Workflow
  const handleConfirmPayment = async () => {
    if (!selectedRequest) return;
    const ref = transactionRefInput.trim() || 'TXN-' + Date.now().toString().slice(-6);
    try {
      const result = await safeFetchJson<{ request?: any; error?: string }>(
        `/api/admin/requests/${selectedRequest.id}/payment`,
        {
          method: 'POST',
          headers: getAdminHeaders(adminToken, { 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            status: 'verified',
            transactionRef: ref
          })
        }
      );
      if (result.ok && result.data?.request) {
        setSelectedRequest(result.data.request);
        showNotice('success', 'Payment verified! Production officially begun and customer notified.');
        loadData();
      } else {
        showNotice('error', result.data?.error || result.error || 'Payment confirmation failed.');
      }
    } catch (e: any) {
      showNotice('error', e.message);
    }
  };

  // Upload Completed Video File
  const handleUploadCompletedVideoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingVideo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: formData
      });
      const parsed = await safeResponseJson<{
        success?: boolean;
        fileUrl?: string;
        filename?: string;
        originalName?: string;
        size?: number;
        error?: string;
      }>(res);

      if (parsed.ok && parsed.data?.fileUrl) {
        const fullUrl = parsed.data.fileUrl.startsWith('http')
          ? parsed.data.fileUrl
          : window.location.protocol === 'http:' || window.location.protocol === 'https:'
          ? `${window.location.origin}${parsed.data.fileUrl}`
          : parsed.data.fileUrl;
        setVideoDeliveryUrl(fullUrl);
        setUploadedVideoFilename(parsed.data.originalName || parsed.data.filename || file.name);
        setUploadedVideoSize(parsed.data.size || file.size);
        showNotice('success', `Video "${file.name}" uploaded successfully.`);
      } else {
        showNotice('error', parsed.data?.error || parsed.error || 'Failed to upload video file.');
      }
    } catch (err: any) {
      showNotice('error', err.message || 'Error uploading video file.');
    } finally {
      setIsUploadingVideo(false);
    }
  };

  // Video Delivery Workflow ("Send Video to Customer")
  const handleDeliverVideo = async () => {
    if (!selectedRequest || !videoDeliveryUrl.trim()) {
      showNotice('error', 'Please upload a completed video file or enter a valid video download link.');
      return;
    }
    setIsSendingVideo(true);
    try {
      const result = await safeFetchJson<{
        request?: any;
        emailResult?: { success: boolean; status: string; error?: string };
        error?: string;
      }>(`/api/admin/requests/${selectedRequest.id}/deliver-video`, {
        method: 'POST',
        headers: getAdminHeaders(adminToken, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          directLink: videoDeliveryUrl.trim(),
          downloadUrl: videoDeliveryUrl.trim(),
          filename: uploadedVideoFilename || undefined,
          sizeBytes: uploadedVideoSize,
          message: deliveryMessage.trim()
        })
      });
      if (result.ok && result.data?.request) {
        const updatedReq = result.data.request;
        setSelectedRequest(updatedReq);
        setStatusToSet(updatedReq.status);
        loadData();
        if (result.data.emailResult?.success) {
          showNotice(
            'success',
            `Completed video sent to ${updatedReq.customerEmail} and request marked as Delivered!`
          );
        } else {
          showNotice(
            'error',
            `Request marked as Delivered and link saved, but email delivery failed (${
              result.data.emailResult?.error || 'Check email settings'
            }).`
          );
        }
      } else {
        showNotice('error', result.data?.error || result.error || 'Delivery failed.');
      }
    } catch (e: any) {
      showNotice('error', e.message);
    } finally {
      setIsSendingVideo(false);
    }
  };

  // Idea & Budget Request Drawer
  const openBudgetDrawer = async (id: string) => {
    try {
      const result = await safeFetchJson<{ budgetRequest?: any }>(`/api/admin/budget-requests/${id}`, {
        headers: getAdminHeaders()
      });
      if (result.ok && result.data?.budgetRequest) {
        setSelectedBudgetRequest(result.data.budgetRequest);
      }
    } catch (e: any) {
      showNotice('error', e.message || 'Unable to load inquiry.');
    }
  };

  const handleSendBudgetReply = async () => {
    if (!selectedBudgetRequest || !budgetReplyMessage.trim()) return;
    setIsSendingBudgetReply(true);
    try {
      const result = await safeFetchJson<{ budgetRequest?: any; error?: string }>(
        `/api/admin/budget-requests/${selectedBudgetRequest.id}/reply`,
        {
          method: 'POST',
          headers: getAdminHeaders(adminToken, { 'Content-Type': 'application/json' }),
          body: JSON.stringify({ message: budgetReplyMessage.trim() })
        }
      );
      if (result.ok && result.data?.budgetRequest) {
        setSelectedBudgetRequest(result.data.budgetRequest);
        setBudgetReplyMessage('');
        loadData();
        showNotice('success', 'Reply email dispatched to customer successfully!');
      } else {
        showNotice('error', result.data?.error || result.error || 'Failed to send reply.');
      }
    } catch (e: any) {
      showNotice('error', e.message);
    } finally {
      setIsSendingBudgetReply(false);
    }
  };

  // Gmail Connection Test Workflow
  const handleTestGmailConnection = async () => {
    setIsTestingEmail(true);
    setTestEmailResult(null);
    try {
      const result = await safeFetchJson<any>('/api/admin/email/test-connection', {
        method: 'POST',
        headers: getAdminHeaders(adminToken, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          recipientEmail: settingsOwnerEmail.trim() || 'muhammedalimdd@gmail.com'
        })
      });
      const data = result.data || {};
      setTestEmailResult({
        success: !!data.success,
        recipient: data.recipient || settingsOwnerEmail || 'muhammedalimdd@gmail.com',
        subject: data.subject || 'AI VIDEO MAKER — TEST EMAIL',
        message:
          data.message ||
          (result.ok
            ? 'Your AI TIMES email notification system is connected. New customer video requests will be delivered to this Gmail inbox.'
            : 'Connection attempt failed'),
        error: data.error || result.error
      });
      loadData();
    } catch (err: any) {
      setTestEmailResult({
        success: false,
        recipient: settingsOwnerEmail || 'muhammedalimdd@gmail.com',
        subject: 'AI VIDEO MAKER — TEST EMAIL',
        message: 'Connection attempt failed',
        error: err.message
      });
    } finally {
      setIsTestingEmail(false);
    }
  };

  // Email Retry Workflow
  const handleRetryEmail = async (logId: string) => {
    setRetryingLogId(logId);
    try {
      const result = await safeFetchJson<any>(`/api/admin/email/${logId}/retry`, {
        method: 'POST',
        headers: getAdminHeaders()
      });
      const data = result.data || {};
      if (result.ok && data.success) {
        showNotice('success', 'Email successfully sent to recipient!');
      } else {
        showNotice(
          'error',
          `Retry failed: ${data.error || result.error || 'Check email configuration in Settings'}`
        );
      }
      loadData();
    } catch (e: any) {
      showNotice('error', `Retry error: ${e.message}`);
    } finally {
      setRetryingLogId(null);
    }
  };

  // Resend Owner Notification for specific request
  const handleResendOwnerEmail = async (requestId: string) => {
    setIsResendingOwnerEmail(true);
    try {
      const result = await safeFetchJson<any>(`/api/admin/requests/${requestId}/resend-owner-email`, {
        method: 'POST',
        headers: getAdminHeaders()
      });
      const data = result.data || {};
      if (result.ok && data.success) {
        showNotice(
          'success',
          `Complete video request brief dispatched to ${settingsOwnerEmail || 'muhammedalimdd@gmail.com'}!`
        );
      } else {
        showNotice(
          'error',
          `Failed to send email: ${data.error || result.error || 'Please configure email delivery in settings.'}`
        );
      }
      loadData();
    } catch (e: any) {
      showNotice('error', `Error: ${e.message}`);
    } finally {
      setIsResendingOwnerEmail(false);
    }
  };

  // Save Settings Workflow
  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingSettings(true);
    try {
      const result = await safeFetchJson<any>('/api/admin/settings', {
        method: 'POST',
        headers: getAdminHeaders(adminToken, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          ownerNotificationEmail: settingsOwnerEmail.trim(),
          emailFromAddress: settingsFromEmail.trim(),
          emailProvider: settingsProvider,
          smtpHost: settingsSmtpHost.trim(),
          smtpPort: Number(settingsSmtpPort),
          smtpSecure: settingsSmtpSecure,
          smtpUser: settingsSmtpUser.trim(),
          smtpPass: settingsSmtpPass.trim(),
          apiKey: settingsApiKey.trim()
        })
      });
      if (result.ok) {
        showNotice('success', 'Email settings saved successfully!');
        loadData();
      } else {
        showNotice('error', result.data?.error || result.error || 'Failed to save settings');
      }
    } catch (e: any) {
      showNotice('error', `Error: ${e.message}`);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Change Admin Password Workflow
  const handleChangeAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePwNotice(null);
    if (!currentAdminPw || !newAdminPw || !confirmNewAdminPw) {
      setChangePwNotice({ type: 'error', text: 'Please fill in all password fields.' });
      return;
    }
    if (newAdminPw.length < 8) {
      setChangePwNotice({ type: 'error', text: 'New password must be at least 8 characters long.' });
      return;
    }
    if (newAdminPw !== confirmNewAdminPw) {
      setChangePwNotice({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setIsChangingPw(true);
    try {
      const res = await safeFetchJson<{ success?: boolean; message?: string; error?: string }>(
        '/api/admin/change-password',
        {
          method: 'POST',
          headers: getAdminHeaders(adminToken, { 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            currentPassword: currentAdminPw,
            newPassword: newAdminPw,
            confirmPassword: confirmNewAdminPw
          })
        }
      );
      if (!res.ok) {
        throw new Error(res.data?.error || res.error || 'Failed to update admin password.');
      }
      setCurrentAdminPw('');
      setNewAdminPw('');
      setConfirmNewAdminPw('');
      setChangePwNotice({
        type: 'success',
        text: res.data?.message || 'Administrator password updated successfully.'
      });
    } catch (err: any) {
      setChangePwNotice({ type: 'error', text: err.message || 'Password update failed.' });
    } finally {
      setIsChangingPw(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-slate-300 text-xs">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span>Verifying private studio access...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl bg-[#090D16] border border-slate-800 p-8 shadow-2xl relative text-center">
          <div className="w-16 h-16 rounded-2xl bg-black border border-amber-500/60 flex items-center justify-center mx-auto mb-4 overflow-hidden shadow-lg shadow-amber-500/30">
            <img
              src="/assets/aistudio/Gemini_Generated_Image_l9mivgl9mivgl9mi_4016af0e.png"
              alt="AI TIMES"
              className="w-full h-full object-cover"
            />
          </div>

          {!isInitialized ? (
            <>
              <h3 className="text-xl font-bold text-white mb-1">Owner Admin Setup</h3>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Set a private password for the studio owner account (<span className="font-mono text-indigo-300">ali</span>). This one-time setup locks automatically once saved.
              </p>

              {loginError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs">
                  {loginError}
                </div>
              )}

              <form onSubmit={handleInitialSetup} className="space-y-3.5 text-left">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Admin Username
                  </label>
                  <input
                    type="text"
                    value="ali"
                    readOnly
                    className="w-full px-4 py-2.5 bg-[#0C1220]/70 border border-slate-800 rounded-xl text-indigo-300 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Create Admin Password (min. 8 characters)
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Enter secure password"
                      className="w-full px-4 py-2.5 pr-10 bg-[#0C1220] border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
                      required
                      minLength={8}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Confirm Admin Password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPasswordInput}
                    onChange={(e) => setConfirmPasswordInput(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full px-4 py-2.5 bg-[#0C1220] border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
                    required
                    minLength={8}
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold text-sm cursor-pointer transition-all"
                  >
                    {isLoggingIn ? 'Initializing...' : 'Save & Open Studio'}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-3 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-sm cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              <h3 className="text-xl font-bold text-white mb-1">Private Owner Login</h3>
              <p className="text-xs text-slate-400 mb-6">
                Restricted studio administration portal. Sign in with your owner credentials.
              </p>

              {loginError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs">
                  {loginError}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-3.5 text-left">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Admin Username
                  </label>
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="Enter admin username"
                    autoComplete="username"
                    className="w-full px-4 py-3 bg-[#0C1220] border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm font-mono"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Admin Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Enter admin password"
                      autoComplete="current-password"
                      className="w-full px-4 py-3 pr-10 bg-[#0C1220] border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold text-sm cursor-pointer transition-all flex items-center justify-center gap-2"
                  >
                    <Lock className="w-4 h-4" />
                    <span>{isLoggingIn ? 'Signing In...' : 'Access Dashboard'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-3 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-sm cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter((u) => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      (u.username || '').toLowerCase().includes(q) ||
      (u.displayName || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-[#060911] text-slate-100 flex flex-col overflow-hidden animate-fadeIn">
      {/* Top Admin Bar */}
      <header className="h-16 border-b border-slate-800 bg-[#090D16] px-4 sm:px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-black border border-amber-500/60 overflow-hidden flex items-center justify-center shrink-0">
            <img
              src="/assets/aistudio/Gemini_Generated_Image_l9mivgl9mivgl9mi_4016af0e.png"
              alt="AI TIMES"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>AI TIMES Studio Admin</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                OWNER: ALI
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Notification recipient:{' '}
              <span className="text-indigo-300 font-mono">
                {settings?.ownerNotificationEmail || 'muhammedalimdd@gmail.com'}
              </span>
            </p>
          </div>
        </div>

        {/* Tab Controls & Close */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('requests')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                activeTab === 'requests' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Video Requests ({requests.length})
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'users' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Customer Accounts ({users.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('budget')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'budget' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3 h-3 text-cyan-300" />
              <span>Custom Inquiries ({budgetRequests.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('emails')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                activeTab === 'emails' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Email Logs ({emailLogs.length})
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                activeTab === 'settings' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Settings
            </button>
          </div>

          <button
            onClick={handleTestGmailConnection}
            disabled={isTestingEmail}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
            title="Test real email dispatch to muhammedalimdd@gmail.com"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>{isTestingEmail ? 'Testing...' : 'TEST EMAIL CONNECTION'}</span>
          </button>

          <button
            onClick={handleAdminLogout}
            className="text-xs text-slate-400 hover:text-rose-400 px-2.5 py-1.5 cursor-pointer"
          >
            Logout
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6 max-w-7xl mx-auto w-full space-y-6">
        {dashboardNotice && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
              dashboardNotice.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-700 text-emerald-200'
                : 'bg-rose-950/60 border-rose-700 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {dashboardNotice.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{dashboardNotice.text}</span>
            </div>
            <button
              onClick={() => setDashboardNotice(null)}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* TAB 1: VIDEO REQUESTS */}
        {activeTab === 'requests' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Metric Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-4 rounded-xl bg-[#090D16] border border-slate-800">
                <span className="text-[10px] font-bold uppercase text-slate-400">Total Requests</span>
                <p className="text-2xl font-black text-white mt-1">{stats.total || requests.length}</p>
              </div>
              <div className="p-4 rounded-xl bg-[#090D16] border border-slate-800">
                <span className="text-[10px] font-bold uppercase text-indigo-400 flex items-center gap-1">
                  <CreditCard className="w-3 h-3" /> Paid Workflow
                </span>
                <p className="text-2xl font-black text-indigo-300 mt-1">{stats.paid || requests.length}</p>
              </div>
              <div className="p-4 rounded-xl bg-[#090D16] border border-slate-800">
                <span className="text-[10px] font-bold uppercase text-amber-400">Under Review</span>
                <p className="text-2xl font-black text-amber-300 mt-1">{stats.awaitingReview || 0}</p>
              </div>
              <div className="p-4 rounded-xl bg-[#090D16] border border-slate-800">
                <span className="text-[10px] font-bold uppercase text-cyan-400">Quote Awaiting</span>
                <p className="text-2xl font-black text-cyan-300 mt-1">
                  {stats.awaitingCustomerQuoteApproval || 0}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-[#090D16] border border-slate-800">
                <span className="text-[10px] font-bold uppercase text-purple-400">In Production</span>
                <p className="text-2xl font-black text-purple-300 mt-1">{stats.inProduction || 0}</p>
              </div>
              <div className="p-4 rounded-xl bg-[#090D16] border border-slate-800">
                <span className="text-[10px] font-bold uppercase text-teal-400">Completed</span>
                <p className="text-2xl font-black text-teal-300 mt-1">{stats.completed || 0}</p>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#090D16] border border-slate-800">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {['all', 'paid', 'quoted', 'approved', 'in_production', 'completed'].map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      setStatusFilter(f);
                      loadData(adminToken, f);
                    }}
                    className={`px-3 py-1.5 rounded-lg font-semibold uppercase tracking-wider text-[10px] transition-all cursor-pointer ${
                      statusFilter === f
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    {f.replace('_', ' ')}
                  </button>
                ))}
              </div>

              <button
                onClick={() => loadData()}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {/* Requests Table */}
            <div className="rounded-2xl bg-[#090D16] border border-slate-800 overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-[#0C1220] text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4">Request ID</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Project Title</th>
                    <th className="py-3 px-4">Style &amp; Platform</th>
                    <th className="py-3 px-4">Quote / Pricing</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        No video requests found.
                      </td>
                    </tr>
                  ) : (
                    requests.map((r) => (
                      <tr
                        key={r.id}
                        onClick={() => openRequestDrawer(r.id)}
                        className="hover:bg-slate-800/30 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-indigo-400">{r.id}</td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-950/80 text-indigo-300 border border-indigo-800">
                            <CreditCard className="w-3 h-3" />
                            <span>Paid</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-white block group-hover:text-indigo-200">
                            {r.customerName}
                            {r.customerUsername && (
                              <span className="ml-1.5 text-[10px] font-mono text-purple-300">
                                (@{r.customerUsername})
                              </span>
                            )}
                          </span>
                          <span
                            className="text-indigo-300 font-mono text-[11px]"
                            title="Email Address for Video Delivery"
                          >
                            {r.customerEmail}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-white max-w-xs truncate">
                          {r.title}
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">
                          {r.style} <span className="text-slate-500">· {r.format}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          {r.quote?.status === 'sent' ? (
                            <span className="text-cyan-300 font-bold">
                              {r.quote.formattedAmount} (Sent)
                            </span>
                          ) : r.quote?.status === 'accepted' ? (
                            <span className="text-emerald-300 font-bold">
                              {r.quote.formattedAmount} (Accepted)
                            </span>
                          ) : (
                            <span className="text-slate-400">Needs Custom Quote</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                              r.status === 'Completed' || r.status === 'Delivered'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : r.status === 'In Production'
                                ? 'bg-purple-950 text-purple-300 border border-purple-800'
                                : r.status === 'Approved'
                                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                                : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openRequestDrawer(r.id);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white font-semibold text-xs cursor-pointer"
                          >
                            Manage &rarr;
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: CUSTOMER ACCOUNTS MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-emerald-400" />
                  <span>Registered Customer Accounts</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Customers register their own personal username and password. Each customer can only access their own private video requests.
                </p>
              </div>

              <div className="w-full sm:w-64">
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search username or email..."
                  className="w-full px-3 py-2 bg-[#0C1220] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500"
                />
              </div>
            </div>

            {/* Users Table */}
            <div className="rounded-2xl bg-[#090D16] border border-slate-800 overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-[#0C1220] text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4">Username / Name</th>
                    <th className="py-3 px-4">UID</th>
                    <th className="py-3 px-4">Recovery Email</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Requests</th>
                    <th className="py-3 px-4">Joined</th>
                    <th className="py-3 px-4 text-right">Last Login</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        No customer accounts registered yet.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.uid} className="hover:bg-slate-800/30">
                        <td className="py-3.5 px-4 flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-indigo-900/60 text-indigo-300 flex items-center justify-center font-bold text-xs">
                            {(u.username || u.displayName || 'U')[0].toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-white font-mono">@{u.username || u.displayName}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">{u.uid}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-300">
                          {u.email && !u.email.endsWith('@aivideomaker.local') ? u.email : '—'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-950 text-indigo-300 border border-indigo-800">
                            {u.role || 'customer'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-cyan-300 font-bold">
                          {u.requestCount ?? 0}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-400 text-[11px]">
                          {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {auditLogs.length > 0 && (
              <div className="p-5 rounded-2xl bg-[#090D16] border border-slate-800 space-y-3">
                <h4 className="text-sm font-bold text-white">Security &amp; Audit Trail</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto text-xs">
                  {auditLogs.map((a) => (
                    <div
                      key={a.id}
                      className="p-2.5 rounded-lg bg-[#0C1220] border border-slate-800/80 flex items-center justify-between"
                    >
                      <div>
                        <span className="text-indigo-400 font-mono font-semibold">{a.targetUserEmail}</span>:{' '}
                        {a.details}
                      </div>
                      <span className="text-slate-500 text-[10px]">
                        {new Date(a.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: IDEA & CUSTOM INQUIRIES */}
        {activeTab === 'budget' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-cyan-400" />
                  <span>Direct Contact &amp; Custom Video Inquiries</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Submissions from the &ldquo;Contact Us &amp; Request a Custom AI Video&rdquo; form.
                </p>
              </div>
              <button
                onClick={() => loadData()}
                className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>

            <div className="rounded-2xl bg-[#090D16] border border-slate-800 overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-[#0C1220] text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4">Request ID</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Video Idea</th>
                    <th className="py-3 px-4">Pricing Note</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {budgetRequests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        No custom inquiries yet.
                      </td>
                    </tr>
                  ) : (
                    budgetRequests.map((b) => (
                      <tr
                        key={b.id}
                        onClick={() => openBudgetDrawer(b.id)}
                        className="hover:bg-slate-800/30 cursor-pointer"
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-cyan-400">{b.id}</td>
                        <td className="py-3.5 px-4 font-bold text-white">
                          {b.fullName} ({b.email})
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 max-w-xs truncate">{b.videoIdea}</td>
                        <td className="py-3.5 px-4 font-semibold text-indigo-300">{b.budgetAmount}</td>
                        <td className="py-3.5 px-4 text-slate-300">{b.status}</td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openBudgetDrawer(b.id);
                            }}
                            className="px-3 py-1 rounded bg-indigo-600 text-white font-bold cursor-pointer"
                          >
                            Reply &rarr;
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: EMAIL LOGS */}
        {activeTab === 'emails' && (
          <div className="space-y-6 animate-fadeIn">
            {testEmailResult && (
              <div
                className={`p-4 rounded-2xl border flex items-start justify-between gap-3 ${
                  testEmailResult.success
                    ? 'bg-emerald-950/60 border-emerald-600 text-emerald-200'
                    : 'bg-rose-950/60 border-rose-600 text-rose-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {testEmailResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h4 className="font-bold text-sm">
                      {testEmailResult.success
                        ? 'TEST EMAIL DISPATCHED SUCCESSFULLY'
                        : 'EMAIL CONNECTION TEST FAILED'}
                    </h4>
                    <p className="text-xs mt-0.5 opacity-90">{testEmailResult.message}</p>
                    <p className="text-[11px] mt-1 font-mono">
                      Destination: <strong>{testEmailResult.recipient}</strong> &bull; Subject:{' '}
                      <em>{testEmailResult.subject}</em>
                    </p>
                    {testEmailResult.error && (
                      <p className="text-xs text-rose-300 bg-black/40 p-2 rounded mt-2 font-mono">
                        Error: {testEmailResult.error}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setTestEmailResult(null)}
                  className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Mail className="w-5 h-5 text-indigo-400" />
                  <span>Automatic Request Email Delivery Logs</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Every submitted request is automatically dispatched to{' '}
                  <strong className="text-indigo-300 font-mono">
                    {settingsOwnerEmail || 'muhammedalimdd@gmail.com'}
                  </strong>
                  .
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleTestGmailConnection}
                  disabled={isTestingEmail}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{isTestingEmail ? 'Sending Test...' : 'TEST EMAIL CONNECTION'}</span>
                </button>
                <button
                  onClick={() => loadData()}
                  className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs flex items-center gap-1 cursor-pointer"
                  title="Refresh logs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="rounded-2xl bg-[#090D16] border border-slate-800 overflow-hidden text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-[#0C1220] text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Request ID</th>
                    <th className="py-3 px-4">Email Type</th>
                    <th className="py-3 px-4">Recipient</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {emailLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        No email transmission logs recorded yet.
                      </td>
                    </tr>
                  ) : (
                    emailLogs.map((l) => {
                      const isSuccess = l.status === 'sent';
                      const isFailed = l.status === 'failed';
                      return (
                        <tr key={l.id} className="hover:bg-slate-800/20 transition-colors">
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                isSuccess
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : isFailed
                                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                  : 'bg-amber-950 text-amber-300 border border-amber-800'
                              }`}
                            >
                              {isSuccess ? '✓ Delivered' : isFailed ? '✕ Failed' : '⚡ Logged'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-indigo-400">
                            {l.requestId}
                          </td>
                          <td className="py-3.5 px-4 text-slate-300">
                            {l.type === 'owner_new_request' && 'Owner Alert'}
                            {l.type === 'customer_confirmation' && 'Customer Confirmation'}
                            {l.type === 'video_delivery' && 'Video Delivery'}
                            {l.type === 'quote_sent' && 'Custom Quote'}
                            {l.type === 'payment_confirmed' && 'Payment Verified'}
                            {l.type === 'budget_request_owner' && 'Custom Inquiry (Owner)'}
                            {l.type === 'budget_request_customer' && 'Custom Inquiry (Customer)'}
                            {l.type === 'password_reset' && 'Password Reset OTP'}
                            {l.type === 'test_connection' && 'Connection Test'}
                            {![
                              'owner_new_request',
                              'customer_confirmation',
                              'video_delivery',
                              'quote_sent',
                              'payment_confirmed',
                              'budget_request_owner',
                              'budget_request_customer',
                              'password_reset',
                              'test_connection'
                            ].includes(l.type) && l.type}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-white font-medium">
                            {l.recipient}
                          </td>
                          <td className="py-3.5 px-4 text-slate-200 max-w-xs truncate" title={l.subject}>
                            {l.subject}
                            {l.error && (
                              <p className="text-[10px] text-rose-400 truncate mt-0.5" title={l.error}>
                                Error: {l.error}
                              </p>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                            {new Date(l.sentAt).toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-2">
                            <button
                              onClick={() => setPreviewEmailLog(l)}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-[11px] cursor-pointer"
                            >
                              View
                            </button>
                            {(!isSuccess || isFailed) && (
                              <button
                                onClick={() => handleRetryEmail(l.id)}
                                disabled={retryingLogId === l.id}
                                className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] cursor-pointer inline-flex items-center gap-1"
                              >
                                <RotateCcw
                                  className={`w-3 h-3 ${retryingLogId === l.id ? 'animate-spin' : ''}`}
                                />
                                <span>{retryingLogId === l.id ? 'Retrying...' : 'Retry'}</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: SETTINGS & ADMIN PASSWORD */}
        {activeTab === 'settings' && (
          <div className="max-w-3xl space-y-8 animate-fadeIn">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-400" />
                <span>Automatic Gmail Request Notification Settings</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure your Gmail or SMTP delivery parameters so every customer request arrives directly in your Gmail inbox at{' '}
                <strong className="text-indigo-300 font-mono">muhammedalimdd@gmail.com</strong>.
              </p>
            </div>

            {testEmailResult && (
              <div
                className={`p-4 rounded-2xl border flex items-start justify-between gap-3 ${
                  testEmailResult.success
                    ? 'bg-emerald-950/60 border-emerald-600 text-emerald-200'
                    : 'bg-rose-950/60 border-rose-600 text-rose-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {testEmailResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h4 className="font-bold text-sm">
                      {testEmailResult.success ? 'TEST EMAIL DELIVERED TO GMAIL' : 'TEST CONNECTION FAILED'}
                    </h4>
                    <p className="text-xs mt-0.5">{testEmailResult.message}</p>
                    <p className="text-[11px] mt-1 font-mono">
                      Destination: <strong>{testEmailResult.recipient}</strong>
                    </p>
                    {testEmailResult.error && (
                      <p className="text-xs text-rose-300 bg-black/40 p-2 rounded mt-2 font-mono">
                        Error: {testEmailResult.error}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setTestEmailResult(null)}
                  className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-indigo-950/30 to-slate-900 border border-emerald-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 block mb-1">
                  1-Click Direct Verification
                </span>
                <h4 className="text-sm font-bold text-white">Test Email Connection</h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  Sends an immediate test email to{' '}
                  <strong className="text-indigo-300 font-mono">
                    {settingsOwnerEmail || 'muhammedalimdd@gmail.com'}
                  </strong>{' '}
                  with subject <em className="text-white">&ldquo;AI VIDEO MAKER — TEST EMAIL&rdquo;</em>.
                </p>
              </div>
              <button
                type="button"
                onClick={handleTestGmailConnection}
                disabled={isTestingEmail}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
              >
                <Mail className="w-4 h-4" />
                <span>{isTestingEmail ? 'Sending Test...' : 'TEST EMAIL CONNECTION'}</span>
              </button>
            </div>

            <form
              onSubmit={handleSaveSettings}
              className="p-6 rounded-2xl bg-[#090D16] border border-slate-800 space-y-5"
            >
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">
                  Owner&apos;s Destination Gmail Address (Required)
                </label>
                <input
                  type="email"
                  value={settingsOwnerEmail}
                  onChange={(e) => setSettingsOwnerEmail(e.target.value)}
                  placeholder="muhammedalimdd@gmail.com"
                  required
                  className="w-full px-4 py-3 bg-[#0C1220] border border-slate-800 rounded-xl text-white text-sm font-mono font-semibold focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">
                  Verified Sender Address (From)
                </label>
                <input
                  type="text"
                  value={settingsFromEmail}
                  onChange={(e) => setSettingsFromEmail(e.target.value)}
                  placeholder="muhammedalimdd@gmail.com"
                  className="w-full px-4 py-3 bg-[#0C1220] border border-slate-800 rounded-xl text-white text-sm font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">
                  Delivery Service / Protocol
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'gmail', label: 'Gmail (App Password)', desc: 'Direct Google SMTP' },
                    { id: 'smtp', label: 'Custom SMTP', desc: 'Any SMTP host' },
                    { id: 'resend', label: 'Resend API', desc: 'Transactional API' },
                    { id: 'sendgrid', label: 'SendGrid API', desc: 'Transactional API' }
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSettingsProvider(p.id as any)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        settingsProvider === p.id
                          ? 'bg-indigo-950/60 border-indigo-500 text-white shadow'
                          : 'bg-[#0C1220] border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="font-bold text-xs">{p.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{p.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {(settingsProvider === 'gmail' || settingsProvider === 'smtp') && (
                <div className="p-4 rounded-xl bg-[#0C1220] border border-slate-800/80 space-y-4">
                  {settingsProvider === 'gmail' && (
                    <div className="p-3 bg-indigo-950/40 border border-indigo-800/50 rounded-lg text-xs text-indigo-200 leading-relaxed">
                      <strong className="text-white block mb-1">How to use Gmail with AI TIMES:</strong>
                      1. Go to your{' '}
                      <a
                        href="https://myaccount.google.com/security"
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-300 underline font-semibold"
                      >
                        Google Account Security
                      </a>{' '}
                      settings.
                      <br />
                      2. Ensure <strong>2-Step Verification</strong> is ON.
                      <br />
                      3. Click <strong>App Passwords</strong> and generate a new password named{' '}
                      <em>&ldquo;AI TIMES&rdquo;</em>.<br />
                      4. Paste the 16-character password into the <strong>Google App Password</strong> field below.
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        SMTP Host
                      </label>
                      <input
                        type="text"
                        value={settingsSmtpHost}
                        onChange={(e) => setSettingsSmtpHost(e.target.value)}
                        placeholder="smtp.gmail.com"
                        className="w-full px-3 py-2 bg-[#090D16] border border-slate-800 rounded-lg text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        SMTP Port (465 for SSL, 587 for TLS)
                      </label>
                      <input
                        type="number"
                        value={settingsSmtpPort}
                        onChange={(e) => setSettingsSmtpPort(Number(e.target.value))}
                        placeholder="465"
                        className="w-full px-3 py-2 bg-[#090D16] border border-slate-800 rounded-lg text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Google / SMTP User (Email)
                      </label>
                      <input
                        type="email"
                        value={settingsSmtpUser}
                        onChange={(e) => setSettingsSmtpUser(e.target.value)}
                        placeholder="muhammedalimdd@gmail.com"
                        className="w-full px-3 py-2 bg-[#090D16] border border-slate-800 rounded-lg text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center justify-between">
                        <span>{settingsProvider === 'gmail' ? 'Google App Password' : 'SMTP Password'}</span>
                        <button
                          type="button"
                          onClick={() => setShowSmtpPass(!showSmtpPass)}
                          className="text-[10px] text-indigo-400 hover:underline cursor-pointer"
                        >
                          {showSmtpPass ? 'Hide' : 'Show'}
                        </button>
                      </label>
                      <input
                        type={showSmtpPass ? 'text' : 'password'}
                        value={settingsSmtpPass}
                        onChange={(e) => setSettingsSmtpPass(e.target.value)}
                        placeholder="16-character app password..."
                        className="w-full px-3 py-2 bg-[#090D16] border border-slate-800 rounded-lg text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {(settingsProvider === 'resend' || settingsProvider === 'sendgrid') && (
                <div className="p-4 rounded-xl bg-[#0C1220] border border-slate-800 space-y-2 text-xs text-slate-300">
                  <p className="font-semibold text-white">
                    {settingsProvider === 'resend'
                      ? 'Resend Transactional Email API'
                      : 'SendGrid Transactional Email API'}
                  </p>
                  <p className="text-slate-400">
                    For security, transactional API keys (<code className="text-indigo-300">RESEND_API_KEY</code> or{' '}
                    <code className="text-indigo-300">SENDGRID_API_KEY</code>) are read directly from server environment variables.
                  </p>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer shadow-md"
                >
                  {isSavingSettings ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </form>

            {/* Change Owner Admin Password */}
            <form
              onSubmit={handleChangeAdminPassword}
              className="p-6 rounded-2xl bg-[#090D16] border border-slate-800 space-y-4"
            >
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-400" />
                  <span>Change Admin Password (Account: ali)</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Update your private studio owner password securely using salted cryptographic hashing.
                </p>
              </div>

              {changePwNotice && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    changePwNotice.type === 'success'
                      ? 'bg-emerald-950/60 border-emerald-700 text-emerald-200'
                      : 'bg-rose-950/60 border-rose-700 text-rose-200'
                  }`}
                >
                  {changePwNotice.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{changePwNotice.text}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentAdminPw}
                    onChange={(e) => setCurrentAdminPw(e.target.value)}
                    placeholder="Current password"
                    className="w-full px-3 py-2 bg-[#0C1220] border border-slate-800 rounded-lg text-xs text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    New Password (min 8 chars)
                  </label>
                  <input
                    type="password"
                    value={newAdminPw}
                    onChange={(e) => setNewAdminPw(e.target.value)}
                    placeholder="New password"
                    className="w-full px-3 py-2 bg-[#0C1220] border border-slate-800 rounded-lg text-xs text-white"
                    minLength={8}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmNewAdminPw}
                    onChange={(e) => setConfirmNewAdminPw(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full px-3 py-2 bg-[#090D16] border border-slate-800 rounded-lg text-xs text-white"
                    minLength={8}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isChangingPw}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-white font-bold text-xs cursor-pointer shadow-md"
              >
                {isChangingPw ? 'Updating Password...' : 'Update Admin Password'}
              </button>
            </form>
          </div>
        )}
      </main>

      {/* DETAIL DRAWER FOR VIDEO BRIEFS */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-3xl h-full bg-[#090D16] border-l border-slate-800 flex flex-col justify-between overflow-y-auto p-6 sm:p-8 animate-fadeIn">
            <div>
              {drawerLoading ? (
                <div className="py-12 text-center text-xs text-slate-400">Loading request details...</div>
              ) : (
                <>
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-indigo-400">
                          {selectedRequest.id}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-950 text-indigo-300 border border-indigo-800">
                          Paid Video Request
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-cyan-300 border border-slate-700">
                          {selectedRequest.status}
                        </span>
                      </div>
                      <h3 className="text-xl font-extrabold text-white mt-1">
                        {selectedRequest.title}
                      </h3>
                      <div className="text-xs text-slate-300 mt-1 space-y-0.5">
                        <p>
                          Customer Name: <strong className="text-white">{selectedRequest.customerName}</strong>
                          {selectedRequest.customerUsername && (
                            <span className="ml-2 text-purple-300 font-mono">
                              (Username: @{selectedRequest.customerUsername})
                            </span>
                          )}
                        </p>
                        <p>
                          Email Address for Video Delivery:{' '}
                          <strong className="text-indigo-300 font-mono">
                            {selectedRequest.customerEmail}
                          </strong>
                        </p>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => handleResendOwnerEmail(selectedRequest.id)}
                          disabled={isResendingOwnerEmail}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer shadow transition-all disabled:opacity-50"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>
                            {isResendingOwnerEmail
                              ? 'Dispatching to Gmail...'
                              : 'Send / Resend Request to Owner Gmail (muhammedalimdd@gmail.com)'}
                          </span>
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedRequest(null)}
                      className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Email Delivery Logs for this Request */}
                  {emailLogs.filter((l) => l.requestId === selectedRequest.id).length > 0 && (
                    <div className="p-4 rounded-xl bg-[#0C1220] border border-slate-800 mb-6 space-y-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                        Email Notification Status for {selectedRequest.id}
                      </span>
                      <div className="space-y-2">
                        {emailLogs
                          .filter((l) => l.requestId === selectedRequest.id)
                          .map((l) => (
                            <div
                              key={l.id}
                              className="p-2.5 rounded-lg bg-[#090D16] border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs"
                            >
                              <div>
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mr-2 ${
                                    l.status === 'sent'
                                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                      : 'bg-rose-950 text-rose-300 border border-rose-800'
                                  }`}
                                >
                                  {l.status === 'sent' ? '✓ Sent' : '✕ Failed'}
                                </span>
                                <span className="text-white font-semibold">{l.type}</span>
                                <span className="text-slate-400 ml-2 font-mono">→ {l.recipient}</span>
                                {l.error && <p className="text-[11px] text-rose-400 mt-1">{l.error}</p>}
                              </div>
                              {l.status === 'failed' && (
                                <button
                                  onClick={() => handleRetryEmail(l.id)}
                                  disabled={retryingLogId === l.id}
                                  className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] cursor-pointer flex items-center gap-1"
                                >
                                  <RotateCcw
                                    className={`w-3 h-3 ${retryingLogId === l.id ? 'animate-spin' : ''}`}
                                  />
                                  <span>
                                    {retryingLogId === l.id ? 'Retrying...' : 'Retry Failed Email'}
                                  </span>
                                </button>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Status Update & Date controls */}
                  <div className="p-4 rounded-xl bg-[#0C1220] border border-slate-800 mb-6 space-y-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                      Production Controls
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                          Set Status
                        </label>
                        <select
                          value={statusToSet}
                          onChange={(e) => setStatusToSet(e.target.value as VideoStatus)}
                          className="w-full px-3 py-2 bg-[#090D16] border border-slate-800 rounded-lg text-xs text-white"
                        >
                          <option value="Submitted">Submitted</option>
                          <option value="Under Review">Under Review</option>
                          <option value="Approved">Approved</option>
                          <option value="In Production">In Production</option>
                          <option value="Quality Check">Quality Check</option>
                          <option value="Completed">Completed</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                          Estimated Completion Date
                        </label>
                        <input
                          type="date"
                          value={estDateToSet}
                          onChange={(e) => setEstDateToSet(e.target.value)}
                          className="w-full px-3 py-2 bg-[#090D16] border border-slate-800 rounded-lg text-xs text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Customer-Visible Notes
                      </label>
                      <input
                        type="text"
                        value={customerNotesToSet}
                        onChange={(e) => setCustomerNotesToSet(e.target.value)}
                        placeholder="e.g. Scene 1 rendered. Currently rendering final shots..."
                        className="w-full px-3 py-2 bg-[#090D16] border border-slate-800 rounded-lg text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Add Private Internal Note
                      </label>
                      <input
                        type="text"
                        value={newInternalNote}
                        onChange={(e) => setNewInternalNote(e.target.value)}
                        placeholder="Staff notes (never shown to customer)..."
                        className="w-full px-3 py-2 bg-[#090D16] border border-slate-800 rounded-lg text-xs text-white"
                      />
                    </div>

                    <button
                      onClick={handleUpdateRequest}
                      className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer"
                    >
                      Save Status &amp; Notes
                    </button>
                  </div>

                  {/* CUSTOM QUOTE SECTION (ALWAYS AVAILABLE FOR VIDEO REQUESTS) */}
                  <div className="p-5 rounded-2xl bg-gradient-to-b from-indigo-950/40 to-slate-900 border border-indigo-700/60 mb-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-indigo-400" />
                        <span>Prepare &amp; Send Custom Video Quote</span>
                      </h4>
                      {selectedRequest.quote && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                          Quote Status: {selectedRequest.quote.status.toUpperCase()}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-300">
                      The customer was informed:{' '}
                      <strong className="text-indigo-300">&ldquo;The payment will be based on the video.&rdquo;</strong>{' '}
                      Enter your proposed production cost and send the quote to their email.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-300 mb-1 font-semibold">
                          Quote Amount (Numeric)
                        </label>
                        <div className="flex gap-1.5">
                          <select
                            value={quoteCurrency}
                            onChange={(e) => setQuoteCurrency(e.target.value)}
                            className="px-2.5 py-2 bg-[#090D16] border border-slate-800 rounded-lg text-xs text-white font-bold"
                          >
                            <option value="₹">₹ (INR)</option>
                            <option value="$">$ (USD)</option>
                          </select>
                          <input
                            type="number"
                            value={quoteAmount}
                            onChange={(e) => setQuoteAmount(Number(e.target.value))}
                            className="flex-1 px-3 py-2 bg-[#090D16] border border-slate-800 rounded-lg text-xs text-white font-bold"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-300 mb-1 font-semibold">
                          Payment Link (UPI / Stripe / Custom)
                        </label>
                        <input
                          type="text"
                          value={quotePaymentLink}
                          onChange={(e) => setQuotePaymentLink(e.target.value)}
                          placeholder="https://buy.stripe.com/... or upi://pay?..."
                          className="w-full px-3 py-2 bg-[#090D16] border border-slate-800 rounded-lg text-xs text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-300 mb-1 font-semibold">
                          Quote Valid Until (Optional)
                        </label>
                        <input
                          type="date"
                          value={quoteValidUntil}
                          onChange={(e) => setQuoteValidUntil(e.target.value)}
                          className="w-full px-3 py-2 bg-[#090D16] border border-slate-800 rounded-lg text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-300 mb-1 font-semibold">
                          Payment Transaction Reference (When Verifying)
                        </label>
                        <input
                          type="text"
                          value={transactionRefInput}
                          onChange={(e) => setTransactionRefInput(e.target.value)}
                          placeholder="e.g. TXN-123456"
                          className="w-full px-3 py-2 bg-[#090D16] border border-slate-800 rounded-lg text-xs text-white font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1 font-semibold">
                        Scope &amp; Production Breakdown
                      </label>
                      <textarea
                        rows={2}
                        value={quoteBreakdown}
                        onChange={(e) => setQuoteBreakdown(e.target.value)}
                        className="w-full px-3 py-2 bg-[#090D16] border border-slate-800 rounded-lg text-xs text-white"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={handleSendCustomQuote}
                        disabled={isSendingQuote}
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer shadow-md"
                      >
                        {isSendingQuote
                          ? 'Sending Quote...'
                          : 'Send Custom Quote to Customer Email →'}
                      </button>

                      <button
                        onClick={handleConfirmPayment}
                        className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs cursor-pointer"
                      >
                        Confirm Payment &amp; Begin Production
                      </button>
                    </div>
                  </div>

                  {/* VIDEO DELIVERY WORKFLOW ("Send Completed Video to Customer Email") */}
                  <div className="p-5 rounded-2xl bg-gradient-to-b from-emerald-950/40 to-slate-900 border border-emerald-800/60 mb-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Video className="w-5 h-5 text-emerald-400" />
                        <h4 className="text-sm font-bold text-white">
                          Upload &amp; Send Completed Video to Customer
                        </h4>
                      </div>
                      <span className="text-[11px] text-emerald-300 font-mono">
                        Destination: {selectedRequest.customerEmail}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="p-3.5 rounded-xl bg-[#090D16] border border-slate-800">
                        <label className="block text-[11px] font-semibold text-slate-300 mb-2">
                          1. Upload Completed Video File (MP4, MOV, WebM)
                        </label>
                        <div className="flex flex-wrap items-center gap-3">
                          <label className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer inline-flex items-center gap-2 shadow">
                            <Upload className="w-3.5 h-3.5" />
                            <span>{isUploadingVideo ? 'Uploading Video...' : 'Upload Completed Video'}</span>
                            <input
                              type="file"
                              accept="video/*,.mp4,.mov,.webm"
                              onChange={handleUploadCompletedVideoFile}
                              className="hidden"
                              disabled={isUploadingVideo}
                            />
                          </label>
                          {uploadedVideoFilename && (
                            <span className="text-xs text-emerald-300 font-mono flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Uploaded: {uploadedVideoFilename}
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          2. Secure Video Download Link (Auto-filled from upload or enter URL)
                        </label>
                        <input
                          type="text"
                          value={videoDeliveryUrl}
                          onChange={(e) => setVideoDeliveryUrl(e.target.value)}
                          placeholder="https://... or upload video file above"
                          className="w-full px-3 py-2 bg-[#090D16] border border-slate-800 rounded-lg text-xs text-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          3. Delivery Message to Customer
                        </label>
                        <input
                          type="text"
                          value={deliveryMessage}
                          onChange={(e) => setDeliveryMessage(e.target.value)}
                          className="w-full px-3 py-2 bg-[#090D16] border border-slate-800 rounded-lg text-xs text-white"
                        />
                      </div>

                      <button
                        onClick={handleDeliverVideo}
                        disabled={isSendingVideo || isUploadingVideo}
                        className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                        <span>
                          {isSendingVideo ? 'Sending Video to Customer...' : 'Send Video to Customer'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* COMPLETE REQUEST DETAILS PREVIEW */}
                  <div className="p-4 rounded-xl bg-[#0C1220] border border-slate-800 space-y-4 text-xs mb-6">
                    <h4 className="font-bold text-white text-sm border-b border-slate-800 pb-2">
                      Complete Customer Video Request Details
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-[#090D16] p-3.5 rounded-xl border border-slate-800/80">
                      <div>
                        <span className="text-slate-400">Customer Name:</span>{' '}
                        <strong className="text-white">{selectedRequest.customerName}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Customer Username:</span>{' '}
                        <strong className="text-purple-300 font-mono">
                          @{selectedRequest.customerUsername || selectedRequest.userId || selectedRequest.customerName}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Delivery Email:</span>{' '}
                        <strong className="text-indigo-300 font-mono">
                          {selectedRequest.customerEmail}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Submitted At:</span>{' '}
                        <strong className="text-white">
                          {new Date(selectedRequest.createdAt).toLocaleString()}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Category / Purpose:</span>{' '}
                        <strong className="text-white">
                          {selectedRequest.videoType} · {selectedRequest.purpose}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Visual Style:</span>{' '}
                        <strong className="text-white">{selectedRequest.style}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Format &amp; Aspect Ratio:</span>{' '}
                        <strong className="text-white uppercase">
                          {selectedRequest.format} ({selectedRequest.aspectRatio})
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Duration:</span>{' '}
                        <strong className="text-white">{selectedRequest.duration}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Language:</span>{' '}
                        <strong className="text-cyan-300">{selectedRequest.language || 'English'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Voice-Over &amp; Dialogue:</span>{' '}
                        <strong className="text-white">
                          {selectedRequest.voiceOverPref || 'None'} /{' '}
                          {selectedRequest.dialoguePref || 'Standard'}
                        </strong>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-slate-400">Music &amp; Audio:</span>{' '}
                        <strong className="text-white">
                          {selectedRequest.backgroundMusic || 'Cinematic Ambient'} (Subtitles:{' '}
                          {selectedRequest.subtitles ? 'Yes' : 'No'})
                        </strong>
                      </div>
                    </div>

                    {selectedRequest.summary && (
                      <div>
                        <span className="font-bold text-indigo-400 block mb-1">
                          Video Idea &amp; Summary:
                        </span>
                        <div className="p-3 bg-[#090D16] rounded border border-slate-800 whitespace-pre-wrap text-slate-200">
                          {selectedRequest.summary}
                        </div>
                      </div>
                    )}

                    <div>
                      <span className="font-bold text-indigo-400 block mb-1">
                        Story &amp; Scene Descriptions:
                      </span>
                      <div className="p-3 bg-[#090D16] rounded border border-slate-800 whitespace-pre-wrap text-slate-200">
                        {selectedRequest.storyDescription || selectedRequest.summary}
                      </div>
                    </div>

                    {selectedRequest.scenes && selectedRequest.scenes.length > 0 && (
                      <div className="space-y-2">
                        <span className="font-bold text-indigo-400">
                          Scenes ({selectedRequest.scenes.length}):
                        </span>
                        {selectedRequest.scenes.map((s: any, idx: number) => (
                          <div
                            key={idx}
                            className="p-3 bg-[#090D16] rounded-xl border border-slate-800 space-y-1"
                          >
                            <strong className="text-purple-300">
                              Scene {s.sceneNumber}: {s.location}
                            </strong>
                            <p className="text-slate-300">Action: {s.actions}</p>
                            {s.dialogue && <p className="text-cyan-300">Dialogue: &ldquo;{s.dialogue}&rdquo;</p>}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-3">
                      <span className="font-bold text-indigo-400">
                        Characters ({selectedRequest.characters?.length || 0}) &amp; Uploaded Reference Photos:
                      </span>
                      {selectedRequest.characters?.map((c: any, i: number) => (
                        <div
                          key={i}
                          className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <strong className="text-white text-sm">{c.name}</strong>
                              <span className="text-slate-400 text-xs ml-1">
                                ({c.role || 'Character'}
                                {c.ageRange ? `, Age ${c.ageRange}` : ''})
                              </span>
                            </div>
                          </div>
                          <p className="text-slate-300 text-xs">
                            <strong className="text-slate-400">Appearance:</strong> {c.appearance}
                          </p>
                          {c.clothing && (
                            <p className="text-slate-300 text-xs">
                              <strong className="text-slate-400">Clothing:</strong> {c.clothing}
                            </p>
                          )}
                          {c.actions && (
                            <p className="text-slate-300 text-xs">
                              <strong className="text-slate-400">Actions:</strong> {c.actions}
                            </p>
                          )}
                          {c.dialogue && (
                            <p className="text-cyan-300 text-xs font-medium">&ldquo;{c.dialogue}&rdquo;</p>
                          )}
                          {c.referencePhotoUrl && (
                            <div className="mt-2 p-2 bg-[#090D16] rounded-lg border border-slate-800 flex items-center gap-3">
                              <img
                                src={c.referencePhotoUrl}
                                alt={c.name}
                                className="w-14 h-14 rounded object-cover border border-slate-700 shrink-0"
                              />
                              <div>
                                <span className="text-[11px] font-semibold text-slate-300 block">
                                  Uploaded Reference Photo
                                </span>
                                <a
                                  href={c.referencePhotoUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-cyan-400 underline text-xs font-bold inline-flex items-center gap-1 mt-0.5"
                                >
                                  <span>Open High-Resolution Image</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DETAIL DRAWER FOR CUSTOM INQUIRIES */}
      {selectedBudgetRequest && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-2xl h-full bg-[#090D16] border-l border-slate-800 p-6 overflow-y-auto space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="font-mono text-cyan-400 font-bold text-xs">
                  {selectedBudgetRequest.id}
                </span>
                <h3 className="text-lg font-bold text-white">{selectedBudgetRequest.fullName}</h3>
                <p className="text-xs text-slate-400">{selectedBudgetRequest.email}</p>
              </div>
              <button
                onClick={() => setSelectedBudgetRequest(null)}
                className="p-2 rounded bg-slate-800 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded bg-[#0C1220] border border-slate-800 space-y-2 text-xs">
              <span className="text-indigo-400 font-bold">Video Idea:</span>
              <p className="text-white whitespace-pre-wrap">{selectedBudgetRequest.videoIdea}</p>
              <div className="pt-2 flex flex-wrap gap-4 text-slate-300">
                <span>
                  Pricing Note:{' '}
                  <strong className="text-indigo-300">{selectedBudgetRequest.budgetAmount}</strong>
                </span>
                <span>
                  Type: <strong>{selectedBudgetRequest.preferredVideoType}</strong>
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-300">
                Reply to Customer via Email
              </label>
              <textarea
                rows={3}
                value={budgetReplyMessage}
                onChange={(e) => setBudgetReplyMessage(e.target.value)}
                placeholder="Type your reply message or proposed quote..."
                className="w-full p-3 rounded-xl bg-[#0C1220] border border-slate-800 text-xs text-white"
              />
              <button
                onClick={handleSendBudgetReply}
                disabled={isSendingBudgetReply}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer"
              >
                {isSendingBudgetReply ? 'Sending...' : 'Send Reply Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EMAIL PREVIEW MODAL */}
      {previewEmailLog && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl max-h-[90vh] bg-[#090D16] border border-slate-800 rounded-3xl flex flex-col overflow-hidden shadow-2xl animate-fadeIn">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-[#0C1220]">
              <div>
                <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase">
                  {previewEmailLog.type} &bull; {previewEmailLog.requestId}
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">{previewEmailLog.subject}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Recipient:{' '}
                  <strong className="text-indigo-300 font-mono">{previewEmailLog.recipient}</strong> &bull;{' '}
                  {new Date(previewEmailLog.sentAt).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleRetryEmail(previewEmailLog.id)}
                  disabled={retryingLogId === previewEmailLog.id}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw
                    className={`w-3.5 h-3.5 ${retryingLogId === previewEmailLog.id ? 'animate-spin' : ''}`}
                  />
                  <span>Retry Dispatch</span>
                </button>
                <button
                  onClick={() => setPreviewEmailLog(null)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-950/60">
              <div className="bg-[#0B0F19] p-5 rounded-2xl border border-slate-800">
                <div
                  className="text-xs text-slate-200"
                  dangerouslySetInnerHTML={{ __html: previewEmailLog.htmlBody }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

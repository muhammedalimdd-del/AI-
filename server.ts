import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { db, UPLOADS_DIR, SafeUserAccount } from './src/server/db.ts';
import { emailService } from './src/server/email.ts';
import { AuthSession, BudgetRequestStatus } from './src/server/types.ts';

dotenv.config();

// Initialize private owner admin account ("alikka") from server-side environment variable
db.initAdminAccount(process.env.ADMIN_PASSWORD);

const app = express();
const isProd = process.env.NODE_ENV === 'production';
// In AI Studio development, dev server must run on port 3000
const PORT = isProd ? parseInt(process.env.PORT || '8080', 10) : 3000;

// Configure express body parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Allow Electron desktop app and cross-origin clients to access API and installer endpoints cleanly
app.use(['/api', '/downloads'], (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, x-session-token, Range'
  );
  res.setHeader(
    'Access-Control-Expose-Headers',
    'Content-Length, Content-Disposition, Accept-Ranges, Content-Range'
  );
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  return next();
});

// Multer storage for secure uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.bin';
    const unique = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    cb(null, unique);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB max for video uploads
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'video/mp4',
      'video/quicktime',
      'video/webm'
    ];
    if (
      allowed.includes(file.mimetype) ||
      file.originalname.match(/\.(jpg|jpeg|png|webp|mp4|mov|webm)$/i)
    ) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: JPG, PNG, WebP, MP4, MOV, WebM'));
    }
  }
});

function getBaseUrl(req: express.Request): string {
  if (process.env.APP_URL && !process.env.APP_URL.includes('MY_APP_URL')) {
    return process.env.APP_URL.replace(/\/$/, '');
  }
  const host = req.get('host') || `localhost:${PORT}`;
  const protocol =
    req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  return `${protocol}://${host}`;
}

function extractSessionToken(req: express.Request): string {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const sessionHeader = req.headers['x-session-token'];
  if (typeof sessionHeader === 'string' && sessionHeader.trim()) {
    return sessionHeader.trim();
  }
  return '';
}

interface AuthenticatedRequest extends express.Request {
  authSession?: AuthSession;
  authUser?: SafeUserAccount;
  sessionToken?: string;
}

function getValidAdminSession(req: express.Request): {
  session: AuthSession;
  user: SafeUserAccount;
  token: string;
} | null {
  const token = extractSessionToken(req);
  if (!token) return null;
  const resolved = db.getSession(token);
  if (!resolved || resolved.user.role !== 'admin') return null;
  return { ...resolved, token };
}

// Middleware: strict private admin check (requires verified opaque session with role === 'admin')
function requireAdmin(req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) {
  const token = extractSessionToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Administrator authentication required.' });
  }
  const resolved = db.getSession(token);
  if (!resolved) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired administrator session.' });
  }
  if (resolved.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Administrator access required.' });
  }
  req.authSession = resolved.session;
  req.authUser = resolved.user;
  req.sessionToken = token;
  return next();
}

// ================= API ROUTES =================

// 1. Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    ownerEmail: process.env.OWNER_NOTIFICATION_EMAIL || db.getSettings().ownerNotificationEmail,
    emailMode: process.env.SMTP_HOST
      ? 'smtp'
      : process.env.RESEND_API_KEY || process.env.EMAIL_PROVIDER_API_KEY
      ? 'resend'
      : 'simulated'
  });
});

// ================= WINDOWS DESKTOP INSTALLER & AUTO-UPDATE ROUTES =================

const DESKTOP_DOWNLOADS_DIR = path.resolve(process.cwd(), 'downloads');
const WINDOWS_INSTALLER_FILENAME = 'AI-Video-Maker-Setup.exe';

function getDesktopVersion(): string {
  try {
    const latestYmlPath = path.join(DESKTOP_DOWNLOADS_DIR, 'latest.yml');
    if (fs.existsSync(latestYmlPath)) {
      const content = fs.readFileSync(latestYmlPath, 'utf-8');
      const match = content.match(/^version:\s*([^\s\r\n]+)/m);
      if (match?.[1]) return match[1].trim();
    }
    const pkgPath = path.resolve(process.cwd(), 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg?.version) return String(pkg.version);
    }
  } catch {}
  return '1.0.0';
}

function formatSizeMb(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 MB';
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

app.get('/api/desktop/info', (_req, res) => {
  const exePath = path.join(DESKTOP_DOWNLOADS_DIR, WINDOWS_INSTALLER_FILENAME);
  const exists = fs.existsSync(exePath) && fs.statSync(exePath).isFile();
  const stat = exists ? fs.statSync(exePath) : null;

  res.json({
    available: exists,
    appName: 'AI Video Maker',
    version: getDesktopVersion(),
    fileName: WINDOWS_INSTALLER_FILENAME,
    sizeBytes: stat ? stat.size : 0,
    sizeFormatted: stat ? formatSizeMb(stat.size) : 'Unavailable',
    updatedAt: stat ? stat.mtime.toISOString() : null,
    platform: 'Windows 10 & Windows 11 (64-bit)',
    downloadUrl: `/downloads/${WINDOWS_INSTALLER_FILENAME}`
  });
});

app.get('/downloads/:filename', (req, res) => {
  const requestedName = path.basename(req.params.filename || '');
  const allowedFiles = [
    WINDOWS_INSTALLER_FILENAME,
    'latest.yml',
    `${WINDOWS_INSTALLER_FILENAME}.blockmap`
  ];

  if (!allowedFiles.includes(requestedName)) {
    return res.status(404).json({
      success: false,
      error: 'Requested desktop download file not found.'
    });
  }

  const filePath = path.join(DESKTOP_DOWNLOADS_DIR, requestedName);
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return res.status(404).json({
      success: false,
      error: `${requestedName} is not available yet. Run the desktop build to generate it.`
    });
  }

  if (requestedName.endsWith('.exe')) {
    res.setHeader('Content-Type', 'application/vnd.microsoft.portable-executable');
    res.setHeader('Content-Disposition', `attachment; filename="${requestedName}"`);
  } else if (requestedName.endsWith('.yml')) {
    res.setHeader('Content-Type', 'text/yaml; charset=utf-8');
  } else {
    res.setHeader('Content-Type', 'application/octet-stream');
  }

  res.setHeader('Cache-Control', 'no-cache');
  return res.sendFile(filePath);
});

// ================= MEDIA & UPLOAD ROUTES =================

// Reference photo upload (open to visitors) and completed video upload (admin only)
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const isVideoUpload =
    req.file.mimetype.startsWith('video/') ||
    /\.(mp4|mov|webm)$/i.test(req.file.originalname);

  if (isVideoUpload && !getValidAdminSession(req)) {
    try {
      fs.unlinkSync(req.file.path);
    } catch {}
    return res.status(401).json({ error: 'Unauthorized: Administrator authentication required for video uploads.' });
  }

  const fileUrl = `/api/media/${req.file.filename}`;
  res.json({
    success: true,
    fileUrl,
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype
  });
});

// Media serving (used for character references in admin emails and completed videos)
app.get('/api/media/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(UPLOADS_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  res.sendFile(filePath);
});

// ================= VIDEO REQUEST ROUTES (OPEN CUSTOMER ACCESS) =================

// Create Video Request (Open to customers without customer accounts — Paid Video-Based Workflow)
app.post('/api/requests', async (req, res) => {
  try {
    const {
      title,
      videoType,
      purpose,
      summary,
      style,
      customStyle,
      format,
      aspectRatio,
      resolution,
      targetPlatform,
      characters,
      characterMode,
      characterConsistencyNote,
      photoConsentConfirmed,
      storyDescription,
      scenes,
      dialogueLines,
      additionalInstructions,
      language,
      duration,
      customDuration,
      outputResolution,
      visualFinish,
      cameraMovementPref,
      voiceOverPref,
      dialoguePref,
      subtitles,
      backgroundMusic,
      soundEffects,
      endingText,
      customerName,
      customerEmail,
      customerPhone,
      emailNotifications,
      termsAccepted
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Request title is required.' });
    }
    const finalCustomerEmail = (customerEmail || '').trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!finalCustomerEmail || !emailRegex.test(finalCustomerEmail) || finalCustomerEmail.endsWith('@aivideomaker.local')) {
      return res.status(400).json({ error: 'A valid Email Address for Video Delivery is required.' });
    }
    if (!customerName || !customerName.trim()) {
      return res.status(400).json({ error: 'Customer name is required.' });
    }
    if (!termsAccepted) {
      return res.status(400).json({ error: 'You must agree to the Terms and Privacy Policy.' });
    }

    // Prevent duplicate rapid submissions (within 30 seconds for the same delivery email + title)
    const recentDuplicate = db.getAllRequests().find(
      (r) =>
        r.customerEmail.toLowerCase() === finalCustomerEmail &&
        r.title.trim().toLowerCase() === title.trim().toLowerCase() &&
        Date.now() - new Date(r.createdAt).getTime() < 30000
    );

    if (recentDuplicate) {
      return res.status(200).json({
        success: true,
        request: recentDuplicate,
        duplicatePrevented: true,
        message: 'Your video request has already been submitted and notification was processed.',
        emailNotification: {
          ownerNotificationSent: true,
          ownerNotificationStatus: 'sent',
          duplicatePrevented: true,
          recipient: 'muhammedalimdd@gmail.com'
        }
      });
    }

    const created = db.createRequest({
      userId: 'visitor',
      userEmail: finalCustomerEmail,
      title: title.trim(),
      videoType: videoType || 'Custom AI Video',
      purpose: purpose || 'Entertainment',
      summary: summary || '',
      style: style || 'Realistic cinematic',
      customStyle: customStyle || '',
      format: format || 'portrait',
      aspectRatio: aspectRatio || '9:16',
      resolution: resolution || '1080 × 1920',
      targetPlatform: targetPlatform || 'Social Media',
      language: language || 'English',
      characters: Array.isArray(characters) ? characters : [],
      characterMode: characterMode || 'both',
      characterConsistencyNote: characterConsistencyNote || '',
      photoConsentConfirmed: !!photoConsentConfirmed,
      storyDescription: storyDescription || '',
      scenes: Array.isArray(scenes) ? scenes : [],
      dialogueLines: Array.isArray(dialogueLines) ? dialogueLines : [],
      additionalInstructions: additionalInstructions || '',
      duration: duration || '30 seconds',
      customDuration: customDuration || '',
      outputResolution: outputResolution || '1080p Full HD',
      visualFinish: visualFinish || 'Cinematic Film',
      cameraMovementPref: cameraMovementPref || 'Dynamic Smooth',
      voiceOverPref: voiceOverPref || 'None',
      dialoguePref: dialoguePref || 'Standard',
      subtitles: !!subtitles,
      backgroundMusic: backgroundMusic || 'Cinematic Ambient',
      soundEffects: soundEffects !== false,
      endingText: endingText || '',
      customerName: customerName.trim(),
      customerEmail: finalCustomerEmail,
      customerPhone: customerPhone ? customerPhone.trim() : undefined,
      emailNotifications: emailNotifications !== false,
      termsAccepted: !!termsAccepted,
      estimatedCompletionDate: new Date(Date.now() + 3 * 24 * 3600 * 1000)
        .toISOString()
        .split('T')[0]
    });

    const baseUrl = getBaseUrl(req);

    // Send notification email via Resend API ONLY after request is successfully saved
    const [ownerEmailResult, customerEmailResult] = await Promise.all([
      emailService.sendOwnerNewRequestNotification(created, baseUrl).catch((e) => {
        console.error('Owner notification email failed:', e);
        return { success: false, status: 'failed' as const, error: e.message, emailLogId: '' };
      }),
      emailService.sendCustomerConfirmation(created, baseUrl).catch((e) => {
        console.error('Customer confirmation email failed:', e);
        return { success: false, status: 'failed' as const, error: e.message, emailLogId: '' };
      })
    ]);

    return res.status(201).json({
      success: true,
      request: created,
      message: ownerEmailResult.success
        ? 'Your video request has been submitted and sent to muhammedalimdd@gmail.com!'
        : 'Your video request has been saved. Admin email notification is queued.',
      emailNotification: {
        ownerNotificationSent: ownerEmailResult.success,
        ownerNotificationStatus: ownerEmailResult.status,
        ownerNotificationError: ownerEmailResult.error,
        provider: (ownerEmailResult as any).provider || 'resend',
        duplicatePrevented: !!(ownerEmailResult as any).duplicatePrevented,
        recipient: 'muhammedalimdd@gmail.com',
        customerConfirmationSent: customerEmailResult.success
      }
    });
  } catch (err: any) {
    console.error('Error submitting video request:', err);
    return res.status(400).json({ error: err.message || 'Failed to submit video request' });
  }
});

// Track Video Request (POST: verifies matching delivery email or secret accessToken, or valid admin session)
app.post('/api/requests/track', (req, res) => {
  try {
    const { requestId, emailOrToken } = req.body || {};
    if (!requestId || !String(requestId).trim()) {
      return res.status(400).json({ error: 'Request ID is required.' });
    }

    const reqId = String(requestId).trim();
    const key = String(emailOrToken || '').trim().toLowerCase();

    const request = db.getRequestById(reqId);
    if (!request) {
      return res.status(404).json({ error: 'Request not found with this ID.' });
    }

    if (getValidAdminSession(req)) {
      return res.json({ success: true, request });
    }

    if (!key) {
      return res.status(401).json({ error: 'Please provide your delivery email address or tracking token.' });
    }

    const isEmailMatch = request.customerEmail.toLowerCase() === key;
    const isTokenMatch = request.accessToken.toLowerCase() === key;
    if (!isEmailMatch && !isTokenMatch) {
      return res.status(403).json({ error: 'Verification failed. Email or Access Token does not match.' });
    }

    return res.json({ success: true, request });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error tracking request.' });
  }
});

// Get Video Request by ID (verifies matching accessToken or admin session)
app.get('/api/requests/:id', (req, res) => {
  const id = req.params.id;
  const queryToken = String(req.query.token || '').trim().toLowerCase();

  const request = db.getRequestById(id);
  if (!request) {
    return res.status(404).json({ error: 'Request not found' });
  }

  if (queryToken && request.accessToken.toLowerCase() === queryToken) {
    return res.json({ success: true, request });
  }

  if (getValidAdminSession(req)) {
    return res.json({ success: true, request });
  }

  return res.status(401).json({ error: 'Unauthorized: Valid tracking token required to view request details.' });
});

// Customer Quote Action (Accept / Decline) — verified via secret token, delivery email, or admin
app.post('/api/requests/:id/quote-action', (req, res) => {
  try {
    const id = req.params.id;
    const { action, customerEmail, token } = req.body || {};

    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be accept or decline.' });
    }

    const request = db.getRequestById(id);
    if (!request) {
      return res.status(404).json({ error: 'Request not found.' });
    }

    const isAdmin = Boolean(getValidAdminSession(req));
    const isTokenMatch = Boolean(
      token && request.accessToken.toLowerCase() === String(token).trim().toLowerCase()
    );
    const isEmailMatch = Boolean(
      customerEmail &&
        request.customerEmail.toLowerCase() === String(customerEmail).trim().toLowerCase()
    );

    if (!isAdmin && !isTokenMatch && !isEmailMatch) {
      return res.status(403).json({ error: 'Verification failed. Valid tracking token or delivery email is required.' });
    }

    const updated = db.respondToQuote(id, action, customerEmail || request.customerEmail);
    if (!updated) {
      return res.status(404).json({ error: 'Request not found or no quote available.' });
    }

    res.json({
      success: true,
      request: updated
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to record quote decision.' });
  }
});

// Customer Clarification Message — verified via secret token, delivery email, or admin
app.post('/api/requests/:id/customer-message', async (req, res) => {
  try {
    const id = req.params.id;
    const { message, token, email, customerEmail } = req.body || {};

    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    const request = db.getRequestById(id);
    if (!request) {
      return res.status(404).json({ error: 'Request not found.' });
    }

    const isAdmin = Boolean(getValidAdminSession(req));
    const isTokenMatch = Boolean(
      token && request.accessToken.toLowerCase() === String(token).trim().toLowerCase()
    );
    const providedEmail = String(email || customerEmail || '').trim().toLowerCase();
    const isEmailMatch = Boolean(
      providedEmail && request.customerEmail.toLowerCase() === providedEmail
    );

    if (!isAdmin && !isTokenMatch && !isEmailMatch) {
      return res.status(403).json({ error: 'Verification failed. Valid tracking token or delivery email is required.' });
    }

    const updated = db.addCustomerClarification(id, String(message).trim());
    const baseUrl = getBaseUrl(req);
    emailService.sendCustomerReplyNotification(updated || request, String(message).trim(), baseUrl).catch(console.error);

    res.json({ success: true, request: updated || request });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to submit customer message.' });
  }
});

// GDPR / Data Erasure Request (verifies delivery email match, or admin)
app.post('/api/privacy/delete-request', (req, res) => {
  try {
    const { email, requestId } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    const isAdmin = Boolean(getValidAdminSession(req));

    if (!cleanEmail && !(isAdmin && requestId)) {
      return res.status(400).json({ error: 'Delivery email address is required for data deletion.' });
    }

    if (requestId) {
      const target = db.getRequestById(String(requestId));
      if (!target) {
        return res.json({ success: true, message: 'No matching records found for deletion.' });
      }
      if (!isAdmin && target.customerEmail.toLowerCase() !== cleanEmail) {
        return res.status(403).json({ error: 'Verification failed: Email address does not match this Request ID.' });
      }
      db.deleteVideoRequest(String(requestId));
    } else if (cleanEmail) {
      const matching = db
        .getAllRequests()
        .filter((r) => r.customerEmail.toLowerCase() === cleanEmail);
      for (const r of matching) {
        db.deleteVideoRequest(r.id);
      }
    }

    res.json({
      success: true,
      message: 'Your matching request data and attached creative references have been permanently removed.'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to process privacy deletion request.' });
  }
});

// Budget / Idea Request Submission (Open to visitors — No Free Option, Video-Based Payment)
app.post('/api/budget-requests', async (req, res) => {
  try {
    const {
      fullName,
      email,
      videoIdea,
      detailedMessage,
      preferredVideoType,
      videoFormat,
      preferredDuration,
      budgetCategory,
      customBudgetAmount,
      referencePhotoUrl,
      referencePhotoName,
      additionalInstructions
    } = req.body || {};

    if (!fullName || !String(fullName).trim()) {
      return res.status(400).json({ error: 'Full Name is required.' });
    }
    if (!email || !String(email).includes('@')) {
      return res.status(400).json({ error: 'Valid email address is required.' });
    }
    if (!videoIdea || !String(videoIdea).trim()) {
      return res.status(400).json({ error: 'Video Idea description is required.' });
    }

    const category: 'STANDARD' | 'CUSTOM' = budgetCategory === 'CUSTOM' ? 'CUSTOM' : 'STANDARD';
    const budgetAmount =
      category === 'CUSTOM' && customBudgetAmount
        ? `Target: ${String(customBudgetAmount).trim()} (The payment will be based on the video.)`
        : 'The payment will be based on the video.';

    let aspectRatio = '16:9';
    if (videoFormat === 'portrait') aspectRatio = '9:16';
    if (videoFormat === 'square') aspectRatio = '1:1';

    const normalizedBudgetEmail = String(email).trim().toLowerCase();
    const recentBudgetDuplicate = db.getAllBudgetRequests().find(
      (b) =>
        b.email.toLowerCase() === normalizedBudgetEmail &&
        b.videoIdea.trim().toLowerCase() === String(videoIdea).trim().toLowerCase() &&
        Date.now() - new Date(b.createdAt).getTime() < 30000
    );

    if (recentBudgetDuplicate) {
      return res.status(200).json({
        success: true,
        budgetRequest: recentBudgetDuplicate,
        duplicatePrevented: true,
        message: 'Your request has already been submitted and notification was processed.',
        emailNotification: {
          ownerNotificationSent: true,
          ownerNotificationStatus: 'sent',
          duplicatePrevented: true,
          recipient: 'muhammedalimdd@gmail.com'
        }
      });
    }

    const created = db.createBudgetRequest({
      fullName: String(fullName).trim(),
      email: normalizedBudgetEmail,
      videoIdea: String(videoIdea).trim(),
      detailedMessage: detailedMessage ? String(detailedMessage).trim() : undefined,
      preferredVideoType: preferredVideoType || 'cinematic',
      videoFormat: videoFormat || 'landscape',
      aspectRatio,
      preferredDuration: preferredDuration || '30 seconds',
      budgetCategory: category,
      budgetAmount,
      isFree: false,
      referencePhotoUrl: referencePhotoUrl || '',
      referencePhotoName: referencePhotoName || '',
      additionalInstructions: additionalInstructions || '',
      status: 'Submitted'
    });

    const baseUrl = getBaseUrl(req);
    const [ownerEmailResult, customerEmailResult] = await Promise.all([
      emailService
        .sendOwnerBudgetRequestNotification(created, baseUrl)
        .catch((e) => {
          console.error('Owner budget notification failed:', e);
          return { success: false, status: 'failed' as const, error: e.message, emailLogId: '' };
        }),
      emailService
        .sendCustomerBudgetConfirmation(created)
        .catch((e) => {
          console.error('Customer budget confirmation failed:', e);
          return { success: false, status: 'failed' as const, error: e.message, emailLogId: '' };
        })
    ]);

    res.status(201).json({
      success: true,
      budgetRequest: created,
      message: ownerEmailResult.success
        ? 'Your request has been submitted and sent to muhammedalimdd@gmail.com!'
        : 'Your request has been saved. Admin email notification is queued.',
      emailNotification: {
        ownerNotificationSent: ownerEmailResult.success,
        ownerNotificationStatus: ownerEmailResult.status,
        ownerNotificationError: ownerEmailResult.error,
        provider: (ownerEmailResult as any).provider || 'resend',
        duplicatePrevented: !!(ownerEmailResult as any).duplicatePrevented,
        recipient: 'muhammedalimdd@gmail.com',
        customerConfirmationSent: customerEmailResult.success
      }
    });
  } catch (err: any) {
    console.error('Failed to submit budget request:', err);
    res.status(400).json({ error: err.message || 'Failed to submit budget request.' });
  }
});

// Request Email Notification via Resend (verified via admin session or matching request accessToken)
const handleSendRequestNotificationEmail = async (req: express.Request, res: express.Response) => {
  try {
    const { requestId, forceRetry, token } = req.body || {};
    if (!requestId || typeof requestId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'A valid submitted requestId is required to send the admin notification email.'
      });
    }

    const isAdmin = Boolean(getValidAdminSession(req));
    const baseUrl = getBaseUrl(req);
    const videoReq = db.getRequestById(requestId.trim());
    if (videoReq) {
      const isTokenMatch = Boolean(
        token && videoReq.accessToken.toLowerCase() === String(token).trim().toLowerCase()
      );
      if (!isAdmin && !isTokenMatch) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }
      const result = await emailService.sendOwnerNewRequestNotification(videoReq, baseUrl, {
        forceRetry: Boolean(forceRetry && isAdmin)
      });
      return res.status(result.success ? 200 : 202).json({
        success: result.success,
        status: result.status,
        provider: result.provider || 'resend',
        recipient: 'muhammedalimdd@gmail.com',
        requestId: videoReq.id,
        duplicatePrevented: Boolean(result.duplicatePrevented),
        emailLogId: result.emailLogId,
        message: result.duplicatePrevented
          ? `Notification for ${videoReq.id} was already sent to muhammedalimdd@gmail.com (duplicate prevented).`
          : result.success
          ? `Notification for ${videoReq.id} sent to muhammedalimdd@gmail.com via Resend.`
          : result.error,
        error: result.error
      });
    }

    const budgetReq = db.getBudgetRequestById(requestId.trim());
    if (budgetReq) {
      if (!isAdmin) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }
      const result = await emailService.sendOwnerBudgetRequestNotification(budgetReq, baseUrl, {
        forceRetry: Boolean(forceRetry)
      });
      return res.status(result.success ? 200 : 202).json({
        success: result.success,
        status: result.status,
        provider: result.provider || 'resend',
        recipient: 'muhammedalimdd@gmail.com',
        requestId: budgetReq.id,
        duplicatePrevented: Boolean(result.duplicatePrevented),
        emailLogId: result.emailLogId,
        message: result.duplicatePrevented
          ? `Notification for ${budgetReq.id} was already sent to muhammedalimdd@gmail.com (duplicate prevented).`
          : result.success
          ? `Notification for ${budgetReq.id} sent to muhammedalimdd@gmail.com via Resend.`
          : result.error,
        error: result.error
      });
    }

    return res.status(404).json({
      success: false,
      error: 'Cannot send email notification: Request ID not found.'
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to dispatch request notification email.'
    });
  }
};

app.post('/api/notifications/send-request-email', handleSendRequestNotificationEmail);
app.post('/api/send-request-email', handleSendRequestNotificationEmail);

// ================= PRIVATE ADMIN API ROUTES =================

// Admin Login (Requires username "alikka" and verified server-side secret password; returns opaque session token)
app.post('/api/admin/login', (req, res) => {
  try {
    const { username, password } = req.body || {};
    const result = db.loginAdminAccount({ username, password });
    return res.json({
      success: true,
      user: result.user,
      token: result.session.token
    });
  } catch (err: any) {
    return res.status(401).json({ error: err.message || 'Invalid administrator credentials.' });
  }
});

// Admin Logout (Session revocation)
const handleAdminLogout = (req: express.Request, res: express.Response) => {
  try {
    const token = extractSessionToken(req);
    if (token) {
      db.revokeSession(token);
    }
    res.json({
      success: true,
      message: 'Signed out successfully.'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
app.post('/api/admin/logout', handleAdminLogout);
app.post('/api/auth/logout', handleAdminLogout);

// Verify active admin session
app.get('/api/admin/session', requireAdmin, (req: AuthenticatedRequest, res) => {
  res.json({
    success: true,
    user: req.authUser
  });
});

// Admin Change Password
app.post('/api/admin/change-password', requireAdmin, (req: AuthenticatedRequest, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body || {};
    db.changeAdminPassword({
      adminUid: req.authUser!.uid,
      currentPassword,
      newPassword,
      confirmPassword,
      keepToken: req.sessionToken
    });
    res.json({
      success: true,
      message: 'Administrator password updated successfully.'
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update admin password.' });
  }
});

// Admin Video Requests List & Stats
app.get('/api/admin/requests', requireAdmin, (req, res) => {
  const requests = db.getAllRequests();
  const filter = (req.query.filter as string) || 'all';

  let filtered = requests;
  if (filter === 'paid') {
    filtered = requests.filter((r) => r.requestType === 'paid');
  } else if (filter === 'quoted') {
    filtered = requests.filter((r) => r.quote && r.quote.status === 'sent');
  } else if (filter === 'approved') {
    filtered = requests.filter((r) => r.status === 'Approved');
  } else if (filter === 'in_production') {
    filtered = requests.filter((r) => r.status === 'In Production');
  } else if (filter === 'completed') {
    filtered = requests.filter((r) => r.status === 'Completed' || r.status === 'Delivered');
  }

  const stats = {
    total: requests.length,
    paid: requests.length,
    awaitingReview: requests.filter((r) => r.status === 'Submitted' || r.status === 'Under Review').length,
    awaitingCustomerQuoteApproval: requests.filter((r) => r.quote && r.quote.status === 'sent').length,
    inProduction: requests.filter((r) => r.status === 'In Production').length,
    completed: requests.filter((r) => r.status === 'Completed' || r.status === 'Delivered').length,
    failedEmails: db.getEmailLogs().filter((l) => l.status === 'failed').length
  };

  res.json({
    success: true,
    stats,
    requests: filtered
  });
});

app.get('/api/admin/audit-logs', requireAdmin, (_req, res) => {
  res.json({
    success: true,
    auditLogs: db.getAuditLogs()
  });
});

// Admin Send Custom Quote to Customer
app.post('/api/admin/requests/:id/quote', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, currency, breakdown, validUntil, paymentLink, adminNotes } = req.body;

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Valid numeric quote amount is required.' });
    }

    const updated = db.setQuote(id, {
      amount: Number(amount),
      currency: currency || '₹',
      breakdown,
      validUntil,
      paymentLink,
      adminNotes
    });

    if (!updated) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const baseUrl = getBaseUrl(req);
    if (updated.quote) {
      emailService
        .sendCustomerQuoteNotification(updated, updated.quote, baseUrl)
        .catch((e) => console.error('Quote email notification failed:', e));
    }

    res.json({
      success: true,
      request: updated
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Record / Confirm Payment
app.post('/api/admin/requests/:id/payment', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, amount, paymentMethod, transactionRef } = req.body;

    const updated = db.recordPayment(id, {
      status: status || 'verified',
      amount,
      paymentMethod,
      transactionRef
    });

    if (!updated) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const baseUrl = getBaseUrl(req);
    if (status === 'verified') {
      emailService
        .sendPaymentConfirmedNotification(updated, baseUrl)
        .catch((e) => console.error('Payment confirmation email failed:', e));
    }

    res.json({
      success: true,
      request: updated
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Deliver Completed Video to Customer Email
const handleAdminDeliverVideo = async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const { directLink, downloadUrl, filename, sizeBytes, message } = req.body;

    const rawLink = (directLink || downloadUrl || '').trim();
    if (!rawLink) {
      return res.status(400).json({ error: 'Video download link or uploaded video file is required.' });
    }

    const baseUrl = getBaseUrl(req);
    const fullDownloadUrl = rawLink.startsWith('http')
      ? rawLink
      : `${baseUrl}${rawLink.startsWith('/') ? '' : '/'}${rawLink}`;

    const updated = db.deliverVideo(id, {
      directLink: rawLink,
      downloadUrl: fullDownloadUrl,
      filename,
      sizeBytes,
      message
    });
    if (!updated) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const emailResult = await emailService
      .sendVideoDelivery(
        updated,
        {
          downloadUrl: fullDownloadUrl,
          customMessage: message
        },
        baseUrl
      )
      .catch((e) => {
        console.error('Video delivery email failed:', e);
        return { success: false, status: 'failed' as const, error: e.message, emailLogId: '' };
      });

    res.json({
      success: true,
      request: updated,
      emailResult
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

app.post('/api/admin/requests/:id/deliver-video', requireAdmin, handleAdminDeliverVideo);
app.post('/api/admin/requests/:id/deliver', requireAdmin, handleAdminDeliverVideo);

// Admin Get Request by ID
app.get('/api/admin/requests/:id', requireAdmin, (req, res) => {
  const request = db.getRequestById(req.params.id);
  if (!request) return res.status(404).json({ error: 'Request not found' });
  res.json({ success: true, request });
});

// Admin Update Request Details
app.patch('/api/admin/requests/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { status, note, estimatedCompletionDate, customerVisibleNotes, internalNote } = req.body;

  const request = db.getRequestById(id);
  if (!request) return res.status(404).json({ error: 'Request not found' });

  if (internalNote) {
    request.internalAdminNotes.push(`[${new Date().toLocaleDateString()}] ${internalNote}`);
  }

  const updated = db.updateRequest(
    id,
    {
      status: status || request.status,
      estimatedCompletionDate: estimatedCompletionDate !== undefined ? estimatedCompletionDate : request.estimatedCompletionDate,
      customerVisibleNotes: customerVisibleNotes !== undefined ? customerVisibleNotes : request.customerVisibleNotes
    },
    'admin',
    note
  );

  res.json({ success: true, request: updated });
});

// Admin Update Status
app.patch('/api/admin/requests/:id/status', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { status, note, estimatedCompletionDate, customerVisibleNotes } = req.body;

  const updated = db.updateRequest(
    id,
    {
      status,
      estimatedCompletionDate,
      customerVisibleNotes
    },
    'admin',
    note
  );

  if (!updated) {
    return res.status(404).json({ error: 'Request not found' });
  }

  res.json({ success: true, request: updated });
});

// Admin Add Internal Note
app.post('/api/admin/requests/:id/notes', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { note } = req.body;

  const request = db.getRequestById(id);
  if (!request) {
    return res.status(404).json({ error: 'Request not found' });
  }

  request.internalAdminNotes.push(`[${new Date().toLocaleDateString()}] ${note}`);
  request.updatedAt = new Date().toISOString();

  res.json({ success: true, request });
});

// Admin Budget Requests endpoints
app.get('/api/admin/budget-requests', requireAdmin, (req, res) => {
  const all = db.getAllBudgetRequests();
  const filter = (req.query.filter as string) || 'all';

  let filtered = all;
  if (['Submitted', 'Under Review', 'Accepted', 'Declined', 'Completed'].includes(filter)) {
    filtered = all.filter((r) => r.status === filter);
  }

  const stats = {
    total: all.length,
    submitted: all.filter((r) => r.status === 'Submitted').length,
    underReview: all.filter((r) => r.status === 'Under Review').length,
    accepted: all.filter((r) => r.status === 'Accepted').length,
    declined: all.filter((r) => r.status === 'Declined').length,
    completed: all.filter((r) => r.status === 'Completed').length
  };

  res.json({ success: true, stats, budgetRequests: filtered });
});

app.get('/api/admin/budget-requests/:id', requireAdmin, (req, res) => {
  const reqItem = db.getBudgetRequestById(req.params.id);
  if (!reqItem) {
    return res.status(404).json({ error: 'Budget request not found.' });
  }
  res.json({ success: true, budgetRequest: reqItem });
});

app.patch('/api/admin/budget-requests/:id', requireAdmin, (req, res) => {
  const updated = db.updateBudgetRequest(req.params.id, req.body as Partial<any>);
  if (!updated) return res.status(404).json({ error: 'Budget request not found.' });
  res.json({ success: true, budgetRequest: updated });
});

app.post('/api/admin/budget-requests/:id/reply', requireAdmin, async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) return res.status(400).json({ error: 'Message cannot be empty.' });

  const updated = db.addBudgetReply(req.params.id, { from: 'admin', message: message.trim() });
  if (!updated) return res.status(404).json({ error: 'Budget request not found.' });

  const baseUrl = getBaseUrl(req);
  emailService.sendBudgetRequestReply(updated, message.trim(), baseUrl).catch(console.error);

  res.json({ success: true, budgetRequest: updated });
});

// Admin Email Logs & Settings
app.get('/api/admin/email-logs', requireAdmin, (_req, res) => {
  res.json({ success: true, emailLogs: db.getEmailLogs() });
});

app.post('/api/admin/email/test-connection', requireAdmin, async (req, res) => {
  try {
    const { recipientEmail } = req.body;
    const testResult = await emailService.sendTestEmail(recipientEmail);
    res.json(testResult);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to send test email.'
    });
  }
});

app.post('/api/admin/email/:id/retry', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const retryResult = await emailService.retryEmail(id);
    res.json(retryResult);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/admin/requests/:id/resend-owner-email', requireAdmin, async (req, res) => {
  try {
    const request = db.getRequestById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }
    const baseUrl = getBaseUrl(req);
    const result = await emailService.sendOwnerNewRequestNotification(request, baseUrl, {
      forceRetry: true
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

function getSanitizedSettingsForClient() {
  const raw = db.getSettings();
  const hasServerResendKey = Boolean(
    process.env.RESEND_API_KEY || process.env.EMAIL_PROVIDER_API_KEY || raw.apiKey
  );
  return {
    ...raw,
    ownerNotificationEmail: raw.ownerNotificationEmail || 'muhammedalimdd@gmail.com',
    emailProvider: raw.emailProvider || 'resend',
    apiKey: raw.apiKey ? '••••••••' : '',
    smtpPass: raw.smtpPass ? '••••••••' : '',
    hasResendApiKey: hasServerResendKey
  };
}

app.get('/api/admin/settings', requireAdmin, (_req, res) => {
  res.json({ success: true, settings: getSanitizedSettingsForClient() });
});

app.post('/api/admin/settings', requireAdmin, (req, res) => {
  const body = { ...(req.body || {}) };
  const current = db.getSettings();
  if (body.apiKey === '••••••••' || body.apiKey === '') {
    body.apiKey = body.apiKey === '' ? '' : current.apiKey;
  }
  if (body.smtpPass === '••••••••' || body.smtpPass === '') {
    body.smtpPass = body.smtpPass === '' ? '' : current.smtpPass;
  }
  db.updateSettings(body);
  res.json({ success: true, settings: getSanitizedSettingsForClient() });
});

app.post('/api/admin/reset-all', requireAdmin, (_req, res) => {
  db.resetAllData();
  res.json({
    success: true,
    message: 'All customer accounts, sessions, and requests have been reset.'
  });
});

// Catch-all for API routes to ALWAYS return JSON and never HTML
app.all('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `API endpoint ${req.method} ${req.originalUrl} not found`
  });
});

// JSON Error Handling Middleware for API
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.originalUrl.startsWith('/api/')) {
    console.error('API Error:', err);
    return res.status(err.status || 500).json({
      success: false,
      error: err.message || 'Internal Server Error'
    });
  }
  next(err);
});

// ================= FRONTEND VITE INTEGRATION =================
async function startServer() {
  const httpServer = http.createServer(app);

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        ws: { server: httpServer },
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
        watch: process.env.DISABLE_HMR === 'true' ? null : {}
      }
    });
    app.use(vite.middlewares);
    app.use('*', async (req, res, next) => {
      if (
        req.originalUrl.startsWith('/api/') ||
        req.originalUrl.startsWith('/uploads/') ||
        req.originalUrl.startsWith('/downloads/')
      ) {
        return next();
      }
      try {
        const indexPath = path.resolve(process.cwd(), 'index.html');
        let template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (
        req.originalUrl.startsWith('/api/') ||
        req.originalUrl.startsWith('/uploads/') ||
        req.originalUrl.startsWith('/downloads/')
      ) {
        return res.status(404).json({ success: false, error: 'Endpoint not found' });
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`AI TIMES — AI Video Maker running on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error('Server failed to start:', err);
    process.exit(1);
  });
}

export default app;

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  DatabaseSchema,
  VideoRequest,
  BudgetRequest,
  EmailLog,
  VideoStatus,
  UserAccount,
  AuditLog,
  QuoteDetails,
  PaymentDetails,
  AuthSession
} from './types.ts';

function resolveWritableDataDir(): string {
  const localDir = path.resolve(process.cwd(), 'data');
  if (process.env.VERCEL) {
    return '/tmp/aivm-data';
  }
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    const testFile = path.join(localDir, '.write-test');
    fs.writeFileSync(testFile, 'ok');
    fs.unlinkSync(testFile);
    return localDir;
  } catch {
    return '/tmp/aivm-data';
  }
}

const DATA_DIR = resolveWritableDataDir();
const DB_FILE = path.join(DATA_DIR, 'db.json');
const SEED_DB_FILE = path.resolve(process.cwd(), 'data', 'db.json');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
} catch (dirErr) {
  console.warn('Directory initialization notice:', dirErr);
}

const defaultOwnerEmail = process.env.OWNER_NOTIFICATION_EMAIL || 'muhammedalimdd@gmail.com';
const defaultFromEmail = process.env.EMAIL_FROM_ADDRESS || 'studio@aivideomaker.com';

const RESERVED_USERNAMES = new Set([
  'ali',
  'admin',
  'administrator',
  'root',
  'owner',
  'superadmin',
  'studioadmin'
]);

const INITIAL_DB: DatabaseSchema = {
  users: [],
  sessions: [],
  auditLogs: [],
  requests: [],
  emailLogs: [],
  budgetRequests: [],
  settings: {
    ownerNotificationEmail: defaultOwnerEmail,
    emailFromAddress: defaultFromEmail,
    defaultTurnaroundDays: 3,
    emailProvider: 'resend',
    smtpHost: 'smtp.gmail.com',
    smtpPort: 465,
    smtpSecure: true,
    smtpUser: defaultOwnerEmail,
    smtpPass: ''
  }
};

// ---------------- PASSWORD HASHING & SANITIZATION ----------------

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, hash?: string, salt?: string): boolean {
  if (!password || !hash || !salt) return false;
  try {
    const checkHash = crypto.scryptSync(password, salt, 64).toString('hex');
    if (hash.length === checkHash.length) {
      return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(checkHash, 'hex'));
    }
    return false;
  } catch {
    return false;
  }
}

export interface SafeUserAccount {
  uid: string;
  username: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: string;
  lastLoginAt: string;
  role: 'customer' | 'admin';
  hasRecoveryEmail: boolean;
}

export function sanitizeUser(user: UserAccount): SafeUserAccount {
  const normalizedRole: 'customer' | 'admin' = user.role === 'admin' ? 'admin' : 'customer';
  const cleanEmail =
    user.email && !user.email.endsWith('@aivideomaker.local') ? user.email : '';
  return {
    uid: user.uid,
    username: user.username,
    email: cleanEmail,
    displayName: user.displayName || user.username,
    photoURL: user.photoURL,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
    role: normalizedRole,
    hasRecoveryEmail: Boolean(cleanEmail && cleanEmail.includes('@'))
  };
}

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    try {
      const fileToRead = fs.existsSync(DB_FILE)
        ? DB_FILE
        : fs.existsSync(SEED_DB_FILE)
        ? SEED_DB_FILE
        : null;

      if (fileToRead) {
        const raw = fs.readFileSync(fileToRead, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.requests)) {
          if (!Array.isArray(parsed.budgetRequests)) parsed.budgetRequests = [];
          if (!Array.isArray(parsed.users)) parsed.users = [];
          if (!Array.isArray(parsed.auditLogs)) parsed.auditLogs = [];
          if (!Array.isArray(parsed.sessions)) parsed.sessions = [];
          if (!Array.isArray(parsed.emailLogs)) parsed.emailLogs = [];
          if (!parsed.settings) parsed.settings = INITIAL_DB.settings;

          // Normalize any legacy user roles
          parsed.users = parsed.users.map((u: any) => ({
            ...u,
            role: u.role === 'admin' ? 'admin' : 'customer'
          }));

          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to parse database file, initializing fresh:', e);
    }
    this.persist(INITIAL_DB);
    return INITIAL_DB;
  }

  private persist(dataToSave: DatabaseSchema) {
    this.data = dataToSave;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tempPath = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(dataToSave, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.warn('Database write notice (in-memory state preserved):', err);
    }
  }

  public resetAllData(): void {
    // Preserve the admin account so the owner isn't locked out after resetting customer data
    const adminUser = this.getAdminUser();
    const adminSessions = adminUser
      ? this.data.sessions.filter((s) => s.userId === adminUser.uid)
      : [];
    const cleanState: DatabaseSchema = {
      users: adminUser ? [adminUser] : [],
      sessions: adminSessions,
      auditLogs: [],
      requests: [],
      emailLogs: [],
      budgetRequests: [],
      settings: this.data?.settings || INITIAL_DB.settings
    };
    this.persist(cleanState);
  }

  // ---------------- ADMIN ACCOUNT INITIALIZATION & AUTH ----------------

  public getAdminUser(): UserAccount | undefined {
    return this.data.users.find(
      (u) => u.role === 'admin' && u.username?.trim().toLowerCase() === 'ali'
    );
  }

  public hasAdminAccount(): boolean {
    const admin = this.getAdminUser();
    return Boolean(admin && admin.passwordHash && admin.passwordSalt);
  }

  public initAdminAccount(envPassword?: string): void {
    const cleanPass = (envPassword || '').trim();
    const existingAdmin = this.getAdminUser();

    if (existingAdmin) {
      // Only update hash if ADMIN_PASSWORD is provided AND admin had no password yet (or explicit sync requested)
      if (cleanPass && (!existingAdmin.passwordHash || process.env.ADMIN_PASSWORD_SYNC === 'true')) {
        const { hash, salt } = hashPassword(cleanPass);
        existingAdmin.passwordHash = hash;
        existingAdmin.passwordSalt = salt;
        this.persist({ ...this.data });
      }
      return;
    }

    if (!cleanPass) {
      console.warn(
        '[SECURITY] ADMIN_PASSWORD is not set and admin account "ali" is not yet initialized. ' +
          'Set ADMIN_PASSWORD in your environment or complete one-time setup at /admin.'
      );
      return;
    }

    const now = new Date().toISOString();
    const { hash, salt } = hashPassword(cleanPass);
    const adminUser: UserAccount = {
      uid: 'adm_ali',
      username: 'ali',
      displayName: 'Ali (Studio Owner)',
      email: defaultOwnerEmail,
      passwordHash: hash,
      passwordSalt: salt,
      createdAt: now,
      lastLoginAt: now,
      role: 'admin'
    };

    this.data.users.push(adminUser);
    this.persist({ ...this.data });
  }

  public setupInitialAdminPassword(params: {
    password: string;
    confirmPassword: string;
  }): { user: SafeUserAccount; session: AuthSession } {
    if (this.hasAdminAccount()) {
      throw new Error('Admin account is already initialized.');
    }
    const password = params.password || '';
    const confirmPassword = params.confirmPassword || '';
    if (password.length < 6) {
      throw new Error('Admin password must be at least 6 characters long.');
    }
    if (password !== confirmPassword) {
      throw new Error('Passwords do not match.');
    }

    const now = new Date().toISOString();
    const { hash, salt } = hashPassword(password);
    let admin = this.getAdminUser();
    if (!admin) {
      admin = {
        uid: 'adm_ali',
        username: 'ali',
        displayName: 'Ali (Studio Owner)',
        email: defaultOwnerEmail,
        passwordHash: hash,
        passwordSalt: salt,
        createdAt: now,
        lastLoginAt: now,
        role: 'admin'
      };
      this.data.users.push(admin);
    } else {
      admin.passwordHash = hash;
      admin.passwordSalt = salt;
      admin.lastLoginAt = now;
    }

    const sessionToken = crypto.randomBytes(32).toString('hex');
    const session: AuthSession = {
      token: sessionToken,
      userId: admin.uid,
      username: admin.username,
      role: 'admin',
      createdAt: now,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
    };

    this.data.sessions.push(session);
    this.persist({ ...this.data });
    return { user: sanitizeUser(admin), session };
  }

  public loginAdminAccount(params: {
    username: string;
    password: string;
  }): { user: SafeUserAccount; session: AuthSession } {
    const username = (params.username || '').trim().toLowerCase();
    const password = params.password || '';

    if (username !== 'ali' || !password) {
      throw new Error('Incorrect admin username or password.');
    }

    const admin = this.getAdminUser();
    if (!admin || !admin.passwordHash || !admin.passwordSalt) {
      throw new Error('Admin account is not initialized.');
    }

    const isValid = verifyPassword(password, admin.passwordHash, admin.passwordSalt);
    if (!isValid) {
      throw new Error('Incorrect admin username or password.');
    }

    const now = new Date().toISOString();
    admin.lastLoginAt = now;

    const sessionToken = crypto.randomBytes(32).toString('hex');
    const newSession: AuthSession = {
      token: sessionToken,
      userId: admin.uid,
      username: admin.username,
      role: 'admin',
      createdAt: now,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
    };

    this.data.sessions.push(newSession);
    this.persist({ ...this.data });

    return {
      user: sanitizeUser(admin),
      session: newSession
    };
  }

  public changeAdminPassword(params: {
    adminUid: string;
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
    keepToken?: string;
  }): void {
    const admin = this.data.users.find(
      (u) => u.uid === params.adminUid && u.role === 'admin'
    );
    if (!admin) {
      throw new Error('Admin account not found.');
    }
    if (!verifyPassword(params.currentPassword, admin.passwordHash, admin.passwordSalt)) {
      throw new Error('Current admin password is incorrect.');
    }
    if (!params.newPassword || params.newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long.');
    }
    if (params.newPassword !== params.confirmPassword) {
      throw new Error('New passwords do not match.');
    }

    const { hash, salt } = hashPassword(params.newPassword);
    admin.passwordHash = hash;
    admin.passwordSalt = salt;

    // Revoke other admin sessions
    this.data.sessions = this.data.sessions.filter(
      (s) => s.userId !== admin.uid || (params.keepToken && s.token === params.keepToken)
    );

    this.data.auditLogs.unshift({
      id: `aud-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      timestamp: new Date().toISOString(),
      action: 'ADMIN_PASSWORD_CHANGED',
      adminEmail: admin.email || 'ali',
      targetUserEmail: admin.username,
      details: 'Administrator password was updated.'
    });

    this.persist({ ...this.data });
  }

  // ---------------- CUSTOMER ACCOUNT AUTHENTICATION & ISOLATION ----------------

  public getUserByUid(uid: string): UserAccount | undefined {
    return this.data.users.find((u) => u.uid === uid);
  }

  public getUserByUsername(username: string): UserAccount | undefined {
    if (!username) return undefined;
    const normalized = username.trim().toLowerCase();
    return this.data.users.find((u) => u.username?.trim().toLowerCase() === normalized);
  }

  public getUserByEmail(email: string): UserAccount | undefined {
    if (!email) return undefined;
    const normalized = email.trim().toLowerCase();
    return this.data.users.find((u) => u.email?.trim().toLowerCase() === normalized);
  }

  public registerCustomerAccount(params: {
    username: string;
    password: string;
    confirmPassword?: string;
    email?: string;
  }): { user: SafeUserAccount; session: AuthSession; recoveryKey: string } {
    const username = (params.username || '').trim();
    const password = params.password || '';
    const confirmPassword = params.confirmPassword;
    const rawEmail = (params.email || '').trim().toLowerCase();

    if (!username || username.length < 2) {
      throw new Error('Please enter a name or username (at least 2 characters).');
    }
    if (!/^[a-zA-Z0-9_.\- ]+$/.test(username)) {
      throw new Error('Username may only contain letters, numbers, spaces, underscores, dots, and hyphens.');
    }
    if (RESERVED_USERNAMES.has(username.toLowerCase())) {
      throw new Error('This username is reserved. Please choose a different username.');
    }

    if (rawEmail) {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(rawEmail)) {
        throw new Error('Please enter a valid recovery email address.');
      }
    }

    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }
    if (confirmPassword !== undefined && password !== confirmPassword) {
      throw new Error('Passwords do not match. Please confirm your password.');
    }

    if (this.getUserByUsername(username)) {
      throw new Error('This username is already taken. Please choose a different username or log in.');
    }

    const now = new Date().toISOString();
    const userId = `usr_${crypto.randomBytes(8).toString('hex')}`;
    const { hash, salt } = hashPassword(password);

    // One-time recovery key for password reset fallback
    const recoveryKey = `AT-${crypto.randomBytes(2).toString('hex').toUpperCase()}-${crypto
      .randomBytes(2)
      .toString('hex')
      .toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const recoveryHashed = hashPassword(recoveryKey);

    const newUser: UserAccount = {
      uid: userId,
      username,
      displayName: username,
      email: rawEmail,
      passwordHash: hash,
      passwordSalt: salt,
      recoveryKeyHash: recoveryHashed.hash,
      recoveryKeySalt: recoveryHashed.salt,
      createdAt: now,
      lastLoginAt: now,
      role: 'customer'
    };

    const sessionToken = crypto.randomBytes(32).toString('hex');
    const newSession: AuthSession = {
      token: sessionToken,
      userId,
      username,
      role: 'customer',
      createdAt: now,
      expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString()
    };

    this.data.users.push(newUser);
    this.data.sessions.push(newSession);
    this.persist({ ...this.data });

    return {
      user: sanitizeUser(newUser),
      session: newSession,
      recoveryKey
    };
  }

  public loginCustomerAccount(params: {
    username: string;
    password: string;
  }): { user: SafeUserAccount; session: AuthSession } {
    const username = (params.username || '').trim();
    const password = params.password || '';

    if (!username || !password) {
      throw new Error('Incorrect username or password. Please try again.');
    }

    const user = this.getUserByUsername(username);
    // Reject missing user or admin user attempting login through customer portal
    if (!user || user.role === 'admin') {
      throw new Error('Incorrect username or password. Please try again.');
    }

    if (!user.passwordHash || !user.passwordSalt) {
      throw new Error('Incorrect username or password. Please try again.');
    }

    const isValid = verifyPassword(password, user.passwordHash, user.passwordSalt);
    if (!isValid) {
      throw new Error('Incorrect username or password. Please try again.');
    }

    const now = new Date().toISOString();
    user.lastLoginAt = now;

    const sessionToken = crypto.randomBytes(32).toString('hex');
    const newSession: AuthSession = {
      token: sessionToken,
      userId: user.uid,
      username: user.username,
      role: 'customer',
      createdAt: now,
      expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString()
    };

    this.data.sessions.push(newSession);
    this.persist({ ...this.data });

    return {
      user: sanitizeUser(user),
      session: newSession
    };
  }

  public requestCustomerPasswordReset(params: {
    username: string;
    email?: string;
  }): {
    found: boolean;
    canSendEmail: boolean;
    email?: string;
    code?: string;
    username?: string;
  } {
    const username = (params.username || '').trim();
    const user = this.getUserByUsername(username);
    if (!user || user.role === 'admin') {
      return { found: false, canSendEmail: false };
    }

    const targetEmail = (user.email || params.email || '').trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    // Only email code if the customer registered with an email (or has a request delivery email matching)
    const userHasMatchingEmail = Boolean(user.email && emailRegex.test(user.email));
    if (!userHasMatchingEmail && targetEmail && emailRegex.test(targetEmail)) {
      const ownsRequestWithEmail = this.data.requests.some(
        (r) => r.userId === user.uid && r.customerEmail?.toLowerCase() === targetEmail
      );
      if (ownsRequestWithEmail) {
        user.email = targetEmail;
      }
    }

    if (user.email && emailRegex.test(user.email)) {
      const code = String(crypto.randomInt(100000, 999999));
      const hashedCode = hashPassword(code);
      user.resetCodeHash = `${hashedCode.salt}:${hashedCode.hash}`;
      user.resetCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      this.persist({ ...this.data });
      return {
        found: true,
        canSendEmail: true,
        email: user.email,
        code,
        username: user.username
      };
    }

    return {
      found: true,
      canSendEmail: false,
      username: user.username
    };
  }

  public completeCustomerPasswordReset(params: {
    username: string;
    resetCodeOrKey: string;
    newPassword: string;
    confirmPassword: string;
  }): void {
    const username = (params.username || '').trim();
    const codeOrKey = (params.resetCodeOrKey || '').trim();
    const newPassword = params.newPassword || '';
    const confirmPassword = params.confirmPassword || '';

    const user = this.getUserByUsername(username);
    if (!user || user.role === 'admin') {
      throw new Error('Unable to verify recovery credentials.');
    }
    if (!codeOrKey) {
      throw new Error('Please enter your Recovery Key or 6-digit email reset code.');
    }
    if (newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long.');
    }
    if (newPassword !== confirmPassword) {
      throw new Error('Passwords do not match.');
    }

    let verified = false;

    // 1. Check 6-digit email OTP
    if (user.resetCodeHash && user.resetCodeExpiresAt) {
      if (new Date(user.resetCodeExpiresAt).getTime() > Date.now()) {
        const [salt, hash] = user.resetCodeHash.split(':');
        if (verifyPassword(codeOrKey, hash, salt)) {
          verified = true;
        }
      }
    }

    // 2. Check one-time Recovery Key
    if (!verified && user.recoveryKeyHash && user.recoveryKeySalt) {
      if (verifyPassword(codeOrKey.toUpperCase(), user.recoveryKeyHash, user.recoveryKeySalt)) {
        verified = true;
      }
    }

    if (!verified) {
      throw new Error('Invalid or expired recovery code / recovery key.');
    }

    const { hash, salt } = hashPassword(newPassword);
    user.passwordHash = hash;
    user.passwordSalt = salt;
    user.resetCodeHash = undefined;
    user.resetCodeExpiresAt = undefined;

    // Revoke all old customer sessions
    this.data.sessions = this.data.sessions.filter((s) => s.userId !== user.uid);
    this.persist({ ...this.data });
  }

  public getSession(token: string): { session: AuthSession; user: SafeUserAccount } | null {
    if (!token) return null;
    const session = this.data.sessions.find(
      (s) => s.token === token && new Date(s.expiresAt).getTime() > Date.now()
    );
    if (!session) return null;
    const user = this.getUserByUid(session.userId);
    if (!user) return null;
    return {
      session,
      user: sanitizeUser(user)
    };
  }

  public getSessionUser(token: string): SafeUserAccount | null {
    return this.getSession(token)?.user || null;
  }

  public revokeSession(token: string): void {
    if (!token) return;
    this.data.sessions = this.data.sessions.filter((s) => s.token !== token);
    this.persist({ ...this.data });
  }

  public getAllUsers(): SafeUserAccount[] {
    return [...this.data.users]
      .filter((u) => u.role !== 'admin')
      .map(sanitizeUser)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getAuditLogs(): AuditLog[] {
    return this.data.auditLogs;
  }

  // ---------------- VIDEO REQUEST METHODS ----------------

  public getAllRequests(): VideoRequest[] {
    return [...this.data.requests].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getUserRequests(uid: string): VideoRequest[] {
    const cleanUid = (uid || '').trim();
    if (!cleanUid) return [];
    return this.data.requests
      .filter((r) => r.userId === cleanUid)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getRequestById(id: string): VideoRequest | undefined {
    return this.data.requests.find((r) => r.id.toLowerCase() === id.trim().toLowerCase());
  }

  public getRequestByToken(id: string, token: string): VideoRequest | undefined {
    return this.data.requests.find(
      (r) =>
        r.id.toLowerCase() === id.trim().toLowerCase() &&
        r.accessToken.toLowerCase() === token.trim().toLowerCase()
    );
  }

  public createRequest(
    requestData: Omit<
      VideoRequest,
      | 'id'
      | 'accessToken'
      | 'createdAt'
      | 'updatedAt'
      | 'status'
      | 'statusHistory'
      | 'clarifications'
      | 'internalAdminNotes'
      | 'requestType'
      | 'pricingMessage'
    >
  ): VideoRequest {
    const randomHex = crypto.randomBytes(2).toString('hex').toUpperCase();
    const newId = `AVM-2026-${randomHex}`;
    const accessToken = `sec_${crypto.randomBytes(12).toString('hex')}`;
    const now = new Date().toISOString();

    const normalizedEmail = requestData.customerEmail.trim().toLowerCase();
    const user = requestData.userId ? this.getUserByUid(requestData.userId) : undefined;

    const newRequest: VideoRequest = {
      ...requestData,
      customerUsername: requestData.customerUsername || user?.username || requestData.customerName,
      id: newId,
      accessToken,
      createdAt: now,
      updatedAt: now,
      status: 'Submitted',
      requestType: 'paid',
      pricingMessage: 'The payment will be based on the video.',
      quote:
        requestData.quote || {
          status: 'pending',
          amount: 0,
          currency: '₹',
          formattedAmount: 'Quote pending review'
        },
      payment: requestData.payment || { status: 'pending' },
      internalAdminNotes: [
        `Submitted by customer ${requestData.customerUsername || user?.username || normalizedEmail} (Delivery Email: ${normalizedEmail}). The payment will be based on the video.`
      ],
      statusHistory: [
        {
          status: 'Submitted',
          timestamp: now,
          changedBy: 'customer',
          note: 'Request submitted. The payment will be based on the video.'
        }
      ],
      clarifications: []
    };

    this.data.requests.unshift(newRequest);
    this.persist({ ...this.data });
    return newRequest;
  }

  public updateRequest(
    id: string,
    updates: Partial<VideoRequest>,
    changedBy: string = 'admin',
    statusNote?: string
  ): VideoRequest | null {
    const index = this.data.requests.findIndex((r) => r.id.toLowerCase() === id.trim().toLowerCase());
    if (index === -1) return null;

    const current = this.data.requests[index];
    const now = new Date().toISOString();

    const newHistory = [...current.statusHistory];
    if (updates.status && updates.status !== current.status) {
      newHistory.unshift({
        status: updates.status,
        timestamp: now,
        changedBy,
        note: statusNote || `Status updated to ${updates.status}`
      });
    }

    const updatedRequest: VideoRequest = {
      ...current,
      ...updates,
      updatedAt: now,
      statusHistory: newHistory
    };

    this.data.requests[index] = updatedRequest;
    this.persist({ ...this.data });
    return updatedRequest;
  }

  // ---------------- QUOTE & PAYMENT WORKFLOW ----------------

  public setQuote(
    id: string,
    quoteData: {
      amount: number;
      currency?: string;
      breakdown?: string;
      validUntil?: string;
      paymentLink?: string;
      adminNotes?: string;
    }
  ): VideoRequest | null {
    const request = this.getRequestById(id);
    if (!request) return null;

    const now = new Date().toISOString();
    const currency = quoteData.currency || '₹';
    const formattedAmount = `${currency}${quoteData.amount.toLocaleString()}`;

    const quote: QuoteDetails = {
      amount: quoteData.amount,
      currency,
      formattedAmount,
      breakdown: quoteData.breakdown || 'Comprehensive video generation & professional human curation',
      validUntil: quoteData.validUntil,
      paymentLink: quoteData.paymentLink,
      status: 'sent',
      sentAt: now,
      adminNotes: quoteData.adminNotes
    };

    return this.updateRequest(
      id,
      {
        quote,
        status: 'Under Review'
      },
      'admin',
      `Custom quote sent: ${formattedAmount}. Awaiting customer approval.`
    );
  }

  public respondToQuote(
    id: string,
    action: 'accept' | 'decline',
    customerEmail?: string
  ): VideoRequest | null {
    const request = this.getRequestById(id);
    if (!request || !request.quote) return null;

    const now = new Date().toISOString();
    const newQuoteStatus = action === 'accept' ? 'accepted' : 'declined';

    const updatedQuote: QuoteDetails = {
      ...request.quote,
      status: newQuoteStatus,
      respondedAt: now
    };

    const newStatus: VideoStatus = action === 'accept' ? 'Approved' : 'Cancelled';

    return this.updateRequest(
      id,
      {
        quote: updatedQuote,
        status: newStatus,
        payment: {
          ...request.payment,
          status: action === 'accept' ? 'pending' : 'not_required'
        }
      },
      customerEmail || 'customer',
      `Customer ${action === 'accept' ? 'accepted' : 'declined'} the proposed quote of ${request.quote.formattedAmount}.`
    );
  }

  public recordPayment(
    id: string,
    paymentData: {
      status: 'pending' | 'paid' | 'verified';
      amount?: number;
      paymentMethod?: string;
      transactionRef?: string;
    }
  ): VideoRequest | null {
    const request = this.getRequestById(id);
    if (!request) return null;

    const now = new Date().toISOString();
    const payment: PaymentDetails = {
      status: paymentData.status,
      amount: paymentData.amount || request.quote?.amount,
      currency: request.quote?.currency || '₹',
      paymentMethod: paymentData.paymentMethod || 'Razorpay / UPI / Card',
      transactionRef: paymentData.transactionRef,
      paidAt: now,
      verifiedAt: paymentData.status === 'verified' ? now : undefined
    };

    const newStatus: VideoStatus = paymentData.status === 'verified' ? 'In Production' : request.status;

    return this.updateRequest(
      id,
      {
        payment,
        status: newStatus
      },
      'admin',
      `Payment ${paymentData.status}. Transaction ref: ${paymentData.transactionRef || 'N/A'}`
    );
  }

  public deliverVideo(
    id: string,
    delivery: {
      directLink?: string;
      downloadUrl?: string;
      filename?: string;
      sizeBytes?: number;
      message?: string;
    }
  ): VideoRequest | null {
    const request = this.getRequestById(id);
    if (!request) return null;

    const now = new Date().toISOString();
    const link = delivery.directLink || delivery.downloadUrl || '';
    return this.updateRequest(
      id,
      {
        status: 'Delivered',
        completedVideo: {
          url: link,
          directLink: link,
          downloadUrl: delivery.downloadUrl || link,
          filename: delivery.filename,
          sizeBytes: delivery.sizeBytes,
          message: delivery.message || 'Your custom AI video has been produced and delivered to your email address.',
          uploadedAt: now
        }
      },
      'admin',
      `Completed video delivered to customer email (${request.customerEmail}).`
    );
  }

  // ---------------- BUDGET REQUEST METHODS ----------------

  public getAllBudgetRequests(): BudgetRequest[] {
    return [...this.data.budgetRequests].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getBudgetRequestById(id: string): BudgetRequest | undefined {
    return this.data.budgetRequests.find((b) => b.id.toLowerCase() === id.trim().toLowerCase());
  }

  public createBudgetRequest(
    payload: Omit<BudgetRequest, 'id' | 'createdAt' | 'updatedAt' | 'internalNotes' | 'replies'>
  ): BudgetRequest {
    const randomHex = crypto.randomBytes(2).toString('hex').toUpperCase();
    const newId = `BR-2026-${randomHex}`;
    const now = new Date().toISOString();

    const newBudgetReq: BudgetRequest = {
      ...payload,
      id: newId,
      createdAt: now,
      updatedAt: now,
      internalNotes: [],
      replies: []
    };

    this.data.budgetRequests.unshift(newBudgetReq);
    this.persist({ ...this.data });
    return newBudgetReq;
  }

  public updateBudgetRequest(id: string, updates: Partial<BudgetRequest>): BudgetRequest | null {
    const index = this.data.budgetRequests.findIndex((b) => b.id.toLowerCase() === id.trim().toLowerCase());
    if (index === -1) return null;

    const updated = {
      ...this.data.budgetRequests[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.data.budgetRequests[index] = updated;
    this.persist({ ...this.data });
    return updated;
  }

  public addBudgetReply(id: string, reply: { from: 'admin' | 'customer'; message: string }): BudgetRequest | null {
    const req = this.getBudgetRequestById(id);
    if (!req) return null;

    const newReply = {
      id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      from: reply.from,
      message: reply.message,
      timestamp: new Date().toISOString()
    };

    req.replies.push(newReply);
    req.updatedAt = new Date().toISOString();
    this.persist({ ...this.data });
    return req;
  }

  public addBudgetInternalNote(id: string, note: string): BudgetRequest | null {
    const req = this.getBudgetRequestById(id);
    if (!req) return null;

    req.internalNotes.push(`[${new Date().toLocaleDateString()}] ${note}`);
    req.updatedAt = new Date().toISOString();
    this.persist({ ...this.data });
    return req;
  }

  public deleteBudgetRequest(id: string): boolean {
    const index = this.data.budgetRequests.findIndex((b) => b.id.toLowerCase() === id.trim().toLowerCase());
    if (index === -1) return false;
    this.data.budgetRequests.splice(index, 1);
    this.persist({ ...this.data });
    return true;
  }

  public addCustomerClarification(
    requestId: string,
    message: string
  ): VideoRequest | null {
    const request = this.getRequestById(requestId);
    if (!request) return null;

    if (!Array.isArray(request.clarifications)) {
      request.clarifications = [];
    }

    request.clarifications.push({
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      from: 'customer',
      message: message.trim(),
      timestamp: new Date().toISOString()
    });
    request.updatedAt = new Date().toISOString();
    this.persist({ ...this.data });
    return request;
  }

  public deleteVideoRequest(id?: string, email?: string): boolean {
    const normId = (id || '').trim().toLowerCase();
    const normEmail = (email || '').trim().toLowerCase();

    let removed = false;
    this.data.requests = this.data.requests.filter((r) => {
      const matchId = normId && r.id.toLowerCase() === normId;
      const matchEmail = normEmail && (r.customerEmail.toLowerCase() === normEmail || (r.userEmail && r.userEmail.toLowerCase() === normEmail));

      if (matchId || (normEmail && matchEmail && !normId)) {
        removed = true;
        return false;
      }
      return true;
    });

    if (removed) {
      this.persist({ ...this.data });
    }
    return removed;
  }

  // ---------------- EMAIL LOGS & SETTINGS ----------------

  public logEmail(log: Omit<EmailLog, 'id' | 'sentAt'>): EmailLog {
    const fullLog: EmailLog = {
      ...log,
      id: `eml_${crypto.randomBytes(8).toString('hex')}`,
      sentAt: new Date().toISOString()
    };
    this.data.emailLogs.unshift(fullLog);
    if (this.data.emailLogs.length > 500) {
      this.data.emailLogs = this.data.emailLogs.slice(0, 500);
    }
    this.persist({ ...this.data });
    return fullLog;
  }

  public addEmailLog(log: Omit<EmailLog, 'id' | 'sentAt'>): EmailLog {
    return this.logEmail(log);
  }

  public updateEmailLog(id: string, updates: Partial<EmailLog>) {
    const entry = this.data.emailLogs.find((l) => l.id === id);
    if (entry) {
      Object.assign(entry, updates);
      this.persist({ ...this.data });
    }
  }

  public getEmailLogs(): EmailLog[] {
    return this.data.emailLogs;
  }

  public getEmailLogById(id: string): EmailLog | undefined {
    return this.data.emailLogs.find((l) => l.id === id);
  }

  public getSettings() {
    return this.data.settings;
  }

  public updateSettings(settings: Partial<DatabaseSchema['settings']>) {
    this.data.settings = {
      ...this.data.settings,
      ...settings
    };
    this.persist({ ...this.data });
    return this.data.settings;
  }
}

export const db = new Database();

/**
 * partnerLink.ts
 *
 * Email OTP and shared-vault transport for the prototype onboarding flow.
 * KVDB is anonymous storage: this is not an authentication boundary and must not
 * be used for private financial records in production.
 */

import { UserProfile, CoupleVault } from '../types/finance';

// A bucket must be configured per deployment; never fall back to shared demo data.
const KVDB_BUCKET = (import.meta as any).env?.VITE_KVDB_BUCKET ?? '';
const KVDB = (key: string) => KVDB_BUCKET ? `https://kvdb.io/${KVDB_BUCKET}/${key}` : '';

// EmailJS must be configured before either email-verification step can continue.
const EJS_SVC  = (import.meta as any).env?.VITE_EMAILJS_SERVICE_ID  ?? '';
const EJS_TPL  = (import.meta as any).env?.VITE_EMAILJS_TEMPLATE_ID ?? '';
const EJS_KEY  = (import.meta as any).env?.VITE_EMAILJS_PUBLIC_KEY  ?? '';

/** Generate a 6-digit OTP */
export function generateOTP(): string {
  const limit = Math.floor(2 ** 32 / 900000) * 900000;
  const value = new Uint32Array(1);
  do {
    crypto.getRandomValues(value);
  } while (value[0] >= limit);
  return String(100000 + (value[0] % 900000));
}

/** Encode email bytes so distinct email addresses cannot collide in storage keys. */
function emailKey(email: string): string {
  return Array.from(new TextEncoder().encode(email.trim().toLowerCase()))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

/** Generate a unique vault ID */
export function makeVaultId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return `vault_${Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

/* ────────────────────────────────────────────────────────────────────────────
   OTP — store & validate
   key format: otp_{sanitised_partner_email}
─────────────────────────────────────────────────────────────────────────── */

export interface OTPRecord {
  otp: string;
  recipientEmail: string;
  senderEmail: string;
  senderName: string;
  vaultId: string;
  createdAt: number;
  expiresAt: number;
}

export async function storeOTP(
  partnerEmail: string,
  otp: string,
  senderName: string,
  senderEmail: string,
  vaultId: string,
): Promise<boolean> {
  const record: OTPRecord = {
    otp,
    recipientEmail: partnerEmail.trim().toLowerCase(),
    senderEmail,
    senderName,
    vaultId,
    createdAt: Date.now(),
    expiresAt: Date.now() + 20 * 60 * 1000, // 20 min TTL
  };
  const url = KVDB(`otp_${emailKey(partnerEmail)}`);
  if (!url) return false;
  try {
    const res = await fetch(url, {
      method: 'PUT',
      body: JSON.stringify(record),
      headers: { 'Content-Type': 'application/json' },
    });
    return res.ok;
  } catch { return false; }
}

export async function validateOTP(
  myEmail: string,
  inputOTP: string,
): Promise<OTPRecord | null> {
  const normalizedEmail = myEmail.trim().toLowerCase();
  const url = KVDB(`otp_${emailKey(normalizedEmail)}`);
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data: OTPRecord = await res.json();
    if (!data.otp || Date.now() > data.expiresAt) return null;
    if (data.recipientEmail !== normalizedEmail) return null;
    if (data.otp.trim() !== inputOTP.trim()) return null;
    return data;
  } catch { return null; }
}

export async function consumeOTP(email: string): Promise<boolean> {
  const url = KVDB(`otp_${emailKey(email.trim().toLowerCase())}`);
  if (!url) return false;
  try {
    const res = await fetch(url, { method: 'DELETE' });
    return res.ok;
  } catch { return false; }
}

/* ────────────────────────────────────────────────────────────────────────────
  EmailJS — send OTP email
─────────────────────────────────────────────────────────────────────────── */

export async function sendOTPEmail(
  toEmail: string,
  toName: string,
  fromName: string,
  otp: string,
): Promise<{ sent: boolean }> {
  if (!EJS_SVC || !EJS_TPL || !EJS_KEY) {
    return { sent: false };
  }
  try {
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: EJS_SVC,
        template_id: EJS_TPL,
        user_id: EJS_KEY,
        template_params: {
          to_email: toEmail,
          to_name: toName,
          from_name: fromName,
          otp_code: otp,
        },
      }),
    });
    return { sent: res.ok };
  } catch { return { sent: false }; }
}

/* ────────────────────────────────────────────────────────────────────────────
  Shared vault transport — anonymous KVDB, so this is prototype-only.
  The app polls the shared record; this transport does not provide conflict resolution.
─────────────────────────────────────────────────────────────────────────── */

export interface SharedVaultData {
  vault: CoupleVault;
  partner1Profile: UserProfile;
  partner2Profile?: UserProfile;
  transactions: unknown[];
  goals: unknown[];
  stocks: unknown[];
  bills: unknown[];
  categories: unknown[];
  currency: string;
  updatedAt: number;
}

export async function pushSharedData(vaultId: string, data: SharedVaultData): Promise<boolean> {
  const url = KVDB(`data_${vaultId}`);
  if (!url) return false;
  try {
    const res = await fetch(url, {
      method: 'PUT',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
    });
    return res.ok;
  } catch { return false; }
}

export async function pullSharedData(vaultId: string): Promise<SharedVaultData | null> {
  const url = KVDB(`data_${vaultId}`);
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

/** Upload partner profile so the other person can see it after linking */
export async function storePartnerProfile(email: string, profile: UserProfile): Promise<boolean> {
  const url = KVDB(`profile_${emailKey(email)}`);
  if (!url) return false;
  try {
    const res = await fetch(url, {
      method: 'PUT',
      body: JSON.stringify(profile),
      headers: { 'Content-Type': 'application/json' },
    });
    return res.ok;
  } catch { return false; }
}

export async function fetchPartnerProfile(email: string): Promise<UserProfile | null> {
  const url = KVDB(`profile_${emailKey(email)}`);
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

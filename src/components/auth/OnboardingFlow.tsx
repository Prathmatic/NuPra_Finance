import React, { useState, useRef, useCallback } from 'react';
import {
  Heart, User, Mail, Camera, ArrowRight, ArrowLeft,
  Check, RefreshCw, Link2, Loader2, ShieldCheck,
} from 'lucide-react';
import {
  generateOTP, makeVaultId, storeOTP, sendOTPEmail, consumeOTP,
  validateOTP, storePartnerProfile, fetchPartnerProfile, pullSharedData, pushSharedData,
} from '../../services/partnerLink';
import { UserProfile, CoupleVault } from '../../types/finance';
import type { SharedVaultData } from '../../services/partnerLink';

interface OnboardingFlowProps {
  onComplete: (user: UserProfile, vault: CoupleVault, sharedData?: SharedVaultData | null) => void;
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80',
];

type Step = 'identity' | 'verifyEmail' | 'photo' | 'role' | 'invite' | 'join';

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const [step, setStep] = useState<Step>('identity');
  const [userId] = useState(() => `user_${makeVaultId()}`);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(AVATAR_PRESETS[0]);
  const [partnerEmail, setPartnerEmail] = useState('');
  const [generatedVaultId, setGeneratedVaultId] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Step helpers ── */
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === 'string') setAvatarUrl(reader.result); };
    reader.readAsDataURL(file);
  };

  /* ── Build a UserProfile for the current user ── */
  const buildProfile = useCallback((): UserProfile => ({
    id: userId,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    avatarUrl,
    partnerCode: '',
    vaultId: '',
    createdAt: new Date().toISOString(),
  }), [userId, name, email, avatarUrl]);

  const handleSendEmailVerification = async () => {
    setLoading(true);
    setError('');
    const otp = generateOTP();
    const stored = await storeOTP(email.trim().toLowerCase(), otp, name.trim(), email.trim().toLowerCase(), makeVaultId());
    if (!stored) {
      setError('Email verification service is unavailable. Configure VITE_KVDB_BUCKET and try again.');
      setLoading(false);
      return;
    }
    const result = await sendOTPEmail(email.trim(), name.trim(), 'NuPra Finance', otp);
    if (!result.sent) {
      setError('Email delivery failed. Configure EmailJS or check your email address, then try again.');
      setLoading(false);
      return;
    }
    setEmailCode('');
    setStep('verifyEmail');
    setLoading(false);
  };

  const handleVerifyEmail = async () => {
    setLoading(true);
    setError('');
    const record = await validateOTP(email.trim().toLowerCase(), emailCode.trim());
    if (!record) {
      setError('That code is invalid or expired. Request a new code and try again.');
      setLoading(false);
      return;
    }
    const consumed = await consumeOTP(email.trim().toLowerCase());
    if (!consumed) {
      setError('Could not confirm your email. Check your connection and try again.');
      setLoading(false);
      return;
    }
    setStep('photo');
    setLoading(false);
  };

  /* ── Send invite code to partner ── */
  const handleSendCode = async () => {
    setLoading(true);
    setError('');
    const otp = generateOTP();
    const vaultId = makeVaultId();
    setGeneratedVaultId(vaultId);

    const stored = await storeOTP(partnerEmail.trim().toLowerCase(), otp, name.trim(), email.trim().toLowerCase(), vaultId);
    if (!stored) {
      setError('Invitation service is unavailable. Check VITE_KVDB_BUCKET and try again.');
      setLoading(false);
      return;
    }
    // Upload our profile so partner can fetch it after linking
    const myProfile = { ...buildProfile(), vaultId };
    const profileStored = await storePartnerProfile(email.trim().toLowerCase(), myProfile);
    if (!profileStored) {
      setError('Your profile could not be shared. Check your connection and resend the invitation.');
      setLoading(false);
      return;
    }
    const invitationVault: CoupleVault = {
      id: vaultId,
      inviteCode: '',
      name: `${myProfile.name}'s Vault`,
      partner1: myProfile,
      currency: 'INR',
      monthlyBudget: 100000,
      createdAt: new Date().toISOString(),
    };
    const initialized = await pushSharedData(vaultId, {
      vault: invitationVault,
      partner1Profile: myProfile,
      transactions: [],
      goals: [],
      stocks: [],
      bills: [],
      categories: [],
      currency: 'INR',
      updatedAt: Date.now(),
    });
    if (!initialized) {
      setError('Could not initialize your shared vault. Check your connection and try again.');
      setLoading(false);
      return;
    }
    const emailResult = await sendOTPEmail(partnerEmail.trim(), partnerEmail.trim(), name.trim(), otp);
    if (!emailResult.sent) {
      setError('Email delivery failed. Check EmailJS configuration and the recipient address, then try again.');
      setLoading(false);
      return;
    }

    setCodeSent(true);
    setLoading(false);
  };

  /* ── Partner completes setup with received code ── */
  const handleVerifyCode = async () => {
    setLoading(true);
    setError('');
    const record = await validateOTP(email.trim().toLowerCase(), joinCode.trim());
    if (!record) {
      setError('Invalid or expired code. Ask your partner to resend.');
      setLoading(false);
      return;
    }

    const sharedData = await pullSharedData(record.vaultId);
    if (!sharedData) {
      setError('Could not load the shared vault. Check your connection and try again.');
      setLoading(false);
      return;
    }
    const consumed = await consumeOTP(email.trim().toLowerCase());
    if (!consumed) {
      setError('Could not confirm the invitation. Check your connection and try again.');
      setLoading(false);
      return;
    }

    // Fetch partner profile
    const partnerProfile = await fetchPartnerProfile(record.senderEmail) as UserProfile | null;

    // Build my profile
    const me: UserProfile = {
      ...buildProfile(),
      vaultId: record.vaultId,
    };
    // Build vault
    const vault: CoupleVault = {
      id: record.vaultId,
      inviteCode: '',
      name: `${record.senderName} & ${me.name} Vault`,
      partner1: partnerProfile ?? {
        id: 'user_partner',
        name: record.senderName,
        email: record.senderEmail,
        avatarUrl: AVATAR_PRESETS[1],
        partnerCode: '',
        vaultId: record.vaultId,
        createdAt: new Date().toISOString(),
      },
      partner2: me,
      currency: 'INR',
      monthlyBudget: 100000,
      createdAt: new Date().toISOString(),
    };

    // Upload my profile
    await storePartnerProfile(me.email, me);

    setLoading(false);
    onComplete(me, vault, sharedData);
  };

  /* ── Person A finishes (partner not yet joined) ── */
  const handleCreatorFinish = async () => {
    setLoading(true);
    setError('');
    const sharedData = await pullSharedData(generatedVaultId);
    if (!sharedData) {
      setError('Could not load the shared vault. Check your connection and try again.');
      setLoading(false);
      return;
    }
    const me: UserProfile = {
      ...buildProfile(),
      vaultId: generatedVaultId,
    };
    const vault: CoupleVault = {
      id: generatedVaultId,
      inviteCode: '',
      name: `${me.name}'s Vault`,
      partner1: me,
      currency: 'INR',
      monthlyBudget: 100000,
      createdAt: new Date().toISOString(),
    };
    setLoading(false);
    onComplete(me, vault, sharedData);
  };

  /* ── Render ── */
  const stepTitles: Record<Step, string> = {
    identity: 'Who are you?',
    verifyEmail: 'Verify your email',
    photo: 'Add your photo',
    role: 'Connect with partner',
    invite: 'Invite your partner',
    join: 'Enter invite code',
  };
  const stepIcons: Record<Step, React.ReactNode> = {
    identity: <User className="w-5 h-5" />,
    verifyEmail: <Mail className="w-5 h-5" />,
    photo: <Camera className="w-5 h-5" />,
    role: <Heart className="w-5 h-5 fill-white" />,
    invite: <Mail className="w-5 h-5" />,
    join: <Link2 className="w-5 h-5" />,
  };

  const stepOrder: Step[] = ['identity', 'verifyEmail', 'photo', 'role'];
  const currentIdx = stepOrder.indexOf(step);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gradient-to-br from-[#070a13] via-[#0e0d2e] to-[#100718]">
      {/* Glow blobs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-rose-600/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Header pill */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
            <div className="p-1.5 rounded-full bg-gradient-to-tr from-rose-500 to-indigo-600 text-white">
              {stepIcons[step]}
            </div>
            <span className="text-sm font-bold text-white">{stepTitles[step]}</span>
          </div>
        </div>

        {/* Progress dots for first 3 steps */}
        {currentIdx >= 0 && (
          <div className="flex justify-center gap-2 mb-5">
            {stepOrder.map((s, i) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i <= currentIdx ? 'w-8 bg-gradient-to-r from-rose-500 to-indigo-500' : 'w-4 bg-white/15'
                }`}
              />
            ))}
          </div>
        )}

        {/* Card */}
        <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-6 shadow-2xl backdrop-blur-xl">

          {/* ── STEP 1: Identity ─────────────────────────────────────── */}
          {step === 'identity' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Your Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Priya"
                  className="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-white/10 text-white text-sm focus:outline-none focus:border-rose-500 transition-all placeholder:text-slate-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Your Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@gmail.com"
                  className="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-white/10 text-white text-sm focus:outline-none focus:border-rose-500 transition-all placeholder:text-slate-500"
                />
              </div>
              <button
                onClick={() => { if (name.trim() && email.trim()) handleSendEmailVerification(); else setError('Please fill in name and email'); }}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:opacity-90 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-rose-500/20"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Verify Email <ArrowRight className="w-4 h-4" /></>}
              </button>
              {error && <p className="text-xs text-rose-400 text-center">{error}</p>}
            </div>
          )}

          {step === 'verifyEmail' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-300 text-center">Enter the one-time code sent to <span className="text-rose-400">{email}</span>.</p>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={emailCode}
                onChange={e => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="w-full px-4 py-4 rounded-xl bg-slate-800/80 border border-white/10 text-white text-2xl font-black text-center tracking-[0.3em] focus:outline-none focus:border-rose-500 placeholder:text-slate-600"
              />
              {error && <p className="text-xs text-rose-400 text-center">{error}</p>}
              <div className="flex gap-3">
                <button onClick={() => { setError(''); setStep('identity'); }} className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm font-semibold flex items-center justify-center gap-2">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={handleVerifyEmail} disabled={loading || emailCode.length !== 6} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Verify <ArrowRight className="w-4 h-4" /></>}
                </button>
              </div>
              <button onClick={handleSendEmailVerification} disabled={loading} className="w-full text-xs text-slate-400 hover:text-white disabled:opacity-40">
                Send a new code
              </button>
            </div>
          )}

          {/* ── STEP 2: Photo ────────────────────────────────────────── */}
          {step === 'photo' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <img src={avatarUrl} alt="You" className="w-24 h-24 rounded-full object-cover ring-4 ring-rose-500/40 shadow-glow-rose" />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-2 rounded-full bg-gradient-to-tr from-rose-600 to-pink-600 text-white shadow-md hover:scale-110 transition-all"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </div>
                <p className="text-xs text-slate-400">Tap camera to upload your own photo</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 mb-2 text-center">Or choose an avatar:</p>
                <div className="flex justify-center gap-2 flex-wrap">
                  {AVATAR_PRESETS.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt=""
                      onClick={() => setAvatarUrl(url)}
                      className={`w-10 h-10 rounded-full object-cover cursor-pointer hover:scale-110 transition-all ${
                        avatarUrl === url ? 'ring-2 ring-rose-500 scale-110' : 'opacity-60 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep('identity')} className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-white/10 transition-all">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={() => setStep('role')} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:opacity-90 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all">
                  Next <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Role selection ───────────────────────────────── */}
          {step === 'role' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-300 text-center">Hi <span className="font-bold text-white">{name}</span>! How do you want to connect?</p>
              <button
                onClick={() => setStep('invite')}
                className="w-full p-4 rounded-2xl bg-gradient-to-r from-rose-950/60 to-indigo-950/60 border border-rose-500/30 hover:border-rose-400/60 text-left transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 group-hover:bg-rose-500/30 transition-all">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">I'll invite my partner</p>
                    <p className="text-xs text-slate-400">Send a 6-digit code to your partner's email</p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => setStep('join')}
                className="w-full p-4 rounded-2xl bg-gradient-to-r from-indigo-950/60 to-slate-900/60 border border-indigo-500/30 hover:border-indigo-400/60 text-left transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500/30 transition-all">
                    <Link2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">I have a code from my partner</p>
                    <p className="text-xs text-slate-400">Enter the 6-digit code they sent you</p>
                  </div>
                </div>
              </button>
              <button onClick={() => setStep('photo')} className="w-full text-xs text-slate-500 hover:text-slate-300 transition-all flex items-center justify-center gap-1 pt-1">
                <ArrowLeft className="w-3 h-3" /> Back
              </button>
            </div>
          )}

          {/* ── STEP 4: Invite (Person A) ────────────────────────────── */}
          {step === 'invite' && (
            <div className="space-y-4">
              {!codeSent ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Partner's Email Address</label>
                    <input
                      type="email"
                      value={partnerEmail}
                      onChange={e => setPartnerEmail(e.target.value)}
                      placeholder="partner@gmail.com"
                      className="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-white/10 text-white text-sm focus:outline-none focus:border-rose-500 transition-all placeholder:text-slate-500"
                    />
                  </div>
                  {error && <p className="text-xs text-rose-400">{error}</p>}
                  <div className="flex gap-3">
                    <button onClick={() => setStep('role')} className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-white/10 transition-all">
                      <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <button
                      onClick={() => {
                        const normalizedPartnerEmail = partnerEmail.trim().toLowerCase();
                        if (!normalizedPartnerEmail) { setError('Enter partner email'); return; }
                        if (normalizedPartnerEmail === email.trim().toLowerCase()) { setError('Use a different email for your partner.'); return; }
                        setError('');
                        handleSendCode();
                      }}
                      disabled={loading}
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:opacity-90 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Mail className="w-4 h-4" /> Send Code</>}
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="text-center space-y-1">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mb-2">
                      <Check className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-white">Invitation email sent</p>
                    <p className="text-xs text-slate-400">A one-time code was sent to <span className="text-rose-400">{partnerEmail}</span></p>
                  </div>

                  <p className="text-center text-xs text-slate-400">The code expires in 20 minutes and is valid only for that email address.</p>

                  <button
                    onClick={() => setCodeSent(false)}
                    className="w-full py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-white/10 transition-all"
                  >
                    <RefreshCw className="w-4 h-4" /> Send another code
                  </button>

                  <button
                    onClick={handleCreatorFinish}
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ShieldCheck className="w-4 h-4" /> Enter App (waiting for partner)</>}
                  </button>
                  {error && <p className="text-xs text-rose-400 text-center">{error}</p>}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 5: Join (Person B) ──────────────────────────────── */}
          {step === 'join' && (
            <div className="space-y-4">
              <div className="text-center space-y-1 pb-2">
                <p className="text-sm text-slate-300">Enter the 6-digit code your partner sent you</p>
              </div>
              <div>
                <input
                  type="text"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-4 py-4 rounded-xl bg-slate-800/80 border border-white/10 text-white text-2xl font-black text-center tracking-[0.3em] focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600"
                />
              </div>
              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                  {error}
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => { setStep('role'); setError(''); }} className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-white/10 transition-all">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={handleVerifyCode}
                  disabled={loading || joinCode.length !== 6}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-90 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Link2 className="w-4 h-4" /> Link & Enter</>}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-600 mt-4">
          NuPra Finance · Built for couples 💑
        </p>
      </div>
    </div>
  );
};

import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Camera, Check, Loader2, Mail, Users, Sparkles
} from 'lucide-react';
import type { UserProfile, CoupleVault } from '../../types/finance';
import {
  acceptPartnerInvite,
  createCoupleVault,
  getMyOwnedVaultId,
  getPendingPartnerInvites,
  getSignedInUser,
  invitePartner,
  loadWorkspace,
  PendingPartnerInvite,
  requestEmailCode,
  saveProfile,
  verifyEmailCode,
} from '../../services/supabaseFinance';
import { isSupabaseConfigured } from '../../services/supabaseClient';
import { NPIcon } from '../common/NPIcon';

interface OnboardingFlowProps {
  onComplete: (user: UserProfile, vault: CoupleVault) => Promise<void> | void;
  initialProfile?: UserProfile | null;
  authError?: string;
}

type Step = 'identity' | 'verify' | 'profile' | 'connect' | 'invite' | 'accept';

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
];

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>;
    if (typeof err.message === 'string') return err.message;
    if (typeof err.error_description === 'string') return err.error_description;
    if (typeof err.msg === 'string') return err.msg;
    if (typeof err.details === 'string') return err.details;
  }
  return String(error || 'Something went wrong. Please try again.');
};

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete, initialProfile, authError }) => {
  const initialProfileId = initialProfile?.id;
  const [step, setStep] = useState<Step>(initialProfile ? 'connect' : 'identity');
  const [loginMode, setLoginMode] = useState<'existing' | 'new'>('existing');
  const [profile, setProfile] = useState<UserProfile | null>(initialProfile ?? null);
  const [name, setName] = useState(initialProfile?.name ?? '');
  const [email, setEmail] = useState(initialProfile?.email ?? '');
  const [code, setCode] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(initialProfile?.avatarUrl ?? AVATAR_PRESETS[0]);
  const [partnerEmail, setPartnerEmail] = useState('');
  const [vaultId, setVaultId] = useState(initialProfile?.vaultId ?? '');
  const [invitationSent, setInvitationSent] = useState(false);
  const [invites, setInvites] = useState<PendingPartnerInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(authError ?? '');
  const [notice, setNotice] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    const resumeSetup = async () => {
      try {
        if (initialProfileId) {
          const alreadyUsingProfile = profile?.id === initialProfileId;
          const pending = await getPendingPartnerInvites();
          if (!active) return;
          setInvites(pending);
          if (!initialProfile.name) setStep('profile');
          else if (pending.length) setStep('accept');
          else if (!alreadyUsingProfile) {
            const existingVaultId = await getMyOwnedVaultId();
            if (!active) return;
            if (existingVaultId) {
              setVaultId(existingVaultId);
              setStep('invite');
            } else setStep('connect');
          }
          return;
        }
        const user = await getSignedInUser();
        if (active && user?.email) {
          setEmail(user.email);
          const workspace = await loadWorkspace();
          if (workspace.currentUser && workspace.vault) {
            await onComplete(workspace.currentUser, workspace.vault);
            return;
          }
          setStep('profile');
          setProfile({
            id: user.id,
            name: user.user_metadata?.display_name ?? '',
            email: user.email.toLowerCase(),
            avatarUrl: user.user_metadata?.avatar_url ?? AVATAR_PRESETS[0],
            partnerCode: '',
            vaultId: '',
            createdAt: new Date().toISOString(),
          });
        }
      } catch (resumeError) {
        if (active) setError(getErrorMessage(resumeError));
      }
    };
    void resumeSetup();
    return () => { active = false; };
  }, [initialProfileId, profile?.id, onComplete]);

  useEffect(() => {
    if (authError) setError(authError);
  }, [authError]);

  const handleRequestCode = async () => {
    if (loginMode === 'new' && !name.trim()) {
      setError('Please enter your name to set up your account.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setLoading(true);
    setError('');
    setNotice('');
    try {
      await requestEmailCode(email);
      setStep('verify');
      setNotice(`A sign-in code was sent to ${email.trim().toLowerCase()}.`);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setLoading(true);
    setError('');
    try {
      const authUser = await verifyEmailCode(email, code);
      if (authUser.email) setEmail(authUser.email);

      // Automatically fetch existing data from Supabase!
      const workspace = await loadWorkspace();
      if (workspace.currentUser && workspace.vault) {
        // If partner email was entered and vault doesn't have a linked partner yet, auto-invite partner
        if (partnerEmail.trim() && !workspace.vault.partner2) {
          try {
            await invitePartner(workspace.vault.id, partnerEmail.trim());
          } catch (e) {
            console.warn('Auto-invite partner skipped or already sent:', e);
          }
        }
        await onComplete(workspace.currentUser, workspace.vault);
        return;
      }

      // Check if partner already invited this email
      const pending = await getPendingPartnerInvites();
      setInvites(pending);
      if (pending.length > 0) {
        // If existing user mode and exactly one pending invite from partner, auto-accept it!
        if (loginMode === 'existing' && pending.length === 1) {
          try {
            const linkedVaultId = await acceptPartnerInvite(pending[0].inviteId);
            const freshWorkspace = await loadWorkspace();
            if (freshWorkspace.currentUser && freshWorkspace.vault) {
              await onComplete(freshWorkspace.currentUser, freshWorkspace.vault);
              return;
            }
          } catch (autoAcceptErr) {
            console.warn('Auto-accept invite error, falling back to manual accept:', autoAcceptErr);
          }
        }

        setProfile(workspace.currentUser || {
          id: authUser.id,
          name: workspace.currentUser?.name || authUser.user_metadata?.display_name || name.trim() || 'User',
          email: authUser.email!.toLowerCase(),
          avatarUrl: workspace.currentUser?.avatarUrl || AVATAR_PRESETS[0],
          partnerCode: '',
          vaultId: '',
          createdAt: new Date().toISOString(),
        });
        setStep('accept');
        setNotice('Found an invitation from your partner! Tap below to join.');
        return;
      }

      // If user profile is already saved in Supabase
      if (workspace.currentUser && workspace.currentUser.name) {
        setProfile(workspace.currentUser);
        setName(workspace.currentUser.name);
        setAvatarUrl(workspace.currentUser.avatarUrl || AVATAR_PRESETS[0]);

        // If partner email was provided on Existing User screen, auto-create vault & invite partner directly!
        if (partnerEmail.trim()) {
          try {
            const activeVaultId = await createCoupleVault(`${workspace.currentUser.name} & Partner`, 'INR', 0);
            await invitePartner(activeVaultId, partnerEmail.trim());
            const owner = { ...workspace.currentUser, vaultId: activeVaultId };
            await onComplete(owner, {
              id: activeVaultId,
              inviteCode: '',
              name: `${workspace.currentUser.name} & Partner`,
              partner1: owner,
              currency: 'INR',
              monthlyBudget: 0,
              createdAt: new Date().toISOString(),
            });
            return;
          } catch (autoCreateErr) {
            console.warn('Auto create vault error, falling back to connect screen:', autoCreateErr);
          }
        }

        setStep('connect');
        return;
      }

      // Otherwise, new profile setup
      setProfile({
        id: authUser.id,
        name: name.trim() || authUser.user_metadata?.display_name || '',
        email: (authUser.email ?? email).toLowerCase(),
        avatarUrl,
        partnerCode: '',
        vaultId: '',
        createdAt: new Date().toISOString(),
      });
      setStep('profile');
    } catch (verifyError) {
      setError(getErrorMessage(verifyError));
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2_000_000) {
      setError('Choose a photo smaller than 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setAvatarUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    if (!profile || !name.trim()) {
      setError('Enter your name to continue.');
      return;
    }
    const updatedProfile = { ...profile, name: name.trim(), avatarUrl };
    setLoading(true);
    setError('');
    try {
      await saveProfile(updatedProfile);
      setProfile(updatedProfile);
      const pending = await getPendingPartnerInvites();
      setInvites(pending);
      setStep(pending.length ? 'accept' : 'connect');
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setLoading(false);
    }
  };

  const handleInvitePartner = async () => {
    if (!profile || !partnerEmail.trim()) {
      setError('Enter your partner’s email address.');
      return;
    }
    if (partnerEmail.trim().toLowerCase() === profile.email.toLowerCase()) {
      setError('Use a different email address for your partner.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await saveProfile(profile);
      const activeVaultId = vaultId || await createCoupleVault(`${profile.name} & Partner`, 'INR', 0);
      setVaultId(activeVaultId);
      await invitePartner(activeVaultId, partnerEmail);
      const owner = { ...profile, vaultId: activeVaultId };
      await onComplete(owner, {
        id: activeVaultId,
        inviteCode: '',
        name: `${profile.name} & Partner`,
        partner1: owner,
        currency: 'INR',
        monthlyBudget: 0,
        createdAt: new Date().toISOString(),
      });
      setInvitationSent(true);
      setNotice(`A sign-in code was sent to ${partnerEmail.trim().toLowerCase()}. Your partner must verify this exact email to join.`);
    } catch (inviteError) {
      setError(getErrorMessage(inviteError));
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async (invite: PendingPartnerInvite) => {
    if (!profile) return;
    setLoading(true);
    setError('');
    try {
      const linkedVaultId = await acceptPartnerInvite(invite.inviteId);
      const me = { ...profile, vaultId: linkedVaultId };
      await onComplete(me, {
        id: linkedVaultId,
        inviteCode: '',
        name: invite.vaultName,
        partner1: {
          id: invite.inviterId,
          name: invite.inviterName,
          email: invite.inviterEmail,
          avatarUrl: invite.inviterAvatarUrl,
          partnerCode: '',
          vaultId: linkedVaultId,
          createdAt: invite.createdAt,
        },
        partner2: me,
        currency: 'INR',
        monthlyBudget: 0,
        createdAt: invite.createdAt,
      });
    } catch (acceptError) {
      setError(getErrorMessage(acceptError));
    } finally {
      setLoading(false);
    }
  };

  const stepTitles: Record<Step, string> = {
    identity: loginMode === 'existing' ? 'Returning User Sign-in' : 'New Couple Account Setup',
    verify: 'Verify Sign-in Code',
    profile: 'Set up your profile',
    connect: 'Connect your couple vault',
    invite: 'Invite your partner',
    accept: 'Partner invitation',
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#070a13] p-4 text-white">
        <div className="w-full max-w-md rounded-2xl border border-amber-400/30 bg-slate-900 p-6">
          <h1 className="text-lg font-bold">Supabase setup required</h1>
          <p className="mt-2 text-sm text-slate-300">Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in your local environment, then restart the app.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 bg-gradient-to-br from-[#070a13] via-[#090e1a] to-[#0f172a]">
      <div className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
      
      <div className="relative w-full max-w-md py-6">
        {/* NP Monogram Brand Header */}
        <div className="mb-4 flex flex-col items-center justify-center gap-2">
          <NPIcon size="lg" />
          <h1 className="font-extrabold text-lg text-white tracking-tight">NuPra Finance</h1>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-white/10 text-xs font-semibold text-slate-300">
            <span>{stepTitles[step]}</span>
          </div>
        </div>

        <div className="space-y-4 rounded-3xl border border-white/10 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-xl">
          {step === 'identity' && (
            <>
              {/* Existing User vs New User Mode Toggle */}
              <div className="flex p-1 rounded-2xl bg-slate-950/80 border border-white/10 mb-3">
                <button
                  type="button"
                  onClick={() => { setLoginMode('existing'); setError(''); }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    loginMode === 'existing'
                      ? 'bg-gradient-to-r from-emerald-600 to-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Existing User (Auto-fetch)
                </button>
                <button
                  type="button"
                  onClick={() => { setLoginMode('new'); setError(''); }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    loginMode === 'new'
                      ? 'bg-gradient-to-r from-emerald-600 to-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  New Couple Setup
                </button>
              </div>

              {loginMode === 'existing' ? (
                <>
                  <p className="text-xs text-slate-300 leading-relaxed mb-3">
                    Enter your email to automatically fetch your existing couple vault, transaction history, and budgets directly from Supabase.
                  </p>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-300">Your Email Address</label>
                    <input 
                      type="email" 
                      value={email} 
                      onChange={event => setEmail(event.target.value)} 
                      autoComplete="email" 
                      placeholder="you@gmail.com" 
                      className="w-full rounded-xl border border-white/10 bg-slate-800/80 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none transition-all" 
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                      Partner's Email Address <span className="text-[10px] text-slate-500 font-normal">(Optional)</span>
                    </label>
                    <input 
                      type="email" 
                      value={partnerEmail} 
                      onChange={event => setPartnerEmail(event.target.value)} 
                      autoComplete="email" 
                      placeholder="partner@gmail.com" 
                      className="w-full rounded-xl border border-white/10 bg-slate-800/80 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none transition-all" 
                    />
                  </div>

                  <button 
                    onClick={handleRequestCode} 
                    disabled={loading || !email.trim()} 
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all active:scale-95"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Mail className="h-4 w-4" /> Send Code & Fetch My Vault</>}
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-300">Your Name</label>
                    <input 
                      value={name} 
                      onChange={event => setName(event.target.value)} 
                      autoComplete="name" 
                      placeholder="Your name" 
                      className="w-full rounded-xl border border-white/10 bg-slate-800/80 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none transition-all" 
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-300">Your Email Address</label>
                    <input 
                      type="email" 
                      value={email} 
                      onChange={event => setEmail(event.target.value)} 
                      autoComplete="email" 
                      placeholder="you@gmail.com" 
                      className="w-full rounded-xl border border-white/10 bg-slate-800/80 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none transition-all" 
                    />
                  </div>

                  <button 
                    onClick={handleRequestCode} 
                    disabled={loading || !email.trim() || !name.trim()} 
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 disabled:opacity-50 transition-all active:scale-95"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Mail className="h-4 w-4" /> Email me a sign-in code</>}
                  </button>
                </>
              )}
            </>
          )}

          {step === 'verify' && (
            <>
              <p className="text-center text-sm text-slate-300">{notice || `Enter the 6-digit code sent to ${email}.`}</p>
              <input 
                value={code} 
                onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 8))} 
                inputMode="numeric" 
                autoComplete="one-time-code" 
                maxLength={8} 
                placeholder="000000" 
                autoFocus
                className="w-full rounded-xl border border-white/10 bg-slate-800/80 px-4 py-4 text-center text-2xl font-black tracking-[0.25em] text-white placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none" 
              />
              <div className="flex gap-3">
                <button 
                  onClick={() => { setError(''); setStep('identity'); }} 
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-slate-300 hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button 
                  onClick={handleVerifyCode} 
                  disabled={loading || code.length < 6} 
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 py-3 text-sm font-bold text-white disabled:opacity-40"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Verify & Fetch <ArrowRight className="h-4 w-4" /></>}
                </button>
              </div>
              <button onClick={handleRequestCode} disabled={loading} className="w-full text-xs text-slate-400 hover:text-white disabled:opacity-40">
                Resend code
              </button>
            </>
          )}

          {step === 'profile' && (
            <>
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <img src={avatarUrl} alt="Your profile" className="h-24 w-24 rounded-full object-cover ring-4 ring-indigo-500/40" />
                  <button type="button" onClick={() => fileInputRef.current?.click()} aria-label="Upload profile photo" className="absolute bottom-0 right-0 rounded-full bg-indigo-600 p-2 text-white shadow-md">
                    <Camera className="h-4 w-4" />
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </div>
                <div className="flex justify-center gap-2">
                  {AVATAR_PRESETS.map(url => (
                    <button key={url} type="button" onClick={() => setAvatarUrl(url)} className={`rounded-full ${avatarUrl === url ? 'ring-2 ring-indigo-500' : 'opacity-70 hover:opacity-100'}`}>
                      <img src={url} alt="Choose avatar" className="h-8 w-8 rounded-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-300">Your name</label>
                <input value={name} onChange={event => setName(event.target.value)} autoComplete="name" className="w-full rounded-xl border border-white/10 bg-slate-800/80 px-4 py-3 text-sm text-white focus:border-indigo-500 focus:outline-none" />
              </div>
              <p className="text-xs text-slate-400">Verified email: {email}</p>
              <button onClick={handleSaveProfile} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 py-3 text-sm font-bold text-white disabled:opacity-50">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Save Profile & Continue <ArrowRight className="h-4 w-4" /></>}
              </button>
            </>
          )}

          {step === 'connect' && (
            <>
              <div className="text-center">
                <p className="text-sm text-slate-200">Hi {profile?.name}. Link your verified partner to share this vault.</p>
                <p className="mt-1 text-xs text-slate-400">Signed in as {profile?.email}</p>
              </div>
              <button onClick={() => setStep('invite')} className="flex w-full items-center gap-3 rounded-2xl border border-indigo-500/30 bg-indigo-950/30 p-4 text-left text-white hover:border-indigo-400/60">
                <Mail className="h-5 w-5 text-indigo-400" />
                <span><strong className="block text-sm">Invite Partner by Email</strong><small className="text-xs text-slate-400">Your partner receives a sign-in code to link vaults.</small></span>
              </button>
              <button 
                onClick={async () => {
                  setLoading(true);
                  setError('');
                  try {
                    const pending = await getPendingPartnerInvites();
                    setInvites(pending);
                    setStep(pending.length ? 'accept' : 'connect');
                    if (!pending.length) setNotice('No pending invitation was found for this email.');
                  } catch (pendingError) { setError(getErrorMessage(pendingError)); }
                  finally { setLoading(false); }
                }} 
                disabled={loading} 
                className="flex w-full items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-4 text-left text-white hover:border-emerald-400/60 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin text-emerald-400" /> : <Users className="h-5 w-5 text-emerald-400" />}
                <span><strong className="block text-sm">Check Pending Invites</strong><small className="text-xs text-slate-400">Look for an invite sent to your email.</small></span>
              </button>
            </>
          )}

          {step === 'invite' && (
            <>
              <p className="text-sm text-slate-300">Your partner signs in with the email address you enter here. Their verified email is what authorizes linking this vault.</p>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-300">Partner email</label>
                <input type="email" value={partnerEmail} onChange={event => setPartnerEmail(event.target.value)} autoComplete="email" placeholder="partner@gmail.com" className="w-full rounded-xl border border-white/10 bg-slate-800/80 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep('connect')} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-slate-300"><ArrowLeft className="h-4 w-4" /> Back</button>
                <button onClick={handleInvitePartner} disabled={loading} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 py-3 text-sm font-bold text-white disabled:opacity-50">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Mail className="h-4 w-4" /> {invitationSent ? 'Resend code' : 'Send invite'}</>}
                </button>
              </div>
              {invitationSent && <p role="status" className="text-center text-xs text-emerald-300">Invitation sent. Once your partner verifies, both accounts link automatically.</p>}
            </>
          )}

          {step === 'accept' && (
            <>
              <p className="text-center text-sm text-slate-300">Invitations for {profile?.email}</p>
              {invites.map(invite => (
                <div key={invite.inviteId} className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-3">
                    {invite.inviterAvatarUrl ? (
                      <img src={invite.inviterAvatarUrl} alt={invite.inviterName} className="h-10 w-10 rounded-full object-cover ring-2 ring-emerald-500" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                        {invite.inviterName.slice(0, 1)}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-bold text-white">{invite.inviterName} invited you</p>
                      <p className="text-xs text-slate-400">{invite.vaultName}</p>
                    </div>
                  </div>
                  <button onClick={() => handleAcceptInvite(invite)} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3 text-sm font-bold text-white disabled:opacity-50">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4" /> Accept and link vault</>}
                  </button>
                </div>
              ))}
              <button onClick={() => setStep('connect')} className="w-full text-xs text-slate-400 hover:text-white">Not now</button>
            </>
          )}

          {(error || authError) && <p role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">{error || authError}</p>}
          {notice && step !== 'verify' && <p role="status" className="text-center text-xs text-emerald-300">{notice}</p>}
        </div>
        <p className="mt-4 text-center text-xs text-slate-500">NuPra Finance · Clean, Shared Financial Clarity</p>
      </div>
    </div>
  );
};

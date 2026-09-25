import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Camera, Check, Heart, Loader2, Phone, Users,
} from 'lucide-react';
import type { UserProfile, CoupleVault } from '../../types/finance';
import {
  acceptPartnerInvite,
  createCoupleVault,
  getMyOwnedVaultId,
  getPendingPartnerInvites,
  getSignedInUser,
  invitePartner,
  isSupportedPhoneNumber,
  PendingPartnerInvite,
  requestPhoneCode,
  saveProfile,
  verifyPhoneCode,
} from '../../services/supabaseFinance';
import { isSupabaseConfigured } from '../../services/supabaseClient';

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

const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong. Please try again.';
const phoneFromParts = (prefix: string, national: string) => {
  let digits = national.replace(/\D/g, '');
  if (prefix === '+49' && digits.startsWith('0')) digits = digits.slice(1);
  return `${prefix}${digits}`;
};

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete, initialProfile, authError }) => {
  const initialProfileId = initialProfile?.id;
  const [step, setStep] = useState<Step>(initialProfile ? 'connect' : 'identity');
  const [profile, setProfile] = useState<UserProfile | null>(initialProfile ?? null);
  const [name, setName] = useState(initialProfile?.name ?? '');
  const [phonePrefix, setPhonePrefix] = useState(initialProfile?.phone?.startsWith('+91') ? '+91' : '+49');
  const [phoneNumber, setPhoneNumber] = useState(initialProfile?.phone?.replace(/^\+49|^\+91/, '') ?? '');
  const [code, setCode] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(initialProfile?.avatarUrl ?? AVATAR_PRESETS[0]);
  const [partnerPrefix, setPartnerPrefix] = useState('+49');
  const [partnerNumber, setPartnerNumber] = useState('');
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
        if (active && user?.phone) {
          setPhonePrefix(user.phone.startsWith('+91') ? '+91' : '+49');
          setPhoneNumber(user.phone.replace(/^\+49|^\+91/, ''));
          setStep('profile');
          setProfile({
            id: user.id,
            name: user.user_metadata?.display_name ?? '',
            email: user.email ?? '',
            phone: user.phone,
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
  }, [initialProfileId, profile?.id]);

  useEffect(() => {
    if (authError) setError(authError);
  }, [authError]);

  const handleRequestCode = async () => {
    const phone = phoneFromParts(phonePrefix, phoneNumber);
    if (!name.trim() || !isSupportedPhoneNumber(phone)) {
      setError('Enter your name and a valid +49 or +91 phone number.');
      return;
    }
    setLoading(true);
    setError('');
    setNotice('');
    try {
      await requestPhoneCode(phone);
      setStep('verify');
      setNotice(`An SMS sign-in code was sent to ${phone}.`);
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
      const phone = phoneFromParts(phonePrefix, phoneNumber);
      const authUser = await verifyPhoneCode(phone, code);
      if (authUser.phone) {
        setPhonePrefix(authUser.phone.startsWith('+91') ? '+91' : '+49');
        setPhoneNumber(authUser.phone.replace(/^\+49|^\+91/, ''));
      }
      if (profile && profile.id === authUser.id) {
        const pending = await getPendingPartnerInvites();
        setInvites(pending);
        setStep(pending.length ? 'accept' : 'connect');
      } else {
        setProfile({
          id: authUser.id,
          name: name.trim(),
          email: authUser.email ?? '',
          phone: authUser.phone ?? phone,
          avatarUrl,
          partnerCode: '',
          vaultId: '',
          createdAt: new Date().toISOString(),
        });
        setStep('profile');
      }
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
    const partnerPhone = phoneFromParts(partnerPrefix, partnerNumber);
    if (!profile || !isSupportedPhoneNumber(partnerPhone)) {
      setError('Enter a valid partner phone number starting with +49 or +91.');
      return;
    }
    if (partnerPhone === profile.phone) {
      setError('Use a different phone number for your partner.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await saveProfile(profile);
      const activeVaultId = vaultId || await createCoupleVault(`${profile.name} & Partner`, 'INR', 0);
      setVaultId(activeVaultId);
      await invitePartner(activeVaultId, partnerPhone);
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
      setNotice(`An SMS code was sent to ${partnerPhone}. Your partner must verify this exact number to join.`);
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
          email: '',
          phone: invite.inviterPhone,
          avatarUrl: invite.inviterAvatarUrl,
          partnerCode: '',
          vaultId: linkedVaultId,
          createdAt: invite.createdAt,
        },
        partner2: me,
        currency: 'INR',
        monthlyBudget: 100000,
        createdAt: invite.createdAt,
      });
    } catch (acceptError) {
      setError(getErrorMessage(acceptError));
    } finally {
      setLoading(false);
    }
  };

  const stepTitles: Record<Step, string> = {
    identity: 'Sign in with phone',
    verify: 'Check your SMS',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 bg-gradient-to-br from-[#070a13] via-[#0e0d2e] to-[#100718]">
      <div className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-rose-600/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />
      <div className="relative w-full max-w-md py-6">
        <div className="mb-5 flex justify-center">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
            <span className="rounded-full bg-gradient-to-tr from-rose-500 to-indigo-600 p-1.5 text-white">
              <Heart className="h-5 w-5 fill-white" />
            </span>
            <span className="text-sm font-bold text-white">{stepTitles[step]}</span>
          </div>
        </div>

        <div className="space-y-4 rounded-3xl border border-white/10 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-xl">
          {step === 'identity' && (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-300">Your name</label>
                <input value={name} onChange={event => setName(event.target.value)} autoComplete="name" placeholder="Your name" className="w-full rounded-xl border border-white/10 bg-slate-800/80 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-rose-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-300">Phone number</label>
                <div className="flex gap-2">
                  <select value={phonePrefix} onChange={event => setPhonePrefix(event.target.value)} className="rounded-xl border border-white/10 bg-slate-800/80 px-3 text-sm text-white focus:border-rose-500 focus:outline-none">
                    <option value="+49">+49 Germany</option>
                    <option value="+91">+91 India</option>
                  </select>
                  <input type="tel" value={phoneNumber} onChange={event => setPhoneNumber(event.target.value.replace(/[^\d\s()-]/g, ''))} autoComplete="tel-national" inputMode="tel" placeholder={phonePrefix === '+49' ? '151 23456789' : '9876543210'} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-800/80 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-rose-500 focus:outline-none" />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">SMS codes available for +49 and +91 numbers.</p>
              </div>
              <button onClick={handleRequestCode} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 py-3 text-sm font-bold text-white disabled:opacity-50">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Phone className="h-4 w-4" /> Text me a sign-in code</>}
              </button>
            </>
          )}

          {step === 'verify' && (
            <>
              <p className="text-center text-sm text-slate-300">{notice || `Enter the SMS code sent to ${phoneFromParts(phonePrefix, phoneNumber)}.`}</p>
              <input value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" className="w-full rounded-xl border border-white/10 bg-slate-800/80 px-4 py-4 text-center text-2xl font-black tracking-[0.3em] text-white placeholder:text-slate-600 focus:border-rose-500 focus:outline-none" />
              <div className="flex gap-3">
                <button onClick={() => { setError(''); setStep('identity'); }} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-slate-300"><ArrowLeft className="h-4 w-4" /> Back</button>
                <button onClick={handleVerifyCode} disabled={loading || code.length !== 6} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 py-3 text-sm font-bold text-white disabled:opacity-40">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Verify <ArrowRight className="h-4 w-4" /></>}
                </button>
              </div>
              <button onClick={handleRequestCode} disabled={loading} className="w-full text-xs text-slate-400 hover:text-white disabled:opacity-40">Send a new SMS code</button>
            </>
          )}

          {step === 'profile' && (
            <>
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <img src={avatarUrl} alt="Your profile" className="h-24 w-24 rounded-full object-cover ring-4 ring-rose-500/40" />
                  <button type="button" onClick={() => fileInputRef.current?.click()} aria-label="Upload profile photo" className="absolute bottom-0 right-0 rounded-full bg-rose-600 p-2 text-white"><Camera className="h-4 w-4" /></button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </div>
                <div className="flex justify-center gap-2">
                  {AVATAR_PRESETS.map(url => <button key={url} type="button" onClick={() => setAvatarUrl(url)} className={`rounded-full ${avatarUrl === url ? 'ring-2 ring-rose-500' : ''}`}><img src={url} alt="Choose avatar" className="h-9 w-9 rounded-full object-cover" /></button>)}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-300">Your name</label>
                <input value={name} onChange={event => setName(event.target.value)} autoComplete="name" className="w-full rounded-xl border border-white/10 bg-slate-800/80 px-4 py-3 text-sm text-white focus:border-rose-500 focus:outline-none" />
              </div>
              <p className="text-xs text-slate-400">Verified phone: {profile?.phone}</p>
              <button onClick={handleSaveProfile} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 py-3 text-sm font-bold text-white disabled:opacity-50">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Save profile <ArrowRight className="h-4 w-4" /></>}
              </button>
            </>
          )}

          {step === 'connect' && (
            <>
              <div className="text-center">
                <p className="text-sm text-slate-200">Hi {profile?.name}. Link one verified partner to share this vault.</p>
                <p className="mt-1 text-xs text-slate-400">Signed in as {profile?.phone}</p>
              </div>
              <button onClick={() => setStep('invite')} className="flex w-full items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-950/30 p-4 text-left text-white hover:border-rose-400/60">
                <Phone className="h-5 w-5 text-rose-400" /><span><strong className="block text-sm">Invite by SMS</strong><small className="text-xs text-slate-400">Text a sign-in code to your partner.</small></span>
              </button>
              <button onClick={async () => {
                setLoading(true);
                setError('');
                try {
                  const pending = await getPendingPartnerInvites();
                  setInvites(pending);
                  setStep(pending.length ? 'accept' : 'connect');
                  if (!pending.length) setNotice('No pending invitation was found for this phone number.');
                } catch (pendingError) { setError(getErrorMessage(pendingError)); }
                finally { setLoading(false); }
              }} disabled={loading} className="flex w-full items-center gap-3 rounded-2xl border border-indigo-500/30 bg-indigo-950/30 p-4 text-left text-white hover:border-indigo-400/60 disabled:opacity-50">
                {loading ? <Loader2 className="h-5 w-5 animate-spin text-indigo-400" /> : <Users className="h-5 w-5 text-indigo-400" />}<span><strong className="block text-sm">Check invitations</strong><small className="text-xs text-slate-400">Look for an invite sent to this phone.</small></span>
              </button>
            </>
          )}

          {step === 'invite' && (
            <>
              <p className="text-sm text-slate-300">Your partner signs in with the exact phone number you invite. Their verified number authorizes joining this vault.</p>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-300">Partner phone number</label>
                <div className="flex gap-2">
                  <select value={partnerPrefix} onChange={event => setPartnerPrefix(event.target.value)} className="rounded-xl border border-white/10 bg-slate-800/80 px-3 text-sm text-white focus:border-rose-500 focus:outline-none">
                    <option value="+49">+49 Germany</option>
                    <option value="+91">+91 India</option>
                  </select>
                  <input type="tel" value={partnerNumber} onChange={event => setPartnerNumber(event.target.value.replace(/[^\d\s()-]/g, ''))} autoComplete="tel" inputMode="tel" placeholder={partnerPrefix === '+49' ? '151 23456789' : '9876543210'} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-800/80 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-rose-500 focus:outline-none" />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep('connect')} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-slate-300"><ArrowLeft className="h-4 w-4" /> Back</button>
                <button onClick={handleInvitePartner} disabled={loading} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 py-3 text-sm font-bold text-white disabled:opacity-50">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Phone className="h-4 w-4" /> {invitationSent ? 'Resend SMS' : 'Send invite'}</>}
                </button>
              </div>
              {invitationSent && <p role="status" className="text-center text-xs text-emerald-300">Invitation sent. This screen stays open until the partner verifies and joins.</p>}
            </>
          )}

          {step === 'accept' && (
            <>
              <p className="text-center text-sm text-slate-300">Invitations for {profile?.phone}</p>
              {invites.map(invite => (
                <div key={invite.inviteId} className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-3">
                    {invite.inviterAvatarUrl ? <img src={invite.inviterAvatarUrl} alt={invite.inviterName} className="h-10 w-10 rounded-full object-cover" /> : <Heart className="h-8 w-8 text-rose-400" />}
                    <div><p className="text-sm font-bold text-white">{invite.inviterName} invited you</p><p className="text-xs text-slate-400">{invite.vaultName}</p></div>
                  </div>
                  <button onClick={() => handleAcceptInvite(invite)} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3 text-sm font-bold text-white disabled:opacity-50">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4" /> Accept and link</>}
                  </button>
                </div>
              ))}
              <button onClick={() => setStep('connect')} className="w-full text-xs text-slate-400 hover:text-white">Not now</button>
            </>
          )}

          {(error || authError) && <p role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">{error || authError}</p>}
          {notice && step !== 'verify' && <p role="status" className="text-center text-xs text-emerald-300">{notice}</p>}
        </div>
        <p className="mt-4 text-center text-xs text-slate-600">NuPra Finance · Secure couple login</p>
      </div>
    </div>
  );
};

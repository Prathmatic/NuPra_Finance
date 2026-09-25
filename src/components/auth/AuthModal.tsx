import React, { useState, useRef } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { 
  X, 
  Camera, 
  Upload, 
  Check, 
  Copy, 
  Link2, 
  Heart, 
  User, 
  ShieldCheck, 
  GitBranch, 
  Cloud 
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80'
];

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { 
    currentUser, 
    updateCurrentUserProfile, 
    vault, 
    partner, 
    joinVaultWithCode 
  } = useFinance();

  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl);
  const [partnerCodeInput, setPartnerCodeInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState(false);
  const [joinError, setJoinError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert file to Base64 image
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateCurrentUserProfile({
      name: name.trim() || 'Nu',
      email: email.trim() || 'user@finance.love',
      avatarUrl: avatarUrl || currentUser.avatarUrl,
    });
    onClose();
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(vault.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoinPartner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerCodeInput.trim()) return;
    const ok = joinVaultWithCode(partnerCodeInput.trim());
    if (ok) {
      setJoinSuccess(true);
      setJoinError('');
      setTimeout(() => setJoinSuccess(false), 3000);
    } else {
      setJoinError('Invalid invite code. Try NUPRA-2026');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg glass-panel bg-slate-900/95 border border-white/15 rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-rose-500 to-indigo-600 text-white shadow-glow-rose">
              <Heart className="w-5 h-5 fill-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Profile & Couple Vault</h2>
              <p className="text-xs text-slate-400">NuPra Finance Cloud Authentication</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Picture Upload Section */}
        <div className="mt-5 text-center">
          <div className="relative inline-block">
            <img
              src={avatarUrl}
              alt="Profile"
              className="w-24 h-24 rounded-full object-cover ring-4 ring-rose-500/50 shadow-glow-rose"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-2 rounded-full bg-gradient-to-tr from-rose-600 to-pink-600 text-white shadow-md hover:scale-110 active:scale-95 transition-all"
              title="Upload your photo"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Tap the camera icon to upload your own photo
          </p>

          {/* Quick preset avatars */}
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Or pick:</span>
            {AVATAR_PRESETS.slice(0, 4).map((url, i) => (
              <img
                key={i}
                src={url}
                alt="preset"
                onClick={() => setAvatarUrl(url)}
                className={`w-7 h-7 rounded-full object-cover cursor-pointer hover:scale-110 transition-all ${
                  avatarUrl === url ? 'ring-2 ring-rose-500' : 'opacity-60 hover:opacity-100'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Edit User Details */}
        <form onSubmit={handleSaveProfile} className="mt-5 space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-white/10 text-white text-sm focus:outline-none focus:border-rose-500 transition-all"
              placeholder="e.g. Nu or Pra"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email (Cloud ID)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-white/10 text-white text-sm focus:outline-none focus:border-rose-500 transition-all"
              placeholder="you@finance.love"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-indigo-600 hover:opacity-90 text-white font-semibold text-sm shadow-md shadow-rose-500/25 transition-all"
          >
            Save Profile & Photo
          </button>
        </form>

        {/* Couple Vault & Partner Section */}
        <div className="mt-6 pt-5 border-t border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <Link2 className="w-4 h-4 text-rose-400" />
            <h3 className="text-sm font-bold text-white">Couple Collaboration</h3>
          </div>

          {/* Current Partner Status */}
          {partner ? (
            <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={partner.avatarUrl}
                  alt={partner.name}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold text-white">{partner.name}</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Connected ❤️
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{partner.email}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-slate-800/60 border border-white/10 text-xs text-slate-400">
              No partner paired yet. Share your code below to track finances together live!
            </div>
          )}

          {/* Share Your Invite Code */}
          <div className="mt-3 p-3.5 rounded-2xl bg-slate-800/70 border border-white/10 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-slate-400">Your Couple Vault Code:</p>
              <p className="text-base font-extrabold text-rose-400 tracking-wider">
                {vault.inviteCode}
              </p>
            </div>
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>
          </div>

          {/* Join Partner Vault */}
          <form onSubmit={handleJoinPartner} className="mt-3 flex gap-2">
            <input
              type="text"
              value={partnerCodeInput}
              onChange={(e) => setPartnerCodeInput(e.target.value)}
              placeholder="Enter Partner's Code"
              className="flex-1 px-3.5 py-2 rounded-xl bg-slate-800/80 border border-white/10 text-white text-xs uppercase tracking-wider focus:outline-none focus:border-rose-500"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all"
            >
              Link Partner
            </button>
          </form>
          {joinSuccess && (
            <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
              <Check className="w-3 h-3" /> Successfully paired with partner!
            </p>
          )}
          {joinError && (
            <p className="text-xs text-rose-400 mt-1">{joinError}</p>
          )}
        </div>

        {/* Cloud & Git Persistence Notice */}
        <div className="mt-5 p-3 rounded-2xl bg-slate-950/70 border border-white/5 text-[11px] text-slate-400 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="text-slate-200 font-semibold">Decoupled Cloud State: </span>
            Your finances, stock investments, and goals reside safely in the cloud sync store. Future Git pushes and app improvements will never affect or overwrite your data.
          </div>
        </div>
      </div>
    </div>
  );
};

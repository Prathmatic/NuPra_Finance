import React, { useState, useRef } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { X, Camera, Link2, Heart, ShieldCheck, LogOut } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
];

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, updateCurrentUserProfile, vault, partner, signOut } = useFinance();

  const [name, setName] = useState(currentUser?.name ?? '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl ?? AVATAR_PRESETS[0]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === 'string') setAvatarUrl(reader.result); };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateCurrentUserProfile({
      name: name.trim() || currentUser?.name || 'User',
      avatarUrl: avatarUrl || currentUser?.avatarUrl || AVATAR_PRESETS[0],
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg glass-panel bg-slate-900/95 border border-white/15 rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar">

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-rose-500 to-indigo-600 text-white">
              <Heart className="w-5 h-5 fill-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Profile & Vault</h2>
              <p className="text-xs text-slate-400">NuPra Finance Settings</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Picture */}
        <div className="mt-5 text-center">
          <div className="relative inline-block">
            <img src={avatarUrl} alt="Profile" className="w-24 h-24 rounded-full object-cover ring-4 ring-rose-500/50" />
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-2 rounded-full bg-gradient-to-tr from-rose-600 to-pink-600 text-white shadow-md hover:scale-110 transition-all">
              <Camera className="w-4 h-4" />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </div>
          <p className="text-xs text-slate-400 mt-2">Tap camera to upload photo</p>
          <div className="flex items-center justify-center gap-2 mt-3">
            {AVATAR_PRESETS.map((url, i) => (
              <img key={i} src={url} alt="" onClick={() => setAvatarUrl(url)}
                className={`w-8 h-8 rounded-full object-cover cursor-pointer hover:scale-110 transition-all ${avatarUrl === url ? 'ring-2 ring-rose-500' : 'opacity-60 hover:opacity-100'}`}
              />
            ))}
          </div>
        </div>

        {/* Edit Details */}
        <form onSubmit={handleSaveProfile} className="mt-5 space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Your Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-white/10 text-white text-sm focus:outline-none focus:border-rose-500 transition-all"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
            <input type="email" value={currentUser?.email ?? ''} readOnly
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/50 border border-white/10 text-slate-400 text-sm focus:outline-none"
              aria-describedby="verified-email-note"
            />
            <p id="verified-email-note" className="mt-1 text-[11px] text-slate-500">Verified by Supabase Auth</p>
          </div>
          <button type="submit" className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-indigo-600 hover:opacity-90 text-white font-semibold text-sm shadow-md transition-all">
            Save Profile & Photo
          </button>
        </form>

        {/* Partner Status */}
        {vault && (
          <div className="mt-6 pt-5 border-t border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <Link2 className="w-4 h-4 text-rose-400" />
              <h3 className="text-sm font-bold text-white">Partner Connection</h3>
            </div>

            {partner ? (
              <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/20 flex items-center gap-3">
                <img src={partner.avatarUrl} alt={partner.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold text-white">{partner.name}</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Connected</span>
                  </div>
                  <p className="text-xs text-slate-400">{partner.email}</p>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-slate-800/60 border border-white/10 text-xs text-slate-400">
                Invitation sent. Your partner must sign in with the invited email address to join this vault.
              </div>
            )}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
            Supabase-secured couple vault
          </div>
          <button type="button" onClick={signOut} className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-300 hover:bg-rose-500/10 hover:text-rose-300">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
};

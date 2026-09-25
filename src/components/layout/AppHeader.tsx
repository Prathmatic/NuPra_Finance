import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { 
  Heart, Wifi, Users, User, Settings, ChevronDown
} from 'lucide-react';

interface AppHeaderProps {
  onOpenProfile: () => void;
  onOpenAddModal: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ onOpenProfile }) => {
  const { 
    currentUser, 
    partner, 
    vault, 
    currency, 
    setCurrency, 
    viewMode, 
    setViewMode, 
    isSyncing 
  } = useFinance();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  if (!currentUser) return null;

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/10 px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
        {/* App Brand */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 via-pink-500 to-indigo-600 p-0.5 shadow-glow-rose">
            <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
              <Heart className="w-5 h-5 text-rose-500 fill-rose-500 animate-pulse" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isSyncing ? 'bg-amber-400' : 'bg-emerald-400'}`} />
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isSyncing ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-extrabold text-base md:text-lg tracking-tight bg-gradient-to-r from-rose-400 via-pink-300 to-indigo-300 bg-clip-text text-transparent">
                NuPra Finance
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                APK
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Wifi className="w-3 h-3 text-emerald-400" />
              <span>{isSyncing ? 'Syncing...' : 'Cloud Live'}</span>
              {vault && <><span>•</span><span className="text-slate-300 font-medium truncate max-w-[120px]">{vault.name}</span></>}
            </div>
          </div>
        </div>

        {/* Currency & Profile */}
        <div className="flex items-center gap-2">
          {/* Currency Toggle */}
          <div className="flex items-center bg-slate-800/80 p-0.5 rounded-xl border border-white/10 text-xs font-semibold">
            <button onClick={() => setCurrency('INR')}
              className={`px-2 py-1 rounded-lg transition-all ${currency === 'INR' ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>
              ₹ INR
            </button>
            <button onClick={() => setCurrency('EUR')}
              className={`px-2 py-1 rounded-lg transition-all ${currency === 'EUR' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>
              € EUR
            </button>
          </div>

          {/* User Avatar with Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-1.5 p-1 rounded-full bg-slate-800/90 border border-white/15 hover:border-rose-500/50 transition-all focus:outline-none"
            >
              <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-8 h-8 rounded-full object-cover ring-2 ring-rose-500/60" />
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 mr-1" />
            </button>

            {isUserMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 glass-dropdown rounded-2xl p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                  {/* Current user */}
                  <div className="px-3 py-2.5 border-b border-white/10 mb-1">
                    <div className="flex items-center gap-2.5">
                      <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-8 h-8 rounded-full object-cover ring-2 ring-rose-500/50" />
                      <div>
                        <p className="text-sm font-bold text-white flex items-center gap-1">
                          {currentUser.name}
                          <span className="text-[10px] px-1.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">You</span>
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">{currentUser.phone || currentUser.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Partner */}
                  {partner && (
                    <div className="px-3 py-2.5 border-b border-white/10 mb-1">
                      <div className="flex items-center gap-2.5">
                        <img src={partner.avatarUrl} alt={partner.name} className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-500/50" />
                        <div>
                          <p className="text-sm font-bold text-white flex items-center gap-1">
                            {partner.name}
                            <span className="text-[10px] px-1.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">Partner</span>
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">{partner.phone || partner.email}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-1">
                    <button
                      onClick={() => { setIsUserMenuOpen(false); onOpenProfile(); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-200 hover:bg-white/10 transition-all text-left"
                    >
                      <Settings className="w-4 h-4 text-rose-400" />
                      <span>Profile & Settings</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* View Mode */}
      <div className="max-w-4xl mx-auto mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span>Perspective:</span>
        </div>
        <div className="flex items-center bg-slate-900/90 p-0.5 rounded-xl border border-white/10 text-xs font-medium shadow-inner">
          <button onClick={() => setViewMode('both')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${viewMode === 'both' ? 'bg-gradient-to-r from-rose-500 to-indigo-600 text-white font-semibold shadow-md' : 'text-slate-400 hover:text-slate-200'}`}>
            <Users className="w-3.5 h-3.5" />
            <span>Together</span>
          </button>
          <button onClick={() => setViewMode('me')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${viewMode === 'me' ? 'bg-rose-600 text-white font-semibold shadow-md' : 'text-slate-400 hover:text-slate-200'}`}>
            <User className="w-3.5 h-3.5" />
            <span>{currentUser.name}</span>
          </button>
          {partner && (
            <button onClick={() => setViewMode('partner')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${viewMode === 'partner' ? 'bg-indigo-600 text-white font-semibold shadow-md' : 'text-slate-400 hover:text-slate-200'}`}>
              <Heart className="w-3.5 h-3.5" />
              <span>{partner.name}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

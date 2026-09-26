import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { 
  Wifi, 
  Users, 
  User, 
  Settings, 
  ChevronDown,
  RefreshCw
} from 'lucide-react';
import { NPIcon } from '../common/NPIcon';

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
    isSyncing,
    refreshSync 
  } = useFinance();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  if (!currentUser) return null;

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/10 px-4 py-3 backdrop-blur-xl">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
        {/* App Brand with NP Monogram */}
        <div className="flex items-center gap-2.5">
          <NPIcon size="md" />

          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-extrabold text-base md:text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                NuPra Finance
              </h1>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Wifi className={`w-3 h-3 ${isSyncing ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}`} />
                <span>{isSyncing ? 'Syncing...' : 'Cloud Live'}</span>
              </span>
              <button 
                type="button"
                onClick={() => void refreshSync()} 
                title="Sync now with cloud"
                className="p-0.5 rounded text-slate-500 hover:text-white transition-colors"
              >
                <RefreshCw className={`w-2.5 h-2.5 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
              </button>
              {vault && (
                <>
                  <span>•</span>
                  <span className="text-slate-300 font-medium truncate max-w-[120px]">{vault.name}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Currency & Profile */}
        <div className="flex items-center gap-2">
          {/* Currency Toggle */}
          <div className="flex items-center bg-slate-800/80 p-0.5 rounded-xl border border-white/10 text-xs font-semibold">
            <button 
              onClick={() => setCurrency('INR')}
              className={`px-2 py-1 rounded-lg transition-all ${
                currency === 'INR' 
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm font-bold' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ₹ INR
            </button>
            <button 
              onClick={() => setCurrency('EUR')}
              className={`px-2 py-1 rounded-lg transition-all ${
                currency === 'EUR' 
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm font-bold' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              € EUR
            </button>
          </div>

          {/* User Avatar with Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-1.5 p-1 rounded-full bg-slate-800/90 border border-white/15 hover:border-indigo-500/50 transition-all focus:outline-none"
            >
              <img 
                src={currentUser.avatarUrl} 
                alt={currentUser.name} 
                className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-500/60" 
              />
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 mr-1" />
            </button>

            {isUserMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 glass-dropdown rounded-2xl p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                  {/* Current user */}
                  <div className="px-3 py-2.5 border-b border-white/10 mb-1">
                    <div className="flex items-center gap-2.5">
                      <img 
                        src={currentUser.avatarUrl} 
                        alt={currentUser.name} 
                        className="w-8 h-8 rounded-full object-cover ring-2 ring-emerald-500/50" 
                      />
                      <div>
                        <p className="text-sm font-bold text-white flex items-center gap-1">
                          {currentUser.name}
                          <span className="text-[10px] px-1.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">You</span>
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">{currentUser.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Partner */}
                  {partner && (
                    <div className="px-3 py-2.5 border-b border-white/10 mb-1">
                      <div className="flex items-center gap-2.5">
                        <img 
                          src={partner.avatarUrl} 
                          alt={partner.name} 
                          className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-500/50" 
                        />
                        <div>
                          <p className="text-sm font-bold text-white flex items-center gap-1">
                            {partner.name}
                            <span className="text-[10px] px-1.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">Partner</span>
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">{partner.email}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-1">
                    <button
                      onClick={() => { setIsUserMenuOpen(false); onOpenProfile(); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-200 hover:bg-white/10 transition-all text-left"
                    >
                      <Settings className="w-4 h-4 text-indigo-400" />
                      <span>Profile & Settings</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Perspective / View Mode */}
      <div className="max-w-4xl mx-auto mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span>Perspective:</span>
        </div>
        <div className="flex items-center bg-slate-900/90 p-0.5 rounded-xl border border-white/10 text-xs font-medium shadow-inner">
          <button 
            onClick={() => setViewMode('both')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
              viewMode === 'both' 
                ? 'bg-gradient-to-r from-emerald-600 to-indigo-600 text-white font-semibold shadow-md' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Together</span>
          </button>
          <button 
            onClick={() => setViewMode('me')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
              viewMode === 'me' 
                ? 'bg-emerald-600 text-white font-semibold shadow-md' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>{currentUser.name}</span>
          </button>
          {partner && (
            <button 
              onClick={() => setViewMode('partner')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                viewMode === 'partner' 
                  ? 'bg-indigo-600 text-white font-semibold shadow-md' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>{partner.name}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

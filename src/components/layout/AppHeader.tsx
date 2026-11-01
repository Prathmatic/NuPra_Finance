import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { 
  Users, 
  User, 
  Settings, 
  ChevronDown,
  Bell,
  Database,
  Archive
} from 'lucide-react';
import { NPIcon } from '../common/NPIcon';
import { CurrencyConverterModal } from '../common/CurrencyConverterModal';
import { UserAvatar } from '../common/UserAvatar';
import { ActivityNotificationDrawer } from './ActivityNotificationDrawer';
import { BackupExportModal } from '../common/BackupExportModal';
import { RestoreBackupModal } from '../common/RestoreBackupModal';
import { ArchiveItemType } from '../../types/finance';

interface AppHeaderProps {
  onOpenProfile: () => void;
  onOpenAddModal: () => void;
  onOpenArchive?: (type?: ArchiveItemType) => void;
  onReplaySplash?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ onOpenProfile, onOpenArchive, onReplaySplash }) => {
  const { 
    currentUser, 
    partner, 
    vault, 
    currency, 
    setCurrency, 
    viewMode, 
    setViewMode, 
    isSyncing,
    refreshSync,
    exchangeRate,
    isRateLoading,
    notifications,
    archiveCount,
  } = useFinance();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isConverterOpen, setIsConverterOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isBackupExportOpen, setIsBackupExportOpen] = useState(false);
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);

  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  if (!currentUser) return null;

  return (
    <header 
      className="sticky top-0 z-40 w-full glass-panel border-b border-white/10 px-4 backdrop-blur-xl"
      style={{
        paddingTop: 'max(28px, env(safe-area-inset-top, 28px))',
        paddingBottom: '12px'
      }}
    >
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
        {/* App Brand with NP Monogram */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <button
            type="button"
            onClick={onReplaySplash}
            title="Replay NP Intro Animation"
            className="hover:scale-105 active:scale-95 transition-transform cursor-pointer rounded-2xl focus:outline-none shrink-0"
          >
            <NPIcon size="md" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="font-extrabold text-base md:text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent truncate">
              NuPra Finance
            </h1>
            {isSyncing && (
              <span title="Syncing with cloud" className="shrink-0">
                <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />
              </span>
            )}
          </div>
        </div>

        {/* Currency & Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Live Rate Pill — hidden on xs to keep room for bell + avatar */}
          <button
            type="button"
            onClick={() => setIsConverterOpen(true)}
            title="Live European Central Bank Rate: Tap to open Currency Converter"
            className="hidden sm:flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 text-xs font-semibold text-slate-200 transition-all active:scale-95 group cursor-pointer shrink-0"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 group-hover:scale-125 transition-transform" />
            <span className="text-[10px] sm:text-[11px] font-bold text-teal-300 whitespace-nowrap">
              <span className="hidden xs:inline">1 € = </span>₹{exchangeRate.toFixed(1)}
            </span>
            <RefreshCw className={`w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-400 group-hover:text-teal-400 transition-colors ${isRateLoading ? 'animate-spin' : ''}`} />
          </button>

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

          {/* Activity Notifications Bell */}
          <button
            type="button"
            onClick={() => setIsNotificationsOpen(true)}
            title="Activity Notifications"
            className="relative p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 text-slate-300 hover:text-white transition-all active:scale-95 cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center animate-pulse shadow-md">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* User Avatar with Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-1.5 p-1 rounded-full bg-slate-800/90 border border-white/15 hover:border-indigo-500/50 transition-all focus:outline-none"
            >
              <UserAvatar 
                src={currentUser.avatarUrl} 
                name={currentUser.name} 
                size="md"
                ringColor="ring-indigo-500/60"
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
                      <UserAvatar 
                        src={currentUser.avatarUrl} 
                        name={currentUser.name} 
                        size="md"
                        ringColor="ring-emerald-500/50" 
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
                        <UserAvatar 
                          src={partner.avatarUrl} 
                          name={partner.name} 
                          size="md"
                          ringColor="ring-indigo-500/50" 
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

                  <div className="pt-1 space-y-0.5">
                    <button
                      onClick={() => { setIsUserMenuOpen(false); setIsBackupExportOpen(true); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-200 hover:bg-white/10 transition-all text-left cursor-pointer"
                    >
                      <Database className="w-4 h-4 text-teal-400" />
                      <span>Backup & Export Data</span>
                    </button>
                    <button
                      onClick={() => { setIsUserMenuOpen(false); onOpenProfile(); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-200 hover:bg-white/10 transition-all text-left cursor-pointer"
                    >
                      <Settings className="w-4 h-4 text-indigo-400" />
                      <span>Profile & Settings</span>
                    </button>
                    <button
                      onClick={() => { setIsUserMenuOpen(false); onOpenArchive?.(); }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-slate-200 hover:bg-white/10 transition-all text-left group"
                    >
                      <div className="flex items-center gap-2">
                        <Archive className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                        <span>Archive & Trash</span>
                      </div>
                      {archiveCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold">
                          {archiveCount}
                        </span>
                      )}
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

      <CurrencyConverterModal
        isOpen={isConverterOpen}
        onClose={() => setIsConverterOpen(false)}
      />

      <ActivityNotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />

      <BackupExportModal
        isOpen={isBackupExportOpen}
        onClose={() => setIsBackupExportOpen(false)}
        onOpenRestore={() => setIsRestoreOpen(true)}
      />

      <RestoreBackupModal
        isOpen={isRestoreOpen}
        onClose={() => setIsRestoreOpen(false)}
        onOpenExport={() => setIsBackupExportOpen(true)}
      />
    </header>
  );
};

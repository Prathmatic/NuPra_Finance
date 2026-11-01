import React, { useState, useEffect, useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { 
  X, 
  Download, 
  Database, 
  FileSpreadsheet, 
  Calendar, 
  Check, 
  CheckCircle2, 
  AlertTriangle, 
  Archive, 
  RefreshCw, 
  Upload, 
  TrendingUp, 
  Receipt, 
  Target, 
  PiggyBank, 
  Clock,
  Sparkles,
  ShieldCheck,
  CreditCard
} from 'lucide-react';
import { 
  TimeRangePreset, 
  calculateRangeDates, 
  buildBackupExportPayload, 
  downloadJsonBackup, 
  downloadCsvBackup, 
  fetchDeletedItems, 
  DeletedItemEntry 
} from '../../services/backupService';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface BackupExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRestore?: () => void;
}

export const BackupExportModal: React.FC<BackupExportModalProps> = ({
  isOpen,
  onClose,
  onOpenRestore,
}) => {
  const { 
    currentUser, 
    partner, 
    vault, 
    transactions, 
    goals, 
    bills, 
    stocks, 
    budgets, 
    categories, 
    currency, 
    showToast,
    createManualBackup
  } = useFinance();

  const [preset, setPreset] = useState<TimeRangePreset>('30d');
  const [customStart, setCustomStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [customEnd, setCustomEnd] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [includeDeleted, setIncludeDeleted] = useState<boolean>(true);
  const [isExportingJson, setIsExportingJson] = useState<boolean>(false);
  const [isExportingCsv, setIsExportingCsv] = useState<boolean>(false);
  const [isCreatingCloudBackup, setIsCreatingCloudBackup] = useState<boolean>(false);
  const [deletedEntries, setDeletedEntries] = useState<DeletedItemEntry[]>([]);
  const [isLoadingArchive, setIsLoadingArchive] = useState<boolean>(false);

  const [modules, setModules] = useState({
    transactions: true,
    bills: true,
    goals: true,
    stocks: true,
    budgets: true,
  });

  const vaultId = vault?.id || 'local_vault';
  const vaultName = vault?.name || `${currentUser?.name || 'Partner'}'s Couple Vault`;

  // Fetch deleted/archived items from database backup table
  useEffect(() => {
    if (!isOpen || !vaultId) return;
    let isMounted = true;
    setIsLoadingArchive(true);

    fetchDeletedItems(vaultId)
      .then(items => {
        if (isMounted) {
          setDeletedEntries(items);
        }
      })
      .catch(err => console.warn('Could not load deleted archive items:', err))
      .finally(() => {
        if (isMounted) setIsLoadingArchive(false);
      });

    return () => { isMounted = false; };
  }, [isOpen, vaultId]);

  // Current active snapshot
  const activeSnapshot = useMemo(() => ({
    transactions,
    goals,
    bills,
    stocks,
    categories,
    budgets,
    currency,
  }), [transactions, goals, bills, stocks, categories, budgets, currency]);

  // Compute live payload preview
  const payload = useMemo(() => {
    return buildBackupExportPayload(activeSnapshot, vaultId, vaultName, {
      rangePreset: preset,
      customStart,
      customEnd,
      includeDeleted,
      deletedEntries,
      modules,
    });
  }, [activeSnapshot, vaultId, vaultName, preset, customStart, customEnd, includeDeleted, deletedEntries, modules]);

  if (!isOpen) return null;

  const toggleModule = (key: keyof typeof modules) => {
    setModules(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleExportJson = async () => {
    try {
      setIsExportingJson(true);
      const ok = await downloadJsonBackup(payload);
      if (ok) {
        showToast('JSON Database backup downloaded successfully! 💾', 'success');
      } else {
        showToast('Backup prepared. Check your downloads folder.', 'info');
      }
    } catch (err: any) {
      showToast(`Export failed: ${err.message || 'Error'}`, 'error');
    } finally {
      setIsExportingJson(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      setIsExportingCsv(true);
      const ok = await downloadCsvBackup(payload);
      if (ok) {
        showToast('CSV Spreadsheet downloaded successfully! 📊', 'success');
      } else {
        showToast('Spreadsheet prepared. Check your downloads folder.', 'info');
      }
    } catch (err: any) {
      showToast(`Export failed: ${err.message || 'Error'}`, 'error');
    } finally {
      setIsExportingCsv(false);
    }
  };

  const handleTriggerCloudBackup = async () => {
    try {
      setIsCreatingCloudBackup(true);
      const ok = await createManualBackup('Manual Backup via Export Center');
      if (ok) {
        // Refresh deleted and backups
        fetchDeletedItems(vaultId).then(setDeletedEntries);
      }
    } finally {
      setIsCreatingCloudBackup(false);
    }
  };

  const rangeDates = calculateRangeDates(preset, customStart, customEnd);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl glass-panel bg-slate-900/95 border border-white/15 rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto no-scrollbar space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-indigo-500 via-teal-500 to-emerald-500 text-white shadow-glow-indigo">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                Backup & Data Export Center
              </h2>
              <p className="text-xs text-slate-400">
                Continuous database protection for {vaultName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Database Continuous Protection Callout */}
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-200 leading-relaxed">
            <p className="font-bold text-emerald-300">Continuous Database Protection Active</p>
            <p className="text-emerald-200/90 text-[11px] mt-0.5">
              Whenever you delete a transaction, bill, or goal, it is safely preserved in your database archive table and can be included in exports.
            </p>
          </div>
        </div>

        {/* Step 1: Time Range Presets */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Select Time Range</span>
            </label>
            <span className="text-[11px] text-slate-400">
              {preset === 'all' ? 'All time records' : `${formatDate(rangeDates.startDate)} – ${formatDate(rangeDates.endDate)}`}
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 p-1 rounded-2xl bg-slate-800/60 border border-white/5">
            {[
              { id: '7d', label: '7 Days' },
              { id: '30d', label: '1 Month' },
              { id: '3m', label: '3 Months' },
              { id: '6m', label: '6 Months' },
              { id: 'custom', label: 'Custom' },
              { id: 'all', label: 'All Time' },
            ].map(p => {
              const isSelected = preset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPreset(p.id as TimeRangePreset)}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-indigo-600 to-teal-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Custom Date Pickers */}
          {preset === 'custom' && (
            <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-800/40 border border-white/10 animate-in fade-in duration-150">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">From Date</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">To Date</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Modules Selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
            Included Data Modules
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { key: 'transactions', label: 'Transactions', count: payload.summary.transactionsCount, icon: CreditCard, color: 'text-emerald-400' },
              { key: 'bills', label: 'Bills & Reminders', count: payload.summary.billsCount, icon: Receipt, color: 'text-sky-400' },
              { key: 'goals', label: 'Goals & Savings', count: payload.summary.goalsCount, icon: Target, color: 'text-amber-400' },
              { key: 'stocks', label: 'Investments', count: payload.summary.stocksCount, icon: TrendingUp, color: 'text-indigo-400' },
              { key: 'budgets', label: 'Budgets & Notes', count: 1, icon: PiggyBank, color: 'text-pink-400' },
            ].map(m => {
              const isChecked = modules[m.key as keyof typeof modules];
              const IconComponent = m.icon;
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => toggleModule(m.key as keyof typeof modules)}
                  className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    isChecked
                      ? 'bg-slate-800/90 border-indigo-500/40 text-white'
                      : 'bg-slate-800/30 border-white/5 text-slate-500 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <IconComponent className={`w-3.5 h-3.5 shrink-0 ${isChecked ? m.color : 'text-slate-500'}`} />
                    <span className="text-xs font-semibold truncate">{m.label}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                    isChecked ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white/5 text-slate-500'
                  }`}>
                    {m.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 3: Database Archive / Deleted Items Option */}
        <div className="p-3 rounded-2xl bg-slate-800/60 border border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
              <Archive className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Include Deleted & Archived Items</span>
                {deletedEntries.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {deletedEntries.length} in vault archive
                  </span>
                )}
              </p>
              <p className="text-[11px] text-slate-400">
                Exports items that were deleted or zeroed out during the chosen period
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIncludeDeleted(!includeDeleted)}
            className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
              includeDeleted ? 'bg-indigo-600' : 'bg-slate-700'
            }`}
          >
            <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
              includeDeleted ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>

        {/* Summary Card */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900 border border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div className="p-2 rounded-xl bg-slate-800/50">
            <p className="text-[10px] text-slate-400">Transactions</p>
            <p className="text-sm font-extrabold text-white mt-0.5">{payload.summary.transactionsCount}</p>
          </div>
          <div className="p-2 rounded-xl bg-slate-800/50">
            <p className="text-[10px] text-slate-400">Total Income</p>
            <p className="text-sm font-extrabold text-emerald-400 mt-0.5">
              +{formatCurrency(payload.summary.totalIncome, currency)}
            </p>
          </div>
          <div className="p-2 rounded-xl bg-slate-800/50">
            <p className="text-[10px] text-slate-400">Total Expense</p>
            <p className="text-sm font-extrabold text-rose-400 mt-0.5">
              -{formatCurrency(payload.summary.totalExpense, currency)}
            </p>
          </div>
          <div className="p-2 rounded-xl bg-slate-800/50">
            <p className="text-[10px] text-slate-400">Bills & Goals</p>
            <p className="text-sm font-extrabold text-teal-300 mt-0.5">
              {payload.summary.billsCount + payload.summary.goalsCount}
            </p>
          </div>
        </div>

        {/* Action Buttons: JSON Backup & CSV Spreadsheet */}
        <div className="space-y-2 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* JSON Database Backup */}
            <button
              type="button"
              onClick={handleExportJson}
              disabled={isExportingJson}
              className="py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-teal-600 hover:from-indigo-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-indigo-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98"
            >
              {isExportingJson ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Preparing JSON...</span>
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  <span>Download JSON Backup</span>
                </>
              )}
            </button>

            {/* CSV Spreadsheet Export */}
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={isExportingCsv}
              className="py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98"
            >
              {isExportingCsv ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Preparing CSV...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Export CSV Spreadsheet</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Links: Cloud Snapshot & Restore from Backup */}
          <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
            <button
              type="button"
              onClick={handleTriggerCloudBackup}
              disabled={isCreatingCloudBackup}
              className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCreatingCloudBackup ? 'animate-spin' : ''}`} />
              <span>Take Cloud Snapshot Now</span>
            </button>

            {onOpenRestore && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenRestore();
                }}
                className="text-teal-400 hover:text-teal-300 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Restore from Backup →</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

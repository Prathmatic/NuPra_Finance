import React, { useState, useRef } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { 
  X, 
  Upload, 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  RefreshCw, 
  ShieldCheck, 
  Layers, 
  RotateCcw,
  Receipt,
  Target,
  TrendingUp,
  CreditCard
} from 'lucide-react';
import { 
  validateBackupFile, 
  BackupValidationResult, 
  BackupExportPayload 
} from '../../services/backupService';
import { formatDate } from '../../utils/formatters';

interface RestoreBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenExport?: () => void;
}

export const RestoreBackupModal: React.FC<RestoreBackupModalProps> = ({
  isOpen,
  onClose,
  onOpenExport,
}) => {
  const { restoreFromBackup, showToast, vault, currentUser } = useFinance();

  const [validation, setValidation] = useState<BackupValidationResult | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleProcessFile = (file: File) => {
    if (!file.name.endsWith('.json')) {
      showToast('Please select a valid NuPra JSON backup file (.json)', 'error');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const res = validateBackupFile(content);
      setValidation(res);
      if (!res.isValid) {
        showToast(res.error || 'Invalid backup file', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleProcessFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleProcessFile(file);
  };

  const handleConfirmRestore = async () => {
    if (!validation?.isValid || !validation.payload) {
      showToast('No valid backup file loaded', 'error');
      return;
    }

    setIsRestoring(true);
    try {
      await restoreFromBackup(validation.payload, restoreMode);
      onClose();
    } catch (err: any) {
      showToast(`Restore failed: ${err.message || 'Error'}`, 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  const resetSelection = () => {
    setValidation(null);
    setFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl glass-panel bg-slate-900/95 border border-white/15 rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto no-scrollbar space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-teal-500 to-indigo-600 text-white shadow-glow-indigo">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white">Restore from Backup</h2>
              <p className="text-xs text-slate-400">Restore your financial records into this couple vault</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isRestoring}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Safety Guarantee Callout */}
        <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-xs text-indigo-200 leading-relaxed">
            <p className="font-bold text-indigo-300">Automatic Pre-Restore Safety Snapshot</p>
            <p className="text-indigo-200/90 text-[11px] mt-0.5">
              Before applying any backup, NuPra automatically creates a safety snapshot of your current state in the cloud so you can never lose existing records.
            </p>
          </div>
        </div>

        {/* File Dropzone / Upload Area */}
        {!validation?.isValid ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-indigo-400 bg-indigo-950/40 scale-[1.01]'
                : 'border-white/20 hover:border-indigo-500/50 bg-slate-800/40 hover:bg-slate-800/70'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="mx-auto w-12 h-12 rounded-2xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center mb-3">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-white">
              Click to select or drag & drop backup JSON
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Supports .json files exported from NuPra Finance
            </p>
            {validation && !validation.isValid && (
              <div className="mt-3 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{validation.error}</span>
              </div>
            )}
          </div>
        ) : (
          /* File Preview Card */
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="p-4 rounded-2xl bg-slate-800/80 border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-xs font-bold text-white truncate max-w-xs">{fileName}</span>
                </div>
                <button
                  type="button"
                  onClick={resetSelection}
                  disabled={isRestoring}
                  className="text-xs text-slate-400 hover:text-rose-400 font-semibold cursor-pointer"
                >
                  Change File
                </button>
              </div>

              {/* Stats in backup */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 rounded-xl bg-slate-900/60 border border-white/5">
                  <div className="flex items-center justify-center gap-1 text-slate-400 text-[10px] mb-0.5">
                    <CreditCard className="w-3 h-3 text-emerald-400" />
                    <span>Transactions</span>
                  </div>
                  <span className="text-sm font-extrabold text-white">{validation.summary?.transactionsCount}</span>
                </div>

                <div className="p-2 rounded-xl bg-slate-900/60 border border-white/5">
                  <div className="flex items-center justify-center gap-1 text-slate-400 text-[10px] mb-0.5">
                    <Receipt className="w-3 h-3 text-sky-400" />
                    <span>Bills</span>
                  </div>
                  <span className="text-sm font-extrabold text-white">{validation.summary?.billsCount}</span>
                </div>

                <div className="p-2 rounded-xl bg-slate-900/60 border border-white/5">
                  <div className="flex items-center justify-center gap-1 text-slate-400 text-[10px] mb-0.5">
                    <Target className="w-3 h-3 text-amber-400" />
                    <span>Goals</span>
                  </div>
                  <span className="text-sm font-extrabold text-white">{validation.summary?.goalsCount}</span>
                </div>

                <div className="p-2 rounded-xl bg-slate-900/60 border border-white/5">
                  <div className="flex items-center justify-center gap-1 text-slate-400 text-[10px] mb-0.5">
                    <TrendingUp className="w-3 h-3 text-indigo-400" />
                    <span>Stocks</span>
                  </div>
                  <span className="text-sm font-extrabold text-white">{validation.summary?.stocksCount}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>Backup Date: {formatDate(validation.summary?.exportedAt || '')}</span>
                <span>Currency: {validation.summary?.currency}</span>
              </div>
            </div>

            {/* Restore Strategy Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Choose Restore Mode
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Merge Mode */}
                <button
                  type="button"
                  onClick={() => setRestoreMode('merge')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    restoreMode === 'merge'
                      ? 'bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500'
                      : 'bg-slate-800/40 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold text-white">Merge with Current Data</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Combines backup records with your current data. Keeps everything you currently have and adds missing items.
                  </p>
                </button>

                {/* Replace Mode */}
                <button
                  type="button"
                  onClick={() => setRestoreMode('replace')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    restoreMode === 'replace'
                      ? 'bg-amber-950/40 border-amber-500 ring-1 ring-amber-500'
                      : 'bg-slate-800/40 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <RotateCcw className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white">Full Replace</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Replaces current ledger with backup state. Existing state is preserved in cloud safety archive first.
                  </p>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isRestoring}
            className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-white/10 transition-all disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!validation?.isValid || isRestoring}
            onClick={handleConfirmRestore}
            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-teal-600 via-indigo-600 to-indigo-700 hover:from-teal-500 hover:to-indigo-600 text-white font-bold text-xs shadow-lg shadow-indigo-950/40 transition-all flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
          >
            {isRestoring ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Restoring Data...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Confirm & Restore ({restoreMode === 'merge' ? 'Merge' : 'Replace'})</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { 
  RotateCcw, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  Target, 
  Receipt, 
  Landmark, 
  PiggyBank, 
  TrendingUp, 
  CreditCard,
  RefreshCw
} from 'lucide-react';

interface ClearAmountsConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ClearAmountsConfirmModal: React.FC<ClearAmountsConfirmModalProps> = ({ isOpen, onClose }) => {
  const { clearAllAmountsToZero, currentUser, partner } = useFinance();
  const [isResetting, setIsResetting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsResetting(true);
    try {
      await clearAllAmountsToZero();
      onClose();
    } catch (err) {
      console.error('Failed to reset amounts:', err);
    } finally {
      setIsResetting(false);
    }
  };

  const myName = currentUser?.name || 'Me';
  const partnerName = partner?.name || 'Partner';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg glass-panel bg-slate-900/95 border border-white/15 rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 text-white shadow-glow-amber">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white">Start From Scratch</h2>
              <p className="text-xs text-slate-400">Reset all amounts to 0 for both partners</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isResetting}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning callout */}
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-200 leading-relaxed">
            <p className="font-bold text-amber-300">Ready to start fresh?</p>
            <p className="mt-0.5 text-amber-200/90">
              This will set all financial amounts across the app to <strong>0</strong> for both <strong>{myName}</strong> and <strong>{partnerName}</strong> so you can fill everything up from scratch.
            </p>
          </div>
        </div>

        {/* What will be reset breakdown */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider px-1">
            What will be set to 0:
          </h4>
          <div className="grid grid-cols-1 gap-2 text-xs">
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-800/60 border border-white/5">
              <Target className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="font-semibold text-white">Goals: </span>
                <span className="text-slate-400">Target amounts & savings set to 0, contributions emptied</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-800/60 border border-white/5">
              <Receipt className="w-4 h-4 text-sky-400 shrink-0" />
              <div>
                <span className="font-semibold text-white">Bills: </span>
                <span className="text-slate-400">All bill amounts set to 0 and marked unpaid</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-800/60 border border-white/5">
              <Landmark className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="font-semibold text-white">Bank Accounts: </span>
                <span className="text-slate-400">Initial balances set to 0 for both {myName} and {partnerName}</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-800/60 border border-white/5">
              <PiggyBank className="w-4 h-4 text-pink-400 shrink-0" />
              <div>
                <span className="font-semibold text-white">Monthly Budgets: </span>
                <span className="text-slate-400">Joint couple limit and personal spending limits set to 0</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-800/60 border border-white/5">
              <TrendingUp className="w-4 h-4 text-indigo-400 shrink-0" />
              <div>
                <span className="font-semibold text-white">Stocks & Investments: </span>
                <span className="text-slate-400">Invested amounts and shares set to 0</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-800/60 border border-white/5">
              <CreditCard className="w-4 h-4 text-rose-400 shrink-0" />
              <div>
                <span className="font-semibold text-white">Transactions: </span>
                <span className="text-slate-400">Ledger cleared so spending and income start from 0</span>
              </div>
            </div>
          </div>
        </div>

        {/* What is preserved */}
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2.5 text-xs text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Your custom categories, account profiles, and partner vault connection remain intact.</span>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isResetting}
            className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-white/10 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isResetting}
            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 via-rose-600 to-pink-600 hover:from-amber-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-rose-950/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isResetting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Resetting...</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4" />
                <span>Yes, Reset All to 0</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

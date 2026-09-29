import React, { useState, useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { X, Sparkles, PlusCircle, Wallet, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { FinanceGoal } from '../../types/finance';
import { formatCurrency, getCurrencySymbol } from '../../utils/formatters';

interface ContributeModalProps {
  goal: FinanceGoal | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ContributeModal: React.FC<ContributeModalProps> = ({ goal, isOpen, onClose }) => {
  const { contributeToGoal, currency, currentUser, partner, transactions } = useFinance();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  // Calculate my net savings (income - expenses) from all transactions for current user
  const mySavings = useMemo(() => {
    if (!currentUser) return 0;
    let income = 0;
    let expenses = 0;
    transactions.forEach(tx => {
      if (tx.userId !== currentUser.id) return;
      if (tx.type === 'income') income += tx.amount;
      else if (tx.type === 'expense') expenses += tx.amount;
    });
    return Math.max(0, income - expenses);
  }, [transactions, currentUser]);

  // Calculate how much I've already contributed to all goals (total locked-in savings)
  const myTotalGoalContributions = useMemo(() => {
    if (!currentUser) return 0;
    // We look at transactions with title starting "Goal Savings:" for current user
    return transactions
      .filter(tx => tx.userId === currentUser.id && tx.title?.startsWith('Goal Savings:') && tx.type === 'expense')
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [transactions, currentUser]);

  // Available savings = net balance minus already-committed goal contributions
  // But simpler: just net balance (goal contributions are already counted as expenses in transactions)
  const availableSavings = mySavings;

  if (!isOpen || !goal) return null;

  // Determine if this goal belongs to someone else (partner-only goal)
  const isPartnerOnlyGoal =
    !goal.isShared &&
    goal.assignedUserId &&
    currentUser &&
    goal.assignedUserId !== currentUser.id;

  // If this is a partner-only goal, current user cannot contribute
  if (isPartnerOnlyGoal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="relative w-full max-w-md glass-panel bg-slate-900 border border-white/15 rounded-3xl p-6 shadow-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <h2 className="text-base font-bold text-white">Cannot Deposit</h2>
              <p className="text-xs text-rose-400 font-medium truncate max-w-[260px]">{goal.title}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-white">This is {partner?.name || 'your partner'}'s personal goal</p>
              <p className="text-xs text-slate-400 mt-1">Only {goal.assignedUserName || 'the assigned person'} can deposit savings into this goal. You can comment or flag it for discussion.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="mt-4 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-all"
          >
            Got it
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) return;

    // Enforce savings cap
    if (parsed > availableSavings) return;

    contributeToGoal(goal.id, parsed, note.trim() || undefined);

    // If goal reaches or passes 100%, fire glorious confetti!
    if (goal.currentAmount + parsed >= goal.targetAmount) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#e11d48', '#f43f5e', '#6366f1', '#10b981', '#fbbf24'],
      });
    }

    setAmount('');
    setNote('');
    onClose();
  };

  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
  const currencySymbol = getCurrencySymbol(currency);
  const parsedAmount = parseFloat(amount) || 0;
  const exceedsSavings = parsedAmount > availableSavings;
  const exceedsRemaining = parsedAmount > remaining;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md glass-panel bg-slate-900 border border-white/15 rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h2 className="text-base font-bold text-white">Deposit to Goal</h2>
            <p className="text-xs text-rose-400 font-medium truncate max-w-[260px]">{goal.title}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stats row */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="p-3 rounded-2xl bg-slate-800/70 border border-white/5">
            <p className="text-[11px] text-slate-400">Remaining to Goal:</p>
            <p className="text-sm font-bold text-amber-400">{formatCurrency(remaining, currency)}</p>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center gap-1 mb-0.5">
              <Wallet className="w-3 h-3 text-emerald-400" />
              <p className="text-[11px] text-emerald-300">Your Savings:</p>
            </div>
            <p className="text-sm font-bold text-emerald-400">{formatCurrency(availableSavings, currency)}</p>
          </div>
        </div>

        {availableSavings === 0 && (
          <div className="mt-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300">You have no savings available. Add income transactions to build up your savings balance first.</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Contribution Amount ({currencySymbol})
              <span className="ml-1 text-slate-500 font-normal">— max {formatCurrency(availableSavings, currency)}</span>
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-base font-bold text-slate-400">{currencySymbol}</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="5000"
                required
                min="1"
                max={availableSavings}
                autoFocus
                className={`w-full pl-9 pr-3.5 py-3 rounded-xl bg-slate-800 border text-white text-lg font-bold focus:outline-none transition-colors ${
                  exceedsSavings
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-white/10 focus:border-rose-500'
                }`}
              />
            </div>
            {exceedsSavings && (
              <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Amount exceeds your available savings ({formatCurrency(availableSavings, currency)})
              </p>
            )}
            {!exceedsSavings && exceedsRemaining && parsedAmount > 0 && (
              <p className="mt-1 text-xs text-amber-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                This will fully complete the goal! 🎉
              </p>
            )}
            {/* Quick fill buttons */}
            {availableSavings > 0 && (
              <div className="mt-2 flex gap-2">
                {[0.25, 0.5, 1].map(frac => {
                  const v = Math.min(Math.floor(availableSavings * frac), remaining);
                  if (v <= 0) return null;
                  return (
                    <button
                      key={frac}
                      type="button"
                      onClick={() => setAmount(String(v))}
                      className="flex-1 py-1 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-[10px] text-slate-300 font-semibold transition-all border border-white/5"
                    >
                      {frac === 1 ? 'Max' : `${Math.round(frac * 100)}%`}
                      <span className="block text-[9px] text-slate-500">{formatCurrency(v, currency)}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Note (Optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. September savings allocation"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-rose-500"
            />
          </div>

          <button
            type="submit"
            disabled={exceedsSavings || availableSavings === 0 || parsedAmount <= 0}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Deposit Savings</span>
          </button>
        </form>
      </div>
    </div>
  );
};

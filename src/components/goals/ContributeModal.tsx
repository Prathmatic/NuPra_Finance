import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { X, Sparkles, PlusCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { FinanceGoal } from '../../types/finance';
import { formatCurrency, getCurrencySymbol } from '../../utils/formatters';

interface ContributeModalProps {
  goal: FinanceGoal | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ContributeModal: React.FC<ContributeModalProps> = ({ goal, isOpen, onClose }) => {
  const { contributeToGoal, currency, currentUser } = useFinance();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  if (!isOpen || !goal) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) return;

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

        {/* Current status info */}
        <div className="mt-4 p-3 rounded-2xl bg-slate-800/70 border border-white/5 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-400">Remaining to Goal:</p>
            <p className="text-sm font-bold text-amber-400">{formatCurrency(remaining, currency)}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-slate-400">Contributor:</p>
            <p className="text-xs font-semibold text-white">{currentUser!.name}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Contribution Amount ({currencySymbol})
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-base font-bold text-slate-400">
                {currencySymbol}
              </span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="5000"
                required
                autoFocus
                className="w-full pl-9 pr-3.5 py-3 rounded-xl bg-slate-800 border border-white/10 text-white text-lg font-bold focus:outline-none focus:border-rose-500"
              />
            </div>
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
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Deposit Savings</span>
          </button>
        </form>
      </div>
    </div>
  );
};

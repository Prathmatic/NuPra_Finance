import React, { useState, useEffect } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { X, Check, PiggyBank, User, Users, Lock, ShieldCheck } from 'lucide-react';
import { getCurrencySymbol } from '../../utils/formatters';

interface BudgetSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BudgetSettingsModal: React.FC<BudgetSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { budgets, updateBudgets, currentUser, partner, currency, vault } = useFinance();

  // Accurately resolve currentUser's individual budget and partner's individual budget by unique userId
  const myCurrentBudget = (currentUser?.id && budgets.userBudgets?.[currentUser.id]) 
    ?? (currentUser?.id === vault?.partner1?.id ? budgets.me : budgets.partner)
    ?? budgets.me 
    ?? 0;

  const partnerCurrentBudget = (partner?.id && budgets.userBudgets?.[partner.id])
    ?? (partner?.id === vault?.partner2?.id ? budgets.partner : budgets.me)
    ?? budgets.partner 
    ?? 0;

  const [coupleBudget, setCoupleBudget] = useState('0');
  const [myBudget, setMyBudget] = useState('0');

  useEffect(() => {
    if (isOpen) {
      setCoupleBudget((budgets.couple || 0).toString());
      setMyBudget((myCurrentBudget || 0).toString());
    }
  }, [isOpen, budgets.couple, myCurrentBudget]);

  if (!isOpen || !currentUser) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cVal = Math.max(0, parseFloat(coupleBudget) || 0);
    const mVal = Math.max(0, parseFloat(myBudget) || 0);

    updateBudgets({
      couple: cVal,
      myBudget: mVal,
    });

    onClose();
  };

  const currencySymbol = getCurrencySymbol(currency);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md glass-panel bg-slate-900 border border-white/15 rounded-3xl p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <PiggyBank className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Monthly Budget Limits</h2>
              <p className="text-[11px] text-slate-400">Joint budget & isolated personal limits (0 = unlimited)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Couple Joint Monthly Budget (Both partners can set/modify) */}
          <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-indigo-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                <label className="text-xs font-bold text-white">
                  Couple Joint Monthly Budget
                </label>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Shared Joint
              </span>
            </div>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-sm font-bold text-slate-400">
                {currencySymbol}
              </span>
              <input
                type="number"
                step="any"
                min="0"
                value={coupleBudget}
                onChange={(e) => setCoupleBudget(e.target.value)}
                placeholder="0"
                className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white font-bold text-sm focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600"
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Combined spending limit for both partners per month. Either partner can set or adjust this.
            </p>
          </div>

          {/* My Individual Monthly Budget (Only currentUser can modify) */}
          <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-emerald-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <label className="text-xs font-bold text-white">
                  {currentUser.name}'s Individual Budget (Me)
                </label>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Only You Can Edit
              </span>
            </div>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-sm font-bold text-slate-400">
                {currencySymbol}
              </span>
              <input
                type="number"
                step="any"
                min="0"
                value={myBudget}
                onChange={(e) => setMyBudget(e.target.value)}
                placeholder="0"
                className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white font-bold text-sm focus:outline-none focus:border-emerald-500 transition-all placeholder:text-slate-600"
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Your personal spending limit. Your partner cannot modify this value.
            </p>
          </div>

          {/* Partner's Individual Monthly Budget (Strictly Read-only) */}
          {partner && (
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/5 space-y-2 opacity-80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-purple-400" />
                  <label className="text-xs font-bold text-slate-300">
                    {partner.name}'s Individual Budget
                  </label>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-white/10 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-400" /> Set by {partner.name}
                </span>
              </div>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-sm font-bold text-slate-500">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  disabled
                  value={partnerCurrentBudget}
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-slate-950/60 border border-white/5 text-slate-400 font-bold text-sm cursor-not-allowed"
                />
              </div>
              <p className="text-[10px] text-slate-500">
                Only {partner.name} can configure their personal monthly budget. You cannot modify it.
              </p>
            </div>
          )}

          {/* Save Button */}
          <button
            type="submit"
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:opacity-90 active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 mt-2"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>Save Monthly Budgets</span>
          </button>
        </form>
      </div>
    </div>
  );
};

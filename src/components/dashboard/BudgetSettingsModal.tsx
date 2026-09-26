import React, { useState, useEffect } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { X, Check, PiggyBank, User, Users } from 'lucide-react';
import { getCurrencySymbol } from '../../utils/formatters';

interface BudgetSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BudgetSettingsModal: React.FC<BudgetSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { budgets, updateBudgets, currentUser, partner, currency } = useFinance();

  const [coupleBudget, setCoupleBudget] = useState('0');
  const [myBudget, setMyBudget] = useState('0');
  const [partnerBudget, setPartnerBudget] = useState('0');

  useEffect(() => {
    if (isOpen) {
      setCoupleBudget((budgets.couple || 0).toString());
      setMyBudget((budgets.me || 0).toString());
      setPartnerBudget((budgets.partner || 0).toString());
    }
  }, [isOpen, budgets]);

  if (!isOpen || !currentUser) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cVal = Math.max(0, parseFloat(coupleBudget) || 0);
    const mVal = Math.max(0, parseFloat(myBudget) || 0);
    const pVal = Math.max(0, parseFloat(partnerBudget) || 0);

    updateBudgets({
      couple: cVal,
      me: mVal,
      partner: pVal,
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
              <p className="text-[11px] text-slate-400">Set joint and individual spending caps (0 = unlimited)</p>
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
          {/* Couple Joint Monthly Budget */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <label className="text-xs font-bold text-white">
                Couple Joint Monthly Budget
              </label>
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
                className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-slate-800/80 border border-white/15 text-white font-bold text-sm focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Combined spending limit for both partners per month.
            </p>
          </div>

          {/* My Individual Monthly Budget */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <label className="text-xs font-bold text-white">
                {currentUser.name}'s Individual Budget (Me)
              </label>
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
                className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-slate-800/80 border border-white/15 text-white font-bold text-sm focus:outline-none focus:border-emerald-500 transition-all placeholder:text-slate-600"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Personal spending limit for your own expenses.
            </p>
          </div>

          {/* Partner's Individual Monthly Budget */}
          {partner && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <User className="w-3.5 h-3.5 text-purple-400" />
                <label className="text-xs font-bold text-white">
                  {partner.name}'s Individual Budget (Partner)
                </label>
              </div>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-sm font-bold text-slate-400">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={partnerBudget}
                  onChange={(e) => setPartnerBudget(e.target.value)}
                  placeholder="0"
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-slate-800/80 border border-white/15 text-white font-bold text-sm focus:outline-none focus:border-purple-500 transition-all placeholder:text-slate-600"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Personal spending limit for your partner.
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

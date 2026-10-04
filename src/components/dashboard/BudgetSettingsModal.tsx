import React, { useState, useEffect, useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { 
  X, 
  Check, 
  PiggyBank, 
  User, 
  Users, 
  Lock, 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  RotateCcw 
} from 'lucide-react';
import { getCurrencySymbol } from '../../utils/formatters';

interface BudgetSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMonth?: string;
}

export const BudgetSettingsModal: React.FC<BudgetSettingsModalProps> = ({
  isOpen,
  onClose,
  initialMonth,
}) => {
  const { 
    budgets, 
    updateBudgets, 
    getBudgetForMonth, 
    currentUser, 
    partner, 
    currency, 
    selectedMonth,
    convertInputToBase,
    convertToDisplay,
    exchangeRate,
  } = useFinance();

  const [monthKey, setMonthKey] = useState<string>(() => initialMonth || selectedMonth || new Date().toISOString().slice(0, 7));
  const [coupleBudget, setCoupleBudget] = useState('0');
  const [myBudget, setMyBudget] = useState('0');
  const [setAsDefault, setSetAsDefault] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const activeMonth = initialMonth || selectedMonth || new Date().toISOString().slice(0, 7);
      setMonthKey(activeMonth);
    }
  }, [isOpen, initialMonth, selectedMonth]);

  // Load budgets whenever monthKey or budgets change
  const currentMonthBudget = useMemo(() => {
    return getBudgetForMonth(monthKey);
  }, [getBudgetForMonth, monthKey, budgets]);

  useEffect(() => {
    if (isOpen) {
      const displayCouple = convertToDisplay(currentMonthBudget.coupleLimit || 0);
      const displayMy = convertToDisplay(currentMonthBudget.myLimit || 0);
      setCoupleBudget(displayCouple.toString());
      setMyBudget(displayMy.toString());
    }
  }, [isOpen, currentMonthBudget, convertToDisplay]);

  if (!isOpen || !currentUser) return null;

  const handlePrevMonth = () => {
    const [y, m] = monthKey.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    setMonthKey(prevKey);
  };

  const handleNextMonth = () => {
    const [y, m] = monthKey.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    const nextKey = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
    setMonthKey(nextKey);
  };

  const formattedMonthName = (() => {
    const [y, m] = monthKey.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  })();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cValInput = Math.max(0, parseFloat(coupleBudget) || 0);
    const mValInput = Math.max(0, parseFloat(myBudget) || 0);

    // Convert input limits to base EUR
    const cVal = convertInputToBase(cValInput);
    const mVal = convertInputToBase(mValInput);

    updateBudgets({
      couple: cVal,
      myBudget: mVal,
      month: monthKey,
      isDefault: setAsDefault,
    });

    onClose();
  };

  const handleResetToDefault = () => {
    const defaultCouple = budgets.couple || 0;
    const defaultMy = (currentUser.id ? budgets.userBudgets?.[currentUser.id] : undefined) ?? budgets.me ?? 0;
    setCoupleBudget(convertToDisplay(defaultCouple).toString());
    setMyBudget(convertToDisplay(defaultMy).toString());
  };

  const currencySymbol = getCurrencySymbol(currency);
  const partnerLimit = convertToDisplay(currentMonthBudget.partnerLimit || 0);

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
              <p className="text-[11px] text-slate-400">Month-by-month limits & joint targets (0 = unlimited)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Month Selector Bar */}
        <div className="mt-4 p-3 rounded-2xl bg-slate-950/80 border border-white/10 flex items-center justify-between">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>{formattedMonthName}</span>
            </div>
            <span className={`text-[10px] font-semibold mt-0.5 px-2 py-0.2 rounded-full ${
              currentMonthBudget.isCustomMonth 
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400'
            }`}>
              {currentMonthBudget.isCustomMonth ? 'Custom Month Limit' : 'Inheriting Default Limit'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Couple Joint Monthly Budget (Both partners can set/modify) */}
          <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-indigo-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                <label className="text-xs font-bold text-white">
                  Couple Joint Budget ({formattedMonthName})
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
            {currency === 'INR' && parseFloat(coupleBudget) > 0 && (
              <p className="text-[10px] text-teal-300">
                ≈ €{Math.round(parseFloat(coupleBudget) / exchangeRate)} EUR base limit
              </p>
            )}
            <p className="text-[10px] text-slate-400">
              Combined spending limit for both partners in {formattedMonthName}. Either partner can adjust this.
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
            {currency === 'INR' && parseFloat(myBudget) > 0 && (
              <p className="text-[10px] text-teal-300">
                ≈ €{Math.round(parseFloat(myBudget) / exchangeRate)} EUR base limit
              </p>
            )}
            <p className="text-[10px] text-slate-400">
              Your personal spending limit for {formattedMonthName}.
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
                  value={partnerLimit}
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-slate-950/60 border border-white/5 text-slate-400 font-bold text-sm cursor-not-allowed"
                />
              </div>
              <p className="text-[10px] text-slate-500">
                Only {partner.name} can configure their personal limit for {formattedMonthName}.
              </p>
            </div>
          )}

          {/* Optional: Reset to Default and Set as Default Toggle */}
          <div className="flex flex-col gap-2 pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={setAsDefault}
                onChange={(e) => setSetAsDefault(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-0 bg-slate-900 border-white/20"
              />
              <span>Also save these limits as the default for all future months</span>
            </label>

            {currentMonthBudget.isCustomMonth && (
              <button
                type="button"
                onClick={handleResetToDefault}
                className="text-[11px] text-amber-400/90 hover:text-amber-300 flex items-center gap-1 self-start pt-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset inputs to default budget values</span>
              </button>
            )}
          </div>

          {/* Save Button */}
          <button
            type="submit"
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:opacity-90 active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 mt-2"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>Save Budget for {formattedMonthName}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

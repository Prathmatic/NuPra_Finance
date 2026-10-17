import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Legend, 
  CartesianGrid, 
  Cell, 
  ReferenceLine 
} from 'recharts';
import { 
  PiggyBank, 
  Users, 
  User, 
  TrendingDown, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Edit3 
} from 'lucide-react';
import { Transaction, Category, CurrencyCode, UserProfile, BudgetsConfig } from '../../types/finance';
import { formatCurrency, getCurrencySymbol } from '../../utils/formatters';
import { CategoryIcon } from '../common/CategoryIcon';
import { useFinance } from '../../context/FinanceContext';

interface BudgetLimitStatsCardProps {
  transactions: Transaction[];
  categories: Category[];
  budgets: BudgetsConfig;
  getBudgetForMonth: (monthKey: string) => { coupleLimit: number; myLimit: number; partnerLimit: number; isCustomMonth: boolean };
  currency: CurrencyCode;
  currentUser: UserProfile | null;
  partner?: UserProfile | null;
  onOpenBudgetModal?: (monthKey?: string) => void;
}

export type BudgetPlotMode = 'combined' | 'individual' | 'variance';

export const BudgetLimitStatsCard: React.FC<BudgetLimitStatsCardProps> = ({
  transactions,
  categories,
  budgets,
  getBudgetForMonth,
  currency,
  currentUser,
  partner,
  onOpenBudgetModal,
}) => {
  const { exchangeRate } = useFinance();
  const [plotMode, setPlotMode] = useState<BudgetPlotMode>('combined');
  const currentMonthKey = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);

  const currencySymbol = getCurrencySymbol(currency);
  const myDisplayName = currentUser?.name || 'You';
  const partnerDisplayName = partner?.name || 'Partner';

  // 1. Gather all unique months chronologically from transactions, budget history, and current month
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    monthSet.add(currentMonthKey);

    transactions.forEach(t => {
      if (t.date && t.date.length >= 7) {
        monthSet.add(t.date.slice(0, 7));
      }
    });

    if (budgets.monthlyBudgets) {
      Object.keys(budgets.monthlyBudgets).forEach(m => monthSet.add(m));
    }

    return Array.from(monthSet).sort((a, b) => a.localeCompare(b));
  }, [transactions, budgets, currentMonthKey]);

  // Ensure selectedMonth is within available months
  useEffect(() => {
    if (!availableMonths.includes(selectedMonth) && availableMonths.length > 0) {
      setSelectedMonth(availableMonths[availableMonths.length - 1]);
    }
  }, [availableMonths, selectedMonth]);

  // 2. Compute monthly budget vs spending data for the chart
  const monthlyPlotData = useMemo(() => {
    const myId = currentUser?.id;
    const partnerId = partner?.id;

    return availableMonths.map(month => {
      const [y, m] = month.split('-').map(Number);
      const label = new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short' });
      const fullName = new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      // Fetch budget for this month
      const { coupleLimit, myLimit, partnerLimit, isCustomMonth } = getBudgetForMonth(month);

      // Aggregate expenses for this month
      let mySpent = 0;
      let partnerSpent = 0;

      transactions.filter(t => t.type === 'expense' && t.date.startsWith(month)).forEach(t => {
        if (t.userId === myId) {
          mySpent += t.amount;
        } else if (partnerId && t.userId === partnerId) {
          partnerSpent += t.amount;
        } else {
          // Unassigned fallback
          if (t.userId === myId) mySpent += t.amount;
          else partnerSpent += t.amount;
        }
      });

      const coupleSpent = mySpent + partnerSpent;

      // Variances: positive = Saved, negative = Exceeded
      const coupleDiff = coupleLimit > 0 ? coupleLimit - coupleSpent : 0;
      const myDiff = myLimit > 0 ? myLimit - mySpent : 0;
      const partnerDiff = partnerLimit > 0 ? partnerLimit - partnerSpent : 0;

      const isCoupleOver = coupleLimit > 0 && coupleSpent > coupleLimit;
      const isMyOver = myLimit > 0 && mySpent > myLimit;
      const isPartnerOver = partnerLimit > 0 && partnerSpent > partnerLimit;

      return {
        monthKey: month,
        label,
        fullName,
        isCustomMonth,
        // Combined
        coupleLimit,
        coupleSpent,
        coupleDiff,
        isCoupleOver,
        coupleOverAmt: Math.max(0, coupleSpent - coupleLimit),
        coupleSavedAmt: Math.max(0, coupleLimit - coupleSpent),
        couplePct: coupleLimit > 0 ? Math.round((coupleSpent / coupleLimit) * 100) : 0,
        // Individual You
        myLimit,
        mySpent,
        myDiff,
        isMyOver,
        myOverAmt: Math.max(0, mySpent - myLimit),
        mySavedAmt: Math.max(0, myLimit - mySpent),
        myPct: myLimit > 0 ? Math.round((mySpent / myLimit) * 100) : 0,
        // Individual Partner
        partnerLimit,
        partnerSpent,
        partnerDiff,
        isPartnerOver,
        partnerOverAmt: Math.max(0, partnerSpent - partnerLimit),
        partnerSavedAmt: Math.max(0, partnerLimit - partnerSpent),
        partnerPct: partnerLimit > 0 ? Math.round((partnerSpent / partnerLimit) * 100) : 0,
      };
    });
  }, [availableMonths, currentUser, partner, transactions, getBudgetForMonth]);

  // 3. Selected Month Diagnostic Data (Who & Where)
  const selectedMonthData = useMemo(() => {
    return monthlyPlotData.find(d => d.monthKey === selectedMonth) || monthlyPlotData[monthlyPlotData.length - 1];
  }, [monthlyPlotData, selectedMonth]);

  // Where: Category spending breakdown for the selected month
  const selectedMonthCategories = useMemo(() => {
    if (!selectedMonth) return [];
    const catMap: Record<string, {
      id: string;
      name: string;
      icon: string;
      color: string;
      mySpent: number;
      partnerSpent: number;
      totalSpent: number;
      txCount: number;
    }> = {};

    const myId = currentUser?.id;
    const partnerId = partner?.id;

    transactions
      .filter(t => t.type === 'expense' && t.date.startsWith(selectedMonth))
      .forEach(t => {
        const catName = t.categoryName || 'Other';
        if (!catMap[catName]) {
          const matched = categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
          catMap[catName] = {
            id: t.categoryId || catName,
            name: catName,
            icon: t.categoryIcon || matched?.icon || 'Tag',
            color: t.categoryColor || matched?.color || '#f43f5e',
            mySpent: 0,
            partnerSpent: 0,
            totalSpent: 0,
            txCount: 0,
          };
        }

        const item = catMap[catName];
        item.totalSpent += t.amount;
        item.txCount += 1;

        if (t.userId === myId) item.mySpent += t.amount;
        else if (partnerId && t.userId === partnerId) item.partnerSpent += t.amount;
        else {
          if (t.userId === myId) item.mySpent += t.amount;
          else item.partnerSpent += t.amount;
        }
      });

    return Object.values(catMap).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [selectedMonth, transactions, currentUser, partner, categories]);

  // Navigation handlers
  const handlePrevMonth = () => {
    const idx = availableMonths.indexOf(selectedMonth);
    if (idx > 0) setSelectedMonth(availableMonths[idx - 1]);
  };

  const handleNextMonth = () => {
    const idx = availableMonths.indexOf(selectedMonth);
    if (idx >= 0 && idx < availableMonths.length - 1) setSelectedMonth(availableMonths[idx + 1]);
  };

  const selectedIdx = availableMonths.indexOf(selectedMonth);
  const canGoPrev = selectedIdx > 0;
  const canGoNext = selectedIdx >= 0 && selectedIdx < availableMonths.length - 1;

  return (
    <div className="glass-card p-5 rounded-3xl border border-white/10 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/20 shadow-sm">
            <PiggyBank className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Monthly Budget Limit vs Actual Spend
              </h3>
              <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Tracking
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Individual & Combined Limits · Overspend & Savings Diagnostics
            </p>
          </div>
        </div>

        {/* View Mode Selector */}
        <div className="flex bg-slate-900/90 p-1 rounded-2xl border border-white/10 text-xs font-semibold self-start sm:self-auto">
          <button
            onClick={() => setPlotMode('combined')}
            className={`px-2.5 py-1 rounded-xl transition-all ${
              plotMode === 'combined'
                ? 'bg-gradient-to-r from-amber-600 to-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Combined Joint
          </button>
          <button
            onClick={() => setPlotMode('individual')}
            className={`px-2.5 py-1 rounded-xl transition-all ${
              plotMode === 'individual'
                ? 'bg-gradient-to-r from-amber-600 to-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Individual (Me vs Partner)
          </button>
          <button
            onClick={() => setPlotMode('variance')}
            className={`px-2.5 py-1 rounded-xl transition-all ${
              plotMode === 'variance'
                ? 'bg-gradient-to-r from-amber-600 to-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Saved / Exceeded
          </button>
        </div>
      </div>

      {/* Main Recharts Plot */}
      <div className="h-64 sm:h-72 w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={monthlyPlotData} 
            margin={{ top: 12, right: 10, left: -20, bottom: 5 }}
            onClick={(e: any) => {
              if (e && e.activePayload && e.activePayload[0]) {
                const clickedKey = e.activePayload[0].payload?.monthKey;
                if (clickedKey) setSelectedMonth(clickedKey);
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.35} vertical={false} />
            <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} />
            <YAxis 
              stroke="#94a3b8" 
              fontSize={10} 
              tickLine={false} 
              tickFormatter={(v) => {
                const scaled = currency === 'INR' ? Math.round(v * exchangeRate) : v;
                return `${currencySymbol}${scaled >= 1000 ? `${(scaled / 1000).toFixed(0)}k` : scaled}`;
              }} 
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#0f172a', 
                borderColor: '#334155', 
                borderRadius: '16px', 
                color: '#fff', 
                fontSize: '12px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' 
              }}
              formatter={(val: any, name: any) => [formatCurrency(Number(val), currency), name]}
              labelFormatter={(label: any, payload: any) => {
                if (payload && payload[0]) return payload[0].payload.fullName;
                return label;
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />

            {/* COMBINED MODE */}
            {plotMode === 'combined' && (
              <>
                <Bar 
                  dataKey="coupleLimit" 
                  name="Couple Joint Budget Limit" 
                  fill="#6366f1" 
                  radius={[5, 5, 0, 0]} 
                  opacity={0.4}
                  maxBarSize={32}
                />
                <Bar 
                  dataKey="coupleSpent" 
                  name="Actual Couple Spent" 
                  radius={[5, 5, 0, 0]} 
                  maxBarSize={32}
                >
                  {monthlyPlotData.map((entry, index) => (
                    <Cell 
                      key={`couple-cell-${index}`} 
                      fill={entry.coupleLimit > 0 && entry.isCoupleOver ? '#f43f5e' : '#10b981'} 
                    />
                  ))}
                </Bar>
              </>
            )}

            {/* INDIVIDUAL MODE */}
            {plotMode === 'individual' && (
              <>
                <Bar 
                  dataKey="mySpent" 
                  name={`${myDisplayName} Spent`} 
                  fill="#fb7185" 
                  radius={[5, 5, 0, 0]} 
                  maxBarSize={22}
                />
                <Bar 
                  dataKey="myLimit" 
                  name={`${myDisplayName} Budget`} 
                  fill="#fb7185" 
                  radius={[5, 5, 0, 0]} 
                  opacity={0.35}
                  maxBarSize={22}
                />
                <Bar 
                  dataKey="partnerSpent" 
                  name={`${partnerDisplayName} Spent`} 
                  fill="#818cf8" 
                  radius={[5, 5, 0, 0]} 
                  maxBarSize={22}
                />
                <Bar 
                  dataKey="partnerLimit" 
                  name={`${partnerDisplayName} Budget`} 
                  fill="#818cf8" 
                  radius={[5, 5, 0, 0]} 
                  opacity={0.35}
                  maxBarSize={22}
                />
              </>
            )}

            {/* VARIANCE / DELTA MODE */}
            {plotMode === 'variance' && (
              <>
                <ReferenceLine y={0} stroke="#64748b" strokeWidth={1.5} />
                <Bar 
                  dataKey="coupleDiff" 
                  name="Net Saved (+) / Exceeded (-)" 
                  radius={[4, 4, 4, 4]} 
                  maxBarSize={32}
                >
                  {monthlyPlotData.map((entry, index) => (
                    <Cell 
                      key={`var-cell-${index}`} 
                      fill={entry.coupleDiff >= 0 ? '#10b981' : '#f43f5e'} 
                    />
                  ))}
                </Bar>
              </>
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* DIAGNOSTIC PANEL: WHO & WHERE EXCEEDED OR SAVED */}
      {selectedMonthData && (
        <div className="pt-3 border-t border-white/10 space-y-4">
          {/* Month Selector for Diagnostics */}
          <div className="flex items-center justify-between bg-slate-950/70 p-2.5 rounded-2xl border border-white/5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                disabled={!canGoPrev}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 transition-colors"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5 text-xs font-bold text-white px-1">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>{selectedMonthData.fullName} Diagnostics</span>
                {selectedMonthData.isCustomMonth && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Custom Limit
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                disabled={!canGoNext}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 transition-colors"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {onOpenBudgetModal && (
              <button
                type="button"
                onClick={() => onOpenBudgetModal(selectedMonthData.monthKey)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-[11px] font-semibold text-slate-300 hover:text-white transition-colors"
              >
                <Edit3 className="w-3 h-3 text-amber-400" />
                <span>Adjust Limits</span>
              </button>
            )}
          </div>

          {/* SECTION A: WHO EXCEEDED OR SAVED (3 Status Cards) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-300">Who Exceeded or Saved in {selectedMonthData.label}?</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* YOU (ME) CARD */}
              <div className={`p-3.5 rounded-2xl border ${
                selectedMonthData.myLimit === 0
                  ? 'bg-slate-900/60 border-white/5'
                  : selectedMonthData.isMyOver
                    ? 'bg-rose-950/20 border-rose-500/30'
                    : 'bg-emerald-950/20 border-emerald-500/30'
              } space-y-2`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-rose-400" />
                    <span className="text-xs font-bold text-white">{myDisplayName} (You)</span>
                  </div>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    selectedMonthData.myLimit === 0
                      ? 'bg-slate-800 text-slate-400'
                      : selectedMonthData.isMyOver
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {selectedMonthData.myLimit === 0 ? (
                      'No Limit Set'
                    ) : selectedMonthData.isMyOver ? (
                      <>
                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                        Exceeded +{formatCurrency(selectedMonthData.myOverAmt, currency)}
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Saved {formatCurrency(selectedMonthData.mySavedAmt, currency)}
                      </>
                    )}
                  </span>
                </div>

                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">Spent:</span>
                  <span className="font-extrabold text-white">
                    {formatCurrency(selectedMonthData.mySpent, currency)} 
                    {selectedMonthData.myLimit > 0 && (
                      <span className="font-normal text-slate-400 text-[10px]"> / {formatCurrency(selectedMonthData.myLimit, currency)}</span>
                    )}
                  </span>
                </div>

                {selectedMonthData.myLimit > 0 && (
                  <div className="space-y-1">
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div 
                        style={{ width: `${Math.min(100, selectedMonthData.myPct)}%` }}
                        className={`h-full transition-all duration-300 ${
                          selectedMonthData.isMyOver ? 'bg-rose-500' : 'bg-emerald-500'
                        }`}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>{selectedMonthData.myPct}% used</span>
                      <span>{selectedMonthData.isMyOver ? `${selectedMonthData.myPct - 100}% over limit` : `${100 - selectedMonthData.myPct}% remaining`}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* PARTNER CARD */}
              <div className={`p-3.5 rounded-2xl border ${
                selectedMonthData.partnerLimit === 0
                  ? 'bg-slate-900/60 border-white/5'
                  : selectedMonthData.isPartnerOver
                    ? 'bg-rose-950/20 border-rose-500/30'
                    : 'bg-emerald-950/20 border-emerald-500/30'
              } space-y-2`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-xs font-bold text-white">{partnerDisplayName}</span>
                  </div>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    selectedMonthData.partnerLimit === 0
                      ? 'bg-slate-800 text-slate-400'
                      : selectedMonthData.isPartnerOver
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {selectedMonthData.partnerLimit === 0 ? (
                      'No Limit Set'
                    ) : selectedMonthData.isPartnerOver ? (
                      <>
                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                        Exceeded +{formatCurrency(selectedMonthData.partnerOverAmt, currency)}
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Saved {formatCurrency(selectedMonthData.partnerSavedAmt, currency)}
                      </>
                    )}
                  </span>
                </div>

                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">Spent:</span>
                  <span className="font-extrabold text-white">
                    {formatCurrency(selectedMonthData.partnerSpent, currency)} 
                    {selectedMonthData.partnerLimit > 0 && (
                      <span className="font-normal text-slate-400 text-[10px]"> / {formatCurrency(selectedMonthData.partnerLimit, currency)}</span>
                    )}
                  </span>
                </div>

                {selectedMonthData.partnerLimit > 0 && (
                  <div className="space-y-1">
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div 
                        style={{ width: `${Math.min(100, selectedMonthData.partnerPct)}%` }}
                        className={`h-full transition-all duration-300 ${
                          selectedMonthData.isPartnerOver ? 'bg-rose-500' : 'bg-emerald-500'
                        }`}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>{selectedMonthData.partnerPct}% used</span>
                      <span>{selectedMonthData.isPartnerOver ? `${selectedMonthData.partnerPct - 100}% over limit` : `${100 - selectedMonthData.partnerPct}% remaining`}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* COUPLE JOINT CARD */}
              <div className={`p-3.5 rounded-2xl border ${
                selectedMonthData.coupleLimit === 0
                  ? 'bg-slate-900/60 border-white/5'
                  : selectedMonthData.isCoupleOver
                    ? 'bg-rose-950/20 border-rose-500/30'
                    : 'bg-emerald-950/20 border-emerald-500/30'
              } space-y-2`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-bold text-white">Joint Couple</span>
                  </div>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    selectedMonthData.coupleLimit === 0
                      ? 'bg-slate-800 text-slate-400'
                      : selectedMonthData.isCoupleOver
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {selectedMonthData.coupleLimit === 0 ? (
                      'No Limit Set'
                    ) : selectedMonthData.isCoupleOver ? (
                      <>
                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                        Over by +{formatCurrency(selectedMonthData.coupleOverAmt, currency)}
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Saved {formatCurrency(selectedMonthData.coupleSavedAmt, currency)}
                      </>
                    )}
                  </span>
                </div>

                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">Spent:</span>
                  <span className="font-extrabold text-white">
                    {formatCurrency(selectedMonthData.coupleSpent, currency)} 
                    {selectedMonthData.coupleLimit > 0 && (
                      <span className="font-normal text-slate-400 text-[10px]"> / {formatCurrency(selectedMonthData.coupleLimit, currency)}</span>
                    )}
                  </span>
                </div>

                {selectedMonthData.coupleLimit > 0 && (
                  <div className="space-y-1">
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div 
                        style={{ width: `${Math.min(100, selectedMonthData.couplePct)}%` }}
                        className={`h-full transition-all duration-300 ${
                          selectedMonthData.isCoupleOver ? 'bg-rose-500' : 'bg-emerald-500'
                        }`}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>{selectedMonthData.couplePct}% used</span>
                      <span>{selectedMonthData.isCoupleOver ? `${selectedMonthData.couplePct - 100}% over budget` : `${100 - selectedMonthData.couplePct}% under budget`}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION B: WHERE THE AMOUNT EXCEEDED OR SAVED (Category Diagnostic breakdown) */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-300">
                Where Did the Money Go in {selectedMonthData.label}?
              </span>
              <span className="text-[11px] text-slate-400">
                {selectedMonthCategories.length} Active Categories
              </span>
            </div>

            {/* Smart Summary Callout */}
            {selectedMonthData.coupleLimit > 0 && (
              <div className={`p-3 rounded-2xl border text-xs flex items-start gap-2.5 ${
                selectedMonthData.isCoupleOver
                  ? 'bg-rose-950/20 border-rose-500/20 text-rose-200'
                  : 'bg-emerald-950/20 border-emerald-500/20 text-emerald-200'
              }`}>
                {selectedMonthData.isCoupleOver ? (
                  <TrendingUp className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-bold">
                    {selectedMonthData.isCoupleOver
                      ? `Budget Exceeded by ${formatCurrency(selectedMonthData.coupleOverAmt, currency)}: `
                      : `Under Budget with ${formatCurrency(selectedMonthData.coupleSavedAmt, currency)} Saved: `}
                  </span>
                  <span className="text-slate-300">
                    {selectedMonthCategories.length > 0
                      ? selectedMonthData.isCoupleOver
                        ? `Primary expenses were driven by ${selectedMonthCategories[0]?.name} (${formatCurrency(selectedMonthCategories[0]?.totalSpent, currency)})${selectedMonthCategories[1] ? ` and ${selectedMonthCategories[1]?.name} (${formatCurrency(selectedMonthCategories[1]?.totalSpent, currency)})` : ''}.`
                        : `Top spending stayed lean, led by ${selectedMonthCategories[0]?.name} (${formatCurrency(selectedMonthCategories[0]?.totalSpent, currency)}).`
                      : 'No expenses recorded for this month yet.'}
                  </span>
                </div>
              </div>
            )}

            {/* Category rows with individual splits */}
            {selectedMonthCategories.length > 0 ? (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1 no-scrollbar">
                {selectedMonthCategories.map((cat) => {
                  const budgetShare = selectedMonthData.coupleLimit > 0
                    ? Math.round((cat.totalSpent / selectedMonthData.coupleLimit) * 100)
                    : 0;

                  return (
                    <div 
                      key={cat.id} 
                      className="p-3 rounded-2xl bg-slate-900/60 border border-white/5 space-y-1.5 transition-colors hover:border-white/10"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="p-1.5 rounded-lg flex items-center justify-center text-white"
                            style={{ backgroundColor: `${cat.color}25`, color: cat.color }}
                          >
                            <CategoryIcon name={cat.icon} size={15} />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-white">{cat.name}</span>
                              <span className="text-[10px] text-slate-400">({cat.txCount} txs)</span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {cat.mySpent > 0 && (
                                <span className="text-rose-300 font-medium">
                                  {myDisplayName}: {formatCurrency(cat.mySpent, currency)}
                                </span>
                              )}
                              {cat.mySpent > 0 && cat.partnerSpent > 0 && <span> · </span>}
                              {cat.partnerSpent > 0 && (
                                <span className="text-indigo-300 font-medium">
                                  {partnerDisplayName}: {formatCurrency(cat.partnerSpent, currency)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-extrabold text-white block">
                            {formatCurrency(cat.totalSpent, currency)}
                          </span>
                          {selectedMonthData.coupleLimit > 0 && (
                            <span className={`text-[10px] font-semibold ${
                              budgetShare >= 30 ? 'text-amber-400' : 'text-slate-400'
                            }`}>
                              {budgetShare}% of joint budget
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center rounded-2xl bg-slate-900/40 border border-white/5 text-xs text-slate-400">
                No expense transactions recorded in {selectedMonthData.label}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

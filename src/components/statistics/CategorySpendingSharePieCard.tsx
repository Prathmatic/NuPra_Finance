import React, { useState, useMemo } from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  PieChart as PieIcon, 
  Users, 
  User, 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  Sparkles,
  Inbox
} from 'lucide-react';
import { Transaction, Category, CurrencyCode, UserProfile } from '../../types/finance';
import { formatCurrency, getCurrencySymbol } from '../../utils/formatters';
import { CategoryIcon } from '../common/CategoryIcon';
import { useFinance } from '../../context/FinanceContext';

interface CategorySpendingSharePieCardProps {
  transactions: Transaction[];
  categories: Category[];
  currency: CurrencyCode;
  currentUser: UserProfile | null;
  partner?: UserProfile | null;
}

export type ShareScope = 'both' | 'me' | 'partner';
export type ShareTimeframe = 'monthly' | 'yearly' | 'all';

export const CategorySpendingSharePieCard: React.FC<CategorySpendingSharePieCardProps> = ({
  transactions,
  categories,
  currency,
  currentUser,
  partner,
}) => {
  const { selectedMonth, stocks } = useFinance();
  const [scope, setScope] = useState<ShareScope>('both');
  const [timeframe, setTimeframe] = useState<ShareTimeframe>('monthly');

  const initialMonth = useMemo(() => selectedMonth || new Date().toISOString().slice(0, 7), [selectedMonth]);
  const [activeMonth, setActiveMonth] = useState<string>(initialMonth);
  const [activeYear, setActiveYear] = useState<string>(() => new Date().getFullYear().toString());

  const myDisplayName = currentUser?.name || 'You';
  const partnerDisplayName = partner?.name || 'Partner';

  // Navigate months
  const handlePrevMonth = () => {
    const [y, m] = activeMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    setActiveMonth(`${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [y, m] = activeMonth.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    setActiveMonth(`${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`);
  };

  // Navigate years
  const handlePrevYear = () => {
    setActiveYear(prev => (parseInt(prev) - 1).toString());
  };

  const handleNextYear = () => {
    setActiveYear(prev => (parseInt(prev) + 1).toString());
  };

  // Month formatted title
  const formattedMonthTitle = useMemo(() => {
    if (!activeMonth) return '';
    const [y, m] = activeMonth.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [activeMonth]);

  // Aggregate category spending data based on scope & timeframe
  const { chartData, totalExpense } = useMemo(() => {
    const myId = currentUser?.id;
    const partnerId = partner?.id;

    // 1. Filter expense transactions by timeframe
    const periodTxs = transactions.filter(t => {
      if (t.type !== 'expense') return false;
      if (timeframe === 'monthly') return t.date?.startsWith(activeMonth);
      if (timeframe === 'yearly') return t.date?.startsWith(activeYear);
      return true;
    });

    // 2. Filter by scope
    const scopeTxs = periodTxs.filter(t => {
      if (scope === 'me') return t.userId === myId;
      if (scope === 'partner') return partnerId ? t.userId === partnerId : false;
      return true;
    });

    // 3. Aggregate into category map (excluding stock transactions, which are derived from stocks)
    const catMap: Record<string, {
      id: string;
      name: string;
      amount: number;
      color: string;
      icon: string;
      txCount: number;
    }> = {};

    scopeTxs.forEach(t => {
      const isStockOrInvestmentTx = Boolean(
        t.stockId || 
        t.title?.startsWith('Stock Investment:') || 
        t.categoryId === 'cat-investment' || 
        t.categoryName?.toLowerCase() === 'investment'
      );
      if (isStockOrInvestmentTx) return;

      const catName = t.categoryName || 'Other';
      if (!catMap[catName]) {
        const matched = categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
        catMap[catName] = {
          id: t.categoryId || catName,
          name: catName,
          amount: 0,
          color: t.categoryColor || matched?.color || '#f43f5e',
          icon: t.categoryIcon || matched?.icon || 'Tag',
          txCount: 0,
        };
      }
      catMap[catName].amount += t.amount;
      catMap[catName].txCount += 1;
    });

    // 4. Derive Investment category from actual active stocks for this timeframe & scope
    const periodStocks = (stocks || []).filter(s => {
      const matchesTimeframe = (
        (timeframe === 'monthly' && (s.monthYear === activeMonth || s.date?.startsWith(activeMonth))) ||
        (timeframe === 'yearly' && (s.monthYear?.startsWith(activeYear) || s.date?.startsWith(activeYear))) ||
        (timeframe === 'all')
      );
      if (!matchesTimeframe) return false;
      if (scope === 'me') return s.userId === myId;
      if (scope === 'partner') return partnerId ? s.userId === partnerId : false;
      return true;
    });

    const stockTotal = periodStocks.reduce((sum, s) => sum + s.investedAmount, 0);
    if (stockTotal > 0) {
      catMap['Investment'] = {
        id: 'cat-investment',
        name: 'Investment',
        amount: stockTotal,
        color: '#3B82F6',
        icon: 'TrendingUp',
        txCount: periodStocks.length,
      };
    }

    const total = Object.values(catMap).reduce((sum, c) => sum + c.amount, 0);
    const sorted = Object.values(catMap)
      .sort((a, b) => b.amount - a.amount)
      .map(item => ({
        ...item,
        value: item.amount,
        percentage: total > 0 ? Math.round((item.amount / total) * 100) : 0,
      }));

    return { chartData: sorted, totalExpense: total };
  }, [transactions, categories, stocks, timeframe, scope, activeMonth, activeYear, currentUser, partner]);

  const activePeriodLabel = timeframe === 'monthly'
    ? formattedMonthTitle
    : timeframe === 'yearly'
    ? `Full Year ${activeYear}`
    : 'All Time';

  const activeScopeLabel = scope === 'both' 
    ? 'Both of Us' 
    : scope === 'me' 
    ? myDisplayName 
    : partnerDisplayName;

  return (
    <div className="glass-card p-5 rounded-3xl border border-white/10 space-y-4 bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-pink-950/20 shadow-xl">
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 text-pink-400 border border-pink-500/20 shadow-sm">
            <PieIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Category Spending Share
              </h3>
              <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                {activeScopeLabel}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Macro category distribution in {activePeriodLabel}
            </p>
          </div>
        </div>

        {/* Timeframe Selector Pill */}
        <div className="flex bg-slate-950/80 p-1 rounded-2xl border border-white/10 text-xs font-semibold self-start sm:self-auto shadow-inner">
          <button
            onClick={() => setTimeframe('monthly')}
            className={`px-3 py-1 rounded-xl transition-all ${
              timeframe === 'monthly'
                ? 'bg-gradient-to-r from-pink-600 to-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setTimeframe('yearly')}
            className={`px-3 py-1 rounded-xl transition-all ${
              timeframe === 'yearly'
                ? 'bg-gradient-to-r from-pink-600 to-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Yearly
          </button>
          <button
            onClick={() => setTimeframe('all')}
            className={`px-3 py-1 rounded-xl transition-all ${
              timeframe === 'all'
                ? 'bg-gradient-to-r from-pink-600 to-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      {/* ── Controls Bar: Scope (Both / Me / Partner) & Period Navigation ─────── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 border-t border-white/5">
        {/* Scope Selector: Both vs Me vs Partner */}
        <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-white/5 text-[11px]">
          <button
            onClick={() => setScope('both')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold transition-all ${
              scope === 'both'
                ? 'bg-gradient-to-r from-rose-500/30 to-indigo-500/30 border border-indigo-500/40 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <span>Both of Us</span>
          </button>

          <button
            onClick={() => setScope('me')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold transition-all ${
              scope === 'me'
                ? 'bg-rose-500/25 border border-rose-500/40 text-rose-200 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5 text-rose-400" />
            <span>{myDisplayName}</span>
          </button>

          {partner && (
            <button
              onClick={() => setScope('partner')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold transition-all ${
                scope === 'partner'
                  ? 'bg-indigo-500/25 border border-indigo-500/40 text-indigo-200 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span>{partnerDisplayName}</span>
            </button>
          )}
        </div>

        {/* Period Navigator (< Month / Year >) */}
        {timeframe !== 'all' && (
          <div className="flex items-center gap-1.5 bg-slate-950/70 px-2 py-1 rounded-xl border border-white/5 text-xs text-slate-300">
            <button
              onClick={timeframe === 'monthly' ? handlePrevMonth : handlePrevYear}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              title="Previous Period"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-semibold text-slate-200 px-1 text-[11px] whitespace-nowrap">
              {timeframe === 'monthly' ? formattedMonthTitle : activeYear}
            </span>
            <button
              onClick={timeframe === 'monthly' ? handleNextMonth : handleNextYear}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              title="Next Period"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ── Main Content: Donut Chart + Breakdown List ────────────────────────── */}
      {chartData.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-center p-6 rounded-2xl bg-slate-950/40 border border-dashed border-white/10 space-y-2">
          <div className="p-3 rounded-2xl bg-white/5 text-slate-500">
            <Inbox className="w-6 h-6" />
          </div>
          <p className="text-xs font-bold text-slate-300">
            No expenses recorded for {activeScopeLabel} in {activePeriodLabel}
          </p>
          <p className="text-[11px] text-slate-500 max-w-xs">
            Transactions recorded by {activeScopeLabel} during this period will automatically appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-5 pt-1">
          {/* Donut Chart with Dynamic Center Amount */}
          <div className="h-60 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={56}
                  outerRadius={82}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`pie-cell-${index}`} 
                      fill={entry.color} 
                      stroke="#0f172a" 
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderColor: '#334155', 
                    borderRadius: '16px', 
                    color: '#fff', 
                    fontSize: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
                  }}
                  formatter={(val: any, name: any, item: any) => [
                    `${formatCurrency(Number(val), currency)} (${item.payload.percentage}%)`,
                    item.payload.name
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Centered Total Callout inside Donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {activeScopeLabel === 'Both of Us' ? 'Total Spent' : activeScopeLabel}
              </span>
              <span className="text-base font-black text-white">
                {formatCurrency(totalExpense, currency)}
              </span>
              <span className="text-[10px] text-slate-500">
                {chartData.length} {chartData.length === 1 ? 'category' : 'categories'}
              </span>
            </div>
          </div>

          {/* Slices legend list with visual progress bars */}
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1 no-scrollbar">
            {chartData.map((item) => (
              <div 
                key={item.id} 
                className="p-2.5 rounded-xl bg-slate-900/70 border border-white/5 space-y-1.5 transition-colors hover:border-white/10"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div 
                      className="p-1.5 rounded-lg flex items-center justify-center text-white shadow-xs"
                      style={{ backgroundColor: `${item.color}25`, color: item.color }}
                    >
                      <CategoryIcon name={item.icon} size={14} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-200">{item.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/5 text-slate-400 font-semibold border border-white/5">
                        {item.percentage}%
                      </span>
                    </div>
                  </div>

                  <span className="font-extrabold text-white text-xs">
                    {formatCurrency(item.amount, currency)}
                  </span>
                </div>

                {/* Micro Progress Bar */}
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${item.percentage}%`, 
                      backgroundColor: item.color 
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

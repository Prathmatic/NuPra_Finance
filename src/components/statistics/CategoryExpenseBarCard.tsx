import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Legend, 
  CartesianGrid, 
  Cell 
} from 'recharts';
import { 
  BarChart3, 
  ChevronDown, 
  ChevronUp, 
  ChevronLeft,
  ChevronRight,
  Calendar,
  Users,
  User
} from 'lucide-react';
import { Transaction, Category, CurrencyCode, UserProfile } from '../../types/finance';
import { formatCurrency, getCurrencySymbol } from '../../utils/formatters';
import { CategoryIcon } from '../common/CategoryIcon';
import { useFinance } from '../../context/FinanceContext';

interface CategoryExpenseBarCardProps {
  transactions: Transaction[];
  categories: Category[];
  currency: CurrencyCode;
  currentUser: UserProfile | null;
  partner?: UserProfile | null;
}

export type CategoryBarMode = 'split' | 'stacked' | 'total';
export type CategoryTimeframe = 'month' | 'year' | 'all';
export type CategoryScope = 'both' | 'me' | 'partner';

export const CategoryExpenseBarCard: React.FC<CategoryExpenseBarCardProps> = ({
  transactions,
  categories,
  currency,
  currentUser,
  partner,
}) => {
  const { exchangeRate, stocks, selectedMonth } = useFinance();
  const [scope, setScope] = useState<CategoryScope>('both');
  const [timeframe, setTimeframe] = useState<CategoryTimeframe>('month');
  const [barMode, setBarMode] = useState<CategoryBarMode>('split');
  const [showAll, setShowAll] = useState(false);

  const initialMonth = useMemo(() => selectedMonth || new Date().toISOString().slice(0, 7), [selectedMonth]);
  const [activeMonth, setActiveMonth] = useState<string>(initialMonth);
  const [activeYear, setActiveYear] = useState<string>(() => new Date().getFullYear().toString());

  const currencySymbol = getCurrencySymbol(currency);
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

  // Formatted month title
  const formattedMonthTitle = useMemo(() => {
    if (!activeMonth) return '';
    const [y, m] = activeMonth.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [activeMonth]);

  // Filter transactions by timeframe
  const filteredExpenseTxs = useMemo(() => {
    return transactions.filter(t => {
      if (t.type !== 'expense') return false;
      if (timeframe === 'month' && !t.date?.startsWith(activeMonth)) return false;
      if (timeframe === 'year' && !t.date?.startsWith(activeYear)) return false;
      return true;
    });
  }, [transactions, timeframe, activeMonth, activeYear]);

  // Aggregate by category with individual user breakdown
  const categoryData = useMemo(() => {
    const catMap: Record<string, {
      id: string;
      name: string;
      shortName: string;
      icon: string;
      color: string;
      myExpense: number;
      partnerExpense: number;
      togetherExpense: number;
      txCount: number;
    }> = {};

    const myId = currentUser?.id;
    const partnerId = partner?.id;

    filteredExpenseTxs.forEach(t => {
      // Exclude stock investment transactions from raw ledger iteration;
      // investments are strictly derived from actual active stocks below
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
        const icon = t.categoryIcon || matched?.icon || 'Tag';
        const color = t.categoryColor || matched?.color || '#f43f5e';
        const shortName = catName.length > 10 ? `${catName.slice(0, 9)}…` : catName;

        catMap[catName] = {
          id: t.categoryId || catName,
          name: catName,
          shortName,
          icon,
          color,
          myExpense: 0,
          partnerExpense: 0,
          togetherExpense: 0,
          txCount: 0,
        };
      }

      const item = catMap[catName];
      item.togetherExpense += t.amount;
      item.txCount += 1;

      if (t.userId === myId) {
        item.myExpense += t.amount;
      } else if (partnerId && t.userId === partnerId) {
        item.partnerExpense += t.amount;
      } else {
        if (t.userId === myId) {
          item.myExpense += t.amount;
        } else {
          item.partnerExpense += t.amount;
        }
      }
    });

    // Derive Investment category strictly from actual active stocks in this timeframe
    const periodStocks = (stocks || []).filter(s => {
      if (timeframe === 'month') return s.monthYear === activeMonth || s.date?.startsWith(activeMonth);
      if (timeframe === 'year') return s.date?.startsWith(activeYear);
      return true;
    });

    if (periodStocks.length > 0) {
      let myStockExp = 0;
      let partnerStockExp = 0;
      periodStocks.forEach(s => {
        if (s.userId === myId) myStockExp += s.investedAmount;
        else if (partnerId && s.userId === partnerId) partnerStockExp += s.investedAmount;
        else myStockExp += s.investedAmount;
      });

      const totalStockExp = myStockExp + partnerStockExp;
      if (totalStockExp > 0) {
        catMap['Investment'] = {
          id: 'cat-investment',
          name: 'Investment',
          shortName: 'Investment',
          icon: 'TrendingUp',
          color: '#3B82F6',
          myExpense: myStockExp,
          partnerExpense: partnerStockExp,
          togetherExpense: totalStockExp,
          txCount: periodStocks.length,
        };
      }
    }

    // Filter categories based on selected scope
    return Object.values(catMap)
      .filter(item => {
        if (scope === 'me') return item.myExpense > 0;
        if (scope === 'partner') return item.partnerExpense > 0;
        return item.togetherExpense > 0;
      })
      .sort((a, b) => {
        if (scope === 'me') return b.myExpense - a.myExpense;
        if (scope === 'partner') return b.partnerExpense - a.partnerExpense;
        return b.togetherExpense - a.togetherExpense;
      })
      .map(item => {
        const myPct = item.togetherExpense > 0 
          ? Math.round((item.myExpense / item.togetherExpense) * 100) 
          : 0;
        const partnerPct = item.togetherExpense > 0 
          ? 100 - myPct 
          : 0;

        return {
          ...item,
          myPct,
          partnerPct,
        };
      });
  }, [filteredExpenseTxs, currentUser, partner, categories, stocks, timeframe, scope, activeMonth, activeYear]);

  const totalPeriodExpense = useMemo(() => {
    return categoryData.reduce((sum, item) => {
      if (scope === 'me') return sum + item.myExpense;
      if (scope === 'partner') return sum + item.partnerExpense;
      return sum + item.togetherExpense;
    }, 0);
  }, [categoryData, scope]);

  const displayedCategories = useMemo(() => {
    if (showAll || categoryData.length <= 6) return categoryData;
    return categoryData.slice(0, 6);
  }, [categoryData, showAll]);

  const topCategory = categoryData[0];

  const activePeriodLabel = timeframe === 'month'
    ? formattedMonthTitle
    : timeframe === 'year'
    ? `Year ${activeYear}`
    : 'All Time';

  const activeScopeLabel = scope === 'both'
    ? 'Both of Us'
    : scope === 'me'
    ? myDisplayName
    : partnerDisplayName;

  return (
    <div className="glass-card p-5 rounded-3xl border border-white/10 space-y-4">
      {/* Header with Title and Timeframe Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-br from-rose-500/20 to-indigo-500/20 text-rose-400 border border-rose-500/20 shadow-sm">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Individual Category Breakdown
              </h3>
              <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {activeScopeLabel}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Spending by category in {activePeriodLabel}
            </p>
          </div>
        </div>

        {/* Timeframe Switcher */}
        <div className="flex bg-slate-900/90 p-1 rounded-2xl border border-white/10 text-xs font-semibold self-start sm:self-auto shadow-inner">
          <button
            onClick={() => setTimeframe('month')}
            className={`px-3 py-1 rounded-xl transition-all ${
              timeframe === 'month'
                ? 'bg-gradient-to-r from-rose-600 to-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setTimeframe('year')}
            className={`px-3 py-1 rounded-xl transition-all ${
              timeframe === 'year'
                ? 'bg-gradient-to-r from-rose-600 to-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Yearly
          </button>
          <button
            onClick={() => setTimeframe('all')}
            className={`px-3 py-1 rounded-xl transition-all ${
              timeframe === 'all'
                ? 'bg-gradient-to-r from-rose-600 to-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      {/* Controls Bar: Scope (Both / Me / Partner) + Period Navigator */}
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
            <span>Both (Compare)</span>
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
              onClick={timeframe === 'month' ? handlePrevMonth : handlePrevYear}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              title="Previous Period"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-semibold text-slate-200 px-1 text-[11px] whitespace-nowrap">
              {timeframe === 'month' ? formattedMonthTitle : activeYear}
            </span>
            <button
              onClick={timeframe === 'month' ? handleNextMonth : handleNextYear}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              title="Next Period"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Sub-bar: Bar Mode Switcher (only in Both mode) + Spend Overview */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        {scope === 'both' ? (
          <div className="flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-white/5 text-[11px]">
            <button
              onClick={() => setBarMode('split')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                barMode === 'split'
                  ? 'bg-white/15 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Side-by-side bars for You and Partner"
            >
              Side-by-Side
            </button>
            <button
              onClick={() => setBarMode('stacked')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                barMode === 'stacked'
                  ? 'bg-white/15 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Stacked bar showing combined category height"
            >
              Stacked
            </button>
            <button
              onClick={() => setBarMode('total')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                barMode === 'total'
                  ? 'bg-white/15 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Total spent per category colored by category"
            >
              Total
            </button>
          </div>
        ) : (
          <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: scope === 'me' ? '#fb7185' : '#818cf8' }} />
            <span>Viewing {activeScopeLabel}'s Category Spending</span>
          </div>
        )}

        {categoryData.length > 0 && (
          <div className="text-[11px] text-slate-300 font-medium">
            <span className="text-slate-400">{categoryData.length} categories · </span>
            <span className="font-bold text-white">{formatCurrency(totalPeriodExpense, currency)}</span>
          </div>
        )}
      </div>

      {/* Bar Chart or Empty State */}
      {displayedCategories.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-dashed border-white/10 space-y-2">
          <div className="w-10 h-10 mx-auto rounded-full bg-slate-800/80 flex items-center justify-center text-slate-400">
            <Calendar className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-slate-300">
            No expenses recorded for {activeScopeLabel} in {activePeriodLabel}
          </p>
          <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
            Switch the month/year or record new expenses to see category breakdowns.
          </p>
          {timeframe !== 'all' && (
            <button
              onClick={() => setTimeframe('all')}
              className="mt-2 text-xs font-bold text-rose-400 hover:text-rose-300 underline underline-offset-4"
            >
              Switch to All Time
            </button>
          )}
        </div>
      ) : (
        <div className="h-64 sm:h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={displayedCategories} 
              margin={{ top: 12, right: 10, left: -20, bottom: 25 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.35} vertical={false} />
              <XAxis 
                dataKey="shortName" 
                stroke="#94a3b8" 
                fontSize={10} 
                tickLine={false} 
                interval={0}
                angle={-25}
                textAnchor="end"
                height={40}
              />
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
                labelFormatter={(label: any) => {
                  const found = displayedCategories.find(c => c.shortName === label || c.name === label);
                  return found ? `${found.name} (${found.txCount} txs)` : label;
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />

              {scope === 'both' ? (
                <>
                  {barMode === 'split' && (
                    <>
                      <Bar 
                        dataKey="myExpense" 
                        name={`${myDisplayName} Expense`} 
                        fill="#fb7185" 
                        radius={[5, 5, 0, 0]} 
                        maxBarSize={28} 
                      />
                      <Bar 
                        dataKey="partnerExpense" 
                        name={`${partnerDisplayName} Expense`} 
                        fill="#818cf8" 
                        radius={[5, 5, 0, 0]} 
                        maxBarSize={28} 
                      />
                    </>
                  )}

                  {barMode === 'stacked' && (
                    <>
                      <Bar 
                        dataKey="myExpense" 
                        name={`${myDisplayName} Expense`} 
                        stackId="catStack" 
                        fill="#fb7185" 
                        radius={[0, 0, 0, 0]} 
                        maxBarSize={32} 
                      />
                      <Bar 
                        dataKey="partnerExpense" 
                        name={`${partnerDisplayName} Expense`} 
                        stackId="catStack" 
                        fill="#818cf8" 
                        radius={[5, 5, 0, 0]} 
                        maxBarSize={32} 
                      />
                    </>
                  )}

                  {barMode === 'total' && (
                    <Bar 
                      dataKey="togetherExpense" 
                      name="Category Total" 
                      radius={[5, 5, 0, 0]} 
                      maxBarSize={32}
                    >
                      {displayedCategories.map((entry, index) => (
                        <Cell key={`bar-cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  )}
                </>
              ) : scope === 'me' ? (
                <Bar 
                  dataKey="myExpense" 
                  name={`${myDisplayName} Expense`} 
                  fill="#fb7185" 
                  radius={[5, 5, 0, 0]} 
                  maxBarSize={32} 
                >
                  {displayedCategories.map((entry, index) => (
                    <Cell key={`bar-cell-me-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              ) : (
                <Bar 
                  dataKey="partnerExpense" 
                  name={`${partnerDisplayName} Expense`} 
                  fill="#818cf8" 
                  radius={[5, 5, 0, 0]} 
                  maxBarSize={32} 
                >
                  {displayedCategories.map((entry, index) => (
                    <Cell key={`bar-cell-partner-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Category Callout */}
      {topCategory && (
        <div className="p-3 rounded-2xl bg-gradient-to-r from-rose-500/10 via-slate-900 to-indigo-500/10 border border-white/5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div 
              className="p-1.5 rounded-lg flex items-center justify-center text-white"
              style={{ backgroundColor: `${topCategory.color}25` }}
            >
              <CategoryIcon name={topCategory.icon} size={15} />
            </div>
            <div>
              <span className="text-slate-400 text-[11px]">Top Spend Category: </span>
              <span className="font-bold text-white">{topCategory.name}</span>
            </div>
          </div>
          <span className="font-extrabold text-white">
            {formatCurrency(
              scope === 'me' 
                ? topCategory.myExpense 
                : scope === 'partner' 
                ? topCategory.partnerExpense 
                : topCategory.togetherExpense, 
              currency
            )}
          </span>
        </div>
      )}

      {/* Category Breakdown & Split Contributions List */}
      {displayedCategories.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-white/5">
          <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
            <span className="font-semibold text-slate-300">Category Breakdown & Contribution</span>
            {scope === 'both' && (
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#fb7185]" />
                  <span className="text-slate-300">{myDisplayName}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#818cf8]" />
                  <span className="text-slate-300">{partnerDisplayName}</span>
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1 no-scrollbar">
            {displayedCategories.map((item) => {
              const currentVal = scope === 'me' 
                ? item.myExpense 
                : scope === 'partner' 
                ? item.partnerExpense 
                : item.togetherExpense;

              return (
                <div 
                  key={item.id} 
                  className="p-3 rounded-2xl bg-slate-900/70 border border-white/5 space-y-2 transition-colors hover:border-white/10"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div 
                        className="p-2 rounded-xl flex items-center justify-center text-white shadow-xs"
                        style={{ backgroundColor: `${item.color}25`, color: item.color }}
                      >
                        <CategoryIcon name={item.icon} size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white">{item.name}</span>
                          <span className="text-[10px] text-slate-400">({item.txCount} tx{item.txCount === 1 ? '' : 's'})</span>
                        </div>
                        {scope === 'both' ? (
                          <div className="text-[10px] text-slate-400">
                            {item.myExpense > 0 && (
                              <span className="text-rose-300 font-medium">
                                {myDisplayName}: {formatCurrency(item.myExpense, currency)} ({item.myPct}%)
                              </span>
                            )}
                            {item.myExpense > 0 && item.partnerExpense > 0 && <span> · </span>}
                            {item.partnerExpense > 0 && (
                              <span className="text-indigo-300 font-medium">
                                {partnerDisplayName}: {formatCurrency(item.partnerExpense, currency)} ({item.partnerPct}%)
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400">
                            <span className="text-slate-300 font-medium">
                              {activeScopeLabel} share of total: {totalPeriodExpense > 0 ? Math.round((currentVal / totalPeriodExpense) * 100) : 0}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <span className="text-xs font-extrabold text-white">
                      {formatCurrency(currentVal, currency)}
                    </span>
                  </div>

                  {/* Visual Proportion Bar */}
                  {scope === 'both' ? (
                    <div className="w-full h-1.5 rounded-full bg-slate-800 flex overflow-hidden">
                      <div 
                        className="h-full bg-[#fb7185] transition-all duration-500" 
                        style={{ width: `${item.myPct}%` }}
                        title={`${myDisplayName}: ${item.myPct}%`}
                      />
                      <div 
                        className="h-full bg-[#818cf8] transition-all duration-500" 
                        style={{ width: `${item.partnerPct}%` }}
                        title={`${partnerDisplayName}: ${item.partnerPct}%`}
                      />
                    </div>
                  ) : (
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500" 
                        style={{ 
                          width: `${totalPeriodExpense > 0 ? Math.round((currentVal / totalPeriodExpense) * 100) : 0}%`,
                          backgroundColor: item.color 
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Show More / Show Less Toggle Button */}
          {categoryData.length > 6 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/5 text-xs font-bold text-slate-300 hover:text-white transition-all flex items-center justify-center gap-1.5 mt-2"
            >
              <span>{showAll ? 'Show Top 6 Categories' : `Show All ${categoryData.length} Categories`}</span>
              {showAll ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

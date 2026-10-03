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
  Calendar 
} from 'lucide-react';
import { Transaction, Category, CurrencyCode, UserProfile } from '../../types/finance';
import { formatCurrency, getCurrencySymbol } from '../../utils/formatters';
import { CategoryIcon } from '../common/CategoryIcon';

interface CategoryExpenseBarCardProps {
  transactions: Transaction[];
  categories: Category[];
  currency: CurrencyCode;
  currentUser: UserProfile | null;
  partner?: UserProfile | null;
}

export type CategoryBarMode = 'split' | 'stacked' | 'total';
export type CategoryTimeframe = 'month' | 'year' | 'all';

export const CategoryExpenseBarCard: React.FC<CategoryExpenseBarCardProps> = ({
  transactions,
  categories,
  currency,
  currentUser,
  partner,
}) => {
  const [timeframe, setTimeframe] = useState<CategoryTimeframe>('month');
  const [barMode, setBarMode] = useState<CategoryBarMode>('split');
  const [showAll, setShowAll] = useState(false);

  const currencySymbol = getCurrencySymbol(currency);
  const myDisplayName = currentUser?.name || 'You';
  const partnerDisplayName = partner?.name || 'Partner';

  const currentMonthPrefix = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const currentYearPrefix = useMemo(() => new Date().getFullYear().toString(), []);

  // Filter transactions by timeframe
  const filteredExpenseTxs = useMemo(() => {
    return transactions.filter(t => {
      if (t.type !== 'expense') return false;
      if (timeframe === 'month') return t.date.startsWith(currentMonthPrefix);
      if (timeframe === 'year') return t.date.startsWith(currentYearPrefix);
      return true;
    });
  }, [transactions, timeframe, currentMonthPrefix, currentYearPrefix]);

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
        // Fallback for unassigned or partner-less records
        if (t.userId === myId) {
          item.myExpense += t.amount;
        } else {
          item.partnerExpense += t.amount;
        }
      }
    });

    return Object.values(catMap)
      .sort((a, b) => b.togetherExpense - a.togetherExpense)
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
  }, [filteredExpenseTxs, currentUser, partner, categories]);

  const totalPeriodExpense = useMemo(() => {
    return categoryData.reduce((sum, item) => sum + item.togetherExpense, 0);
  }, [categoryData]);

  const displayedCategories = useMemo(() => {
    if (showAll || categoryData.length <= 6) return categoryData;
    return categoryData.slice(0, 6);
  }, [categoryData, showAll]);

  const topCategory = categoryData[0];

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
                New
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Compare spending by category: {myDisplayName} vs {partnerDisplayName}
            </p>
          </div>
        </div>

        {/* Timeframe Switcher */}
        <div className="flex bg-slate-900/90 p-1 rounded-2xl border border-white/10 text-xs font-semibold self-start sm:self-auto">
          <button
            onClick={() => setTimeframe('month')}
            className={`px-2.5 py-1 rounded-xl transition-all ${
              timeframe === 'month'
                ? 'bg-gradient-to-r from-rose-600 to-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => setTimeframe('year')}
            className={`px-2.5 py-1 rounded-xl transition-all ${
              timeframe === 'year'
                ? 'bg-gradient-to-r from-rose-600 to-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            This Year
          </button>
          <button
            onClick={() => setTimeframe('all')}
            className={`px-2.5 py-1 rounded-xl transition-all ${
              timeframe === 'all'
                ? 'bg-gradient-to-r from-rose-600 to-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      {/* Sub-bar: Bar Mode Switcher + Spend Overview */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5">
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
            Category Total
          </button>
        </div>

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
            No expenses recorded for {timeframe === 'month' ? 'this month' : timeframe === 'year' ? 'this year' : 'this period'}
          </p>
          <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
            Switch the timeframe filter or add new expenses to see individual category breakdowns.
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
                tickFormatter={(v) => `${currencySymbol}${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} 
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
            {formatCurrency(topCategory.togetherExpense, currency)}
          </span>
        </div>
      )}

      {/* Category Breakdown & Split Contributions List */}
      {displayedCategories.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-white/5">
          <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
            <span className="font-semibold text-slate-300">Category Breakdown & Contribution</span>
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
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1 no-scrollbar">
            {displayedCategories.map((item) => (
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
                    </div>
                  </div>

                  <span className="text-xs font-extrabold text-white">
                    {formatCurrency(item.togetherExpense, currency)}
                  </span>
                </div>

                {/* Split Progress Bar */}
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden flex">
                  <div 
                    style={{ width: `${item.myPct}%` }} 
                    className="h-full bg-rose-500 transition-all duration-300"
                    title={`${myDisplayName}: ${item.myPct}%`}
                  />
                  <div 
                    style={{ width: `${item.partnerPct}%` }} 
                    className="h-full bg-indigo-500 transition-all duration-300"
                    title={`${partnerDisplayName}: ${item.partnerPct}%`}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Expand/Collapse Toggle if more than 6 categories */}
          {categoryData.length > 6 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="w-full py-2 flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-xl"
            >
              {showAll ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Show Top 6 Categories
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Show All {categoryData.length} Categories
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend, 
  CartesianGrid, 
  AreaChart, 
  Area 
} from 'recharts';
import { 
  BarChart3, 
  PieChart as PieIcon, 
  Target, 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  Sparkles,
  Users
} from 'lucide-react';
import { formatCurrency, getCurrencySymbol } from '../../utils/formatters';

export const StatisticsView: React.FC = () => {
  const { transactions, goals, stocks, currency, currentUser, partner } = useFinance();
  const [timeframe, setTimeframe] = useState<'monthly' | 'yearly'>('monthly');

  const currencySymbol = getCurrencySymbol(currency);

  // 1. Monthly & Yearly Individual vs Together Savings & Expenses
  const { monthlyData, yearlyData } = useMemo(() => {
    const monthMap: Record<string, { month: string; myIncome: number; myExpense: number; partnerIncome: number; partnerExpense: number }> = {};
    const yearMap: Record<string, { year: string; myIncome: number; myExpense: number; partnerIncome: number; partnerExpense: number }> = {};

    transactions.forEach(t => {
      const monthKey = t.date.slice(0, 7); // "YYYY-MM"
      const yearKey = t.date.slice(0, 4);  // "YYYY"

      // Month
      if (!monthMap[monthKey]) {
        monthMap[monthKey] = { month: monthKey, myIncome: 0, myExpense: 0, partnerIncome: 0, partnerExpense: 0 };
      }
      if (t.userId === currentUser.id) {
        if (t.type === 'income') monthMap[monthKey].myIncome += t.amount;
        else monthMap[monthKey].myExpense += t.amount;
      } else {
        if (t.type === 'income') monthMap[monthKey].partnerIncome += t.amount;
        else monthMap[monthKey].partnerExpense += t.amount;
      }

      // Year
      if (!yearMap[yearKey]) {
        yearMap[yearKey] = { year: yearKey, myIncome: 0, myExpense: 0, partnerIncome: 0, partnerExpense: 0 };
      }
      if (t.userId === currentUser.id) {
        if (t.type === 'income') yearMap[yearKey].myIncome += t.amount;
        else yearMap[yearKey].myExpense += t.amount;
      } else {
        if (t.type === 'income') yearMap[yearKey].partnerIncome += t.amount;
        else yearMap[yearKey].partnerExpense += t.amount;
      }
    });

    // Format Monthly array
    const months = Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month)).map(item => {
      const mySaving = Math.max(0, item.myIncome - item.myExpense);
      const partnerSaving = Math.max(0, item.partnerIncome - item.partnerExpense);
      const togetherExpense = item.myExpense + item.partnerExpense;
      const togetherSaving = mySaving + partnerSaving;
      
      const [y, m] = item.month.split('-');
      const label = new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('en-US', { month: 'short' });

      return {
        label,
        key: item.month,
        myExpense: item.myExpense,
        partnerExpense: item.partnerExpense,
        togetherExpense,
        mySaving,
        partnerSaving,
        togetherSaving,
      };
    });

    // Format Yearly array
    const years = Object.values(yearMap).sort((a, b) => a.year.localeCompare(b.year)).map(item => {
      const mySaving = Math.max(0, item.myIncome - item.myExpense);
      const partnerSaving = Math.max(0, item.partnerIncome - item.partnerExpense);
      const togetherExpense = item.myExpense + item.partnerExpense;
      const togetherSaving = mySaving + partnerSaving;

      return {
        label: item.year,
        myExpense: item.myExpense,
        partnerExpense: item.partnerExpense,
        togetherExpense,
        mySaving,
        partnerSaving,
        togetherSaving,
      };
    });

    return { monthlyData: months, yearlyData: years };
  }, [transactions, currentUser]);

  const activePeriodData = timeframe === 'monthly' ? monthlyData : yearlyData;

  // 2. Spending Category Breakdown (Pie Chart)
  const categoryChartData = useMemo(() => {
    const catMap: Record<string, { name: string; value: number; color: string }> = {};

    transactions.filter(t => t.type === 'expense').forEach(t => {
      if (!catMap[t.categoryName]) {
        catMap[t.categoryName] = {
          name: t.categoryName,
          value: 0,
          color: t.categoryColor || '#f43f5e',
        };
      }
      catMap[t.categoryName].value += t.amount;
    });

    return Object.values(catMap).sort((a, b) => b.value - a.value);
  }, [transactions]);

  // 3. Goal Deficit Data ("how much amount is needed more to achieve goal")
  const goalDeficitData = useMemo(() => {
    return goals.map(g => ({
      name: g.title.length > 14 ? g.title.slice(0, 14) + '...' : g.title,
      saved: g.currentAmount,
      neededMore: Math.max(0, g.targetAmount - g.currentAmount),
      target: g.targetAmount,
      color: g.color,
    }));
  }, [goals]);

  // 4. Stock Market Individual Capital Data
  const stockCapitalData = useMemo(() => {
    let myStock = 0;
    let partnerStock = 0;

    stocks.forEach(s => {
      if (s.userId === currentUser.id) myStock += s.investedAmount;
      else partnerStock += s.investedAmount;
    });

    return [
      { name: `${currentUser.name}'s Capital`, value: myStock, color: '#f43f5e' },
      { name: `${partner?.name || 'Partner'}'s Capital`, value: partnerStock, color: '#6366f1' },
    ];
  }, [stocks, currentUser, partner]);

  const partnerName = partner?.name || 'Partner';

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300">
      {/* Header & Timeframe Switcher */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-white">Financial Statistics</h2>
          <p className="text-xs text-slate-400">Individual & Collaborative Analytics</p>
        </div>

        <div className="flex bg-slate-900 p-1 rounded-2xl border border-white/10 text-xs font-semibold">
          <button
            onClick={() => setTimeframe('monthly')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              timeframe === 'monthly'
                ? 'bg-gradient-to-r from-rose-600 to-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setTimeframe('yearly')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              timeframe === 'yearly'
                ? 'bg-gradient-to-r from-rose-600 to-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Yearly
          </button>
        </div>
      </div>

      {/* 1. INDIVIDUAL SAVING AND TOGETHER SAVING PLOT (User Key Requirement) */}
      <div className="glass-card p-5 rounded-3xl border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Individual & Together Savings
              </h3>
              <p className="text-[11px] text-slate-400">
                {timeframe === 'monthly' ? 'Month-by-month accumulation' : 'Annual net savings'}
              </p>
            </div>
          </div>
        </div>

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activePeriodData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `${currencySymbol}${v >= 1000 ? `${v/1000}k` : v}`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '16px', color: '#fff', fontSize: '12px' }}
                formatter={(val: any) => [formatCurrency(Number(val), currency)]}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Bar dataKey="mySaving" name={`${currentUser.name} Saving`} fill="#f43f5e" radius={[6, 6, 0, 0]} />
              <Bar dataKey="partnerSaving" name={`${partnerName} Saving`} fill="#6366f1" radius={[6, 6, 0, 0]} />
              <Bar dataKey="togetherSaving" name="Together Saving" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. EXPENSE INDIVIDUAL AND TOGETHER PLOT (User Key Requirement) */}
      <div className="glass-card p-5 rounded-3xl border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-rose-500/20 text-rose-400">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Individual & Together Expenses
              </h3>
              <p className="text-[11px] text-slate-400">
                {timeframe === 'monthly' ? 'Monthly spending comparison' : 'Yearly spending comparison'}
              </p>
            </div>
          </div>
        </div>

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activePeriodData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `${currencySymbol}${v >= 1000 ? `${v/1000}k` : v}`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '16px', color: '#fff', fontSize: '12px' }}
                formatter={(val: any) => [formatCurrency(Number(val), currency)]}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Bar dataKey="myExpense" name={`${currentUser.name} Expense`} fill="#fb7185" radius={[6, 6, 0, 0]} />
              <Bar dataKey="partnerExpense" name={`${partnerName} Expense`} fill="#818cf8" radius={[6, 6, 0, 0]} />
              <Bar dataKey="togetherExpense" name="Together Total Expense" fill="#f59e0b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. GOAL DEFICIT: HOW MUCH AMOUNT IS NEEDED MORE (User Key Requirement) */}
      <div className="glass-card p-5 rounded-3xl border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Goal Deficit: Amount Needed More
              </h3>
              <p className="text-[11px] text-slate-400">Current Saved vs Remaining Amount to Target</p>
            </div>
          </div>
        </div>

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={goalDeficitData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `${currencySymbol}${v >= 1000 ? `${v/1000}k` : v}`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '16px', color: '#fff', fontSize: '12px' }}
                formatter={(val: any) => [formatCurrency(Number(val), currency)]}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Bar dataKey="saved" name="Current Saved" fill="#10b981" stackId="a" radius={[0, 0, 0, 0]} />
              <Bar dataKey="neededMore" name="Amount Needed More" fill="#f59e0b" stackId="a" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. STOCK MARKET CAPITAL SPLIT (User Key Requirement) */}
      <div className="glass-card p-5 rounded-3xl border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-blue-500/20 text-blue-400">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Individual Stock Market Capital
              </h3>
              <p className="text-[11px] text-slate-400">Equity investment portfolio distribution</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-4">
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stockCapitalData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stockCapitalData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '16px', color: '#fff', fontSize: '12px' }}
                  formatter={(val: any) => [formatCurrency(Number(val), currency)]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-3">
            {stockCapitalData.map((item, idx) => (
              <div key={idx} className="p-3 rounded-2xl bg-slate-900/80 border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs font-semibold text-slate-200">{item.name}</span>
                </div>
                <span className="text-sm font-bold text-white">{formatCurrency(item.value, currency)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. CATEGORY SPENDING PIE CHART */}
      <div className="glass-card p-5 rounded-3xl border border-white/10 space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-pink-500/20 text-pink-400">
            <PieIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Category Expense Breakdown
            </h3>
            <p className="text-[11px] text-slate-400">Where does your couple money go?</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-4">
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryChartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                >
                  {categoryChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '16px', color: '#fff', fontSize: '12px' }}
                  formatter={(val: any) => [formatCurrency(Number(val), currency)]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Slices legend list */}
          <div className="space-y-1.5 max-h-56 overflow-y-auto no-scrollbar">
            {categoryChartData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-300 font-medium truncate max-w-[120px]">{item.name}</span>
                </div>
                <span className="font-bold text-slate-200">{formatCurrency(item.value, currency)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

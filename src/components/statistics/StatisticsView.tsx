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
  CartesianGrid 
} from 'recharts';
import { 
  BarChart3, 
  PieChart as PieIcon, 
  Target, 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  Sparkles,
  Users,
  Landmark,
  Wallet
} from 'lucide-react';
import { formatCurrency, getCurrencySymbol } from '../../utils/formatters';
import { GoalStatsCard } from '../goals/GoalStatsCard';
import { CategoryExpenseBarCard } from './CategoryExpenseBarCard';
import { BudgetLimitStatsCard } from './BudgetLimitStatsCard';
import { BudgetSettingsModal } from '../dashboard/BudgetSettingsModal';

export const StatisticsView: React.FC = () => {
  const { 
    transactions, 
    categories,
    goals, 
    stocks, 
    currency, 
    currentUser, 
    partner,
    bankBalances,
    budgets,
    selectedMonth,
    getBudgetForMonth,
    exchangeRate
  } = useFinance();
  const [timeframe, setTimeframe] = useState<'monthly' | 'yearly'>('monthly');
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [budgetModalMonth, setBudgetModalMonth] = useState<string | undefined>(undefined);

  const currencySymbol = getCurrencySymbol(currency);

  const formatYAxisTick = (v: number) => {
    const scaled = currency === 'INR' ? Math.round(v * exchangeRate) : v;
    return `${currencySymbol}${scaled >= 1000 ? `${(scaled / 1000).toFixed(0)}k` : scaled}`;
  };

  // Available Net Savings for Goals plot breakdown
  const { mySavings, partnerSavings, totalSavingsTogether } = useMemo(() => {
    const incomeMap: Record<string, number> = {};
    const expenseMap: Record<string, number> = {};
    const goalContribMap: Record<string, number> = {};

    (goals || []).forEach(g => {
      (g.contributions || []).forEach(c => {
        if (c.userId) {
          goalContribMap[c.userId] = (goalContribMap[c.userId] || 0) + c.amount;
        }
      });
    });

    transactions.forEach(tx => {
      if (!tx.userId) return;
      const isGoalTx = tx.title?.startsWith('Goal Savings:') || tx.title?.includes('Goal Savings');
      if (tx.type === 'income') {
        incomeMap[tx.userId] = (incomeMap[tx.userId] || 0) + tx.amount;
      } else if (tx.type === 'expense' && !isGoalTx) {
        expenseMap[tx.userId] = (expenseMap[tx.userId] || 0) + tx.amount;
      }
    });
    const myId = currentUser?.id;
    const partnerId = partner?.id;
    const myNet = myId ? Math.max(0, (incomeMap[myId] || 0) - (expenseMap[myId] || 0) - (goalContribMap[myId] || 0)) : 0;
    const partnerNet = partnerId ? Math.max(0, (incomeMap[partnerId] || 0) - (expenseMap[partnerId] || 0) - (goalContribMap[partnerId] || 0)) : 0;
    return { mySavings: myNet, partnerSavings: partnerNet, totalSavingsTogether: myNet + partnerNet };
  }, [transactions, goals, currentUser, partner]);

  // 1. Monthly & Yearly Individual vs Together Savings & Expenses
  const { monthlyData, yearlyData } = useMemo(() => {
    const monthMap: Record<string, { month: string; myIncome: number; myExpense: number; partnerIncome: number; partnerExpense: number }> = {};
    const yearMap: Record<string, { year: string; myIncome: number; myExpense: number; partnerIncome: number; partnerExpense: number }> = {};

    transactions.forEach(t => {
      const monthKey = t.date.slice(0, 7); // "YYYY-MM"
      const yearKey = t.date.slice(0, 4);  // "YYYY"
      const isGoalTx = t.title?.startsWith('Goal Savings:') || t.title?.includes('Goal Savings');

      // Month
      if (!monthMap[monthKey]) {
        monthMap[monthKey] = { month: monthKey, myIncome: 0, myExpense: 0, partnerIncome: 0, partnerExpense: 0 };
      }
      if (t.userId === currentUser!.id) {
        if (t.type === 'income') monthMap[monthKey].myIncome += t.amount;
        else if (!isGoalTx) monthMap[monthKey].myExpense += t.amount;
      } else {
        if (t.type === 'income') monthMap[monthKey].partnerIncome += t.amount;
        else if (!isGoalTx) monthMap[monthKey].partnerExpense += t.amount;
      }

      // Year
      if (!yearMap[yearKey]) {
        yearMap[yearKey] = { year: yearKey, myIncome: 0, myExpense: 0, partnerIncome: 0, partnerExpense: 0 };
      }
      if (t.userId === currentUser!.id) {
        if (t.type === 'income') yearMap[yearKey].myIncome += t.amount;
        else if (!isGoalTx) yearMap[yearKey].myExpense += t.amount;
      } else {
        if (t.type === 'income') yearMap[yearKey].partnerIncome += t.amount;
        else if (!isGoalTx) yearMap[yearKey].partnerExpense += t.amount;
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
      const isStockOrInvestmentTx = Boolean(
        t.stockId || 
        t.title?.startsWith('Stock Investment:') || 
        t.categoryId === 'cat-investment' || 
        t.categoryName?.toLowerCase() === 'investment'
      );
      if (isStockOrInvestmentTx) return;

      if (!catMap[t.categoryName]) {
        catMap[t.categoryName] = {
          name: t.categoryName,
          value: 0,
          color: t.categoryColor || '#f43f5e',
        };
      }
      catMap[t.categoryName].value += t.amount;
    });

    const activeStocksTotal = (stocks || []).reduce((sum, s) => sum + s.investedAmount, 0);
    if (activeStocksTotal > 0) {
      catMap['Investment'] = {
        name: 'Investment',
        value: activeStocksTotal,
        color: '#3B82F6',
      };
    }

    return Object.values(catMap).sort((a, b) => b.value - a.value);
  }, [transactions, stocks]);

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
      if (s.userId === currentUser!.id) myStock += s.investedAmount;
      else partnerStock += s.investedAmount;
    });

    return [
      { name: `${currentUser!.name}'s Capital`, value: myStock, color: '#f43f5e' },
      { name: `${partner?.name || 'Partner'}'s Capital`, value: partnerStock, color: '#6366f1' },
    ];
  }, [stocks, currentUser, partner]);

  // 5. Total Bank Amount vs Period Expenses vs Goals (User Key Requirement: Pie Plot)
  const bankDistributionData = useMemo(() => {
    // Current Liquid Bank Amount
    const myInit = Number(currentUser ? (bankBalances[currentUser.id] || 0) : 0);
    const pInit = Number(partner ? (bankBalances[partner.id] || 0) : 0);
    let delta = 0;

    transactions.forEach(t => {
      const isGoalSavings = t.title?.startsWith('Goal Savings:') || t.title?.includes('Goal Savings');
      if (isGoalSavings) return;
      if (t.type === 'income') delta += t.amount;
      else if (t.type === 'expense') delta -= t.amount;
    });

    const currentBankReserves = Math.max(0, myInit + pInit + delta);

    // Period Expenses & Goals
    const filterKey = timeframe === 'monthly' ? selectedMonth : selectedMonth.slice(0, 4);

    let periodExpenses = 0;
    let periodGoalExpenses = 0;

    transactions.forEach(t => {
      if (t.date.startsWith(filterKey) && t.type === 'expense') {
        const isGoalContribution = t.title?.startsWith('Goal Savings:') || t.title?.includes('Goal Savings');
        const isGoalBill = Boolean(t.isGoalExpense || t.title?.startsWith('Goal Expense:') || t.title?.includes('Goal Expense'));

        if (isGoalBill) {
          periodGoalExpenses += t.amount;
        } else if (!isGoalContribution) {
          periodExpenses += t.amount;
        }
      }
    });

    // Goal allocations / contributions for this period
    let periodGoalContributions = 0;
    (goals || []).forEach(g => {
      (g.contributions || []).forEach(c => {
        if (c.date && c.date.startsWith(filterKey)) {
          periodGoalContributions += c.amount;
        }
      });
    });

    const totalGoalsCapital = periodGoalContributions + periodGoalExpenses;
    const totalCombined = currentBankReserves + periodExpenses + totalGoalsCapital;

    const chartData = [
      {
        name: 'Liquid Bank Reserves',
        value: currentBankReserves,
        color: '#0ea5e9', // Sky Cyan
        description: 'Remaining available in bank accounts',
      },
      {
        name: timeframe === 'monthly' ? 'Monthly Expenses' : 'Yearly Expenses',
        value: periodExpenses,
        color: '#f43f5e', // Rose
        description: 'Living spending & recurring bills',
      },
      {
        name: timeframe === 'monthly' ? 'Monthly Goals' : 'Yearly Goals',
        value: totalGoalsCapital,
        color: '#10b981', // Emerald
        description: 'Allocated to couple savings & goal expenses',
      },
    ].filter(item => item.value > 0);

    return {
      currentBankReserves,
      periodExpenses,
      totalGoalsCapital,
      totalCombined,
      chartData: chartData.length > 0 ? chartData : [
        { name: 'Liquid Bank Reserves', value: 1, color: '#0ea5e9', description: 'No activity recorded yet' }
      ],
      filterKey,
    };
  }, [bankBalances, currentUser, partner, transactions, goals, timeframe, selectedMonth]);

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

      {/* HERO PIE PLOT: BANK RESERVES vs EXPENSES vs GOALS (User Key Requirement) */}
      <div className="glass-card p-5 rounded-3xl border border-white/10 space-y-4 bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-cyan-950/30 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-cyan-500/20 text-cyan-400">
              <Landmark className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Bank Reserves vs Expenses & Goals
              </h3>
              <p className="text-[11px] text-slate-400">
                {timeframe === 'monthly' 
                  ? `Capital breakdown for ${selectedMonth}` 
                  : `Annual capital breakdown for ${selectedMonth.slice(0, 4)}`}
              </p>
            </div>
          </div>
          <span className="text-[10px] px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 font-semibold border border-cyan-500/20">
            Pie Distribution
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-4 pt-1">
          {/* Donut Pie Plot */}
          <div className="h-60 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={bankDistributionData.chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {bankDistributionData.chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '16px', color: '#fff', fontSize: '12px' }}
                  formatter={(val: any) => [formatCurrency(Number(val), currency)]}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label inside Donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] text-slate-400 font-medium">Tracked Capital</span>
              <span className="text-xs font-black text-white">
                {formatCurrency(bankDistributionData.totalCombined, currency)}
              </span>
            </div>
          </div>

          {/* Metric Breakdown Cards */}
          <div className="space-y-2.5">
            {/* 1. Liquid Bank Reserves */}
            <div className="p-3 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-3 h-3 rounded-full shrink-0 bg-[#0ea5e9]" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">Total Bank Reserves</p>
                  <p className="text-[10px] text-slate-400">Available liquid balance</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-black text-cyan-400">
                  {formatCurrency(bankDistributionData.currentBankReserves, currency)}
                </p>
                <p className="text-[10px] text-slate-400">
                  {bankDistributionData.totalCombined > 0 
                    ? `${Math.round((bankDistributionData.currentBankReserves / bankDistributionData.totalCombined) * 100)}%` 
                    : '0%'}
                </p>
              </div>
            </div>

            {/* 2. Monthly / Yearly Expenses */}
            <div className="p-3 rounded-2xl bg-rose-950/20 border border-rose-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-3 h-3 rounded-full shrink-0 bg-[#f43f5e]" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">
                    {timeframe === 'monthly' ? 'Monthly Expenses' : 'Yearly Expenses'}
                  </p>
                  <p className="text-[10px] text-slate-400">Living expenses & bills</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-black text-rose-400">
                  {formatCurrency(bankDistributionData.periodExpenses, currency)}
                </p>
                <p className="text-[10px] text-slate-400">
                  {bankDistributionData.totalCombined > 0 
                    ? `${Math.round((bankDistributionData.periodExpenses / bankDistributionData.totalCombined) * 100)}%` 
                    : '0%'}
                </p>
              </div>
            </div>

            {/* 3. Goals Capital */}
            <div className="p-3 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-3 h-3 rounded-full shrink-0 bg-[#10b981]" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">
                    {timeframe === 'monthly' ? 'Monthly Goals' : 'Yearly Goals'}
                  </p>
                  <p className="text-[10px] text-slate-400">Allocations & goal expenses</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-black text-emerald-400">
                  {formatCurrency(bankDistributionData.totalGoalsCapital, currency)}
                </p>
                <p className="text-[10px] text-slate-400">
                  {bankDistributionData.totalCombined > 0 
                    ? `${Math.round((bankDistributionData.totalGoalsCapital / bankDistributionData.totalCombined) * 100)}%` 
                    : '0%'}
                </p>
              </div>
            </div>
          </div>
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
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={formatYAxisTick} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '16px', color: '#fff', fontSize: '12px' }}
                formatter={(val: any) => [formatCurrency(Number(val), currency)]}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Bar dataKey="mySaving" name={`${currentUser!.name} Saving`} fill="#f43f5e" radius={[6, 6, 0, 0]} />
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
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={formatYAxisTick} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '16px', color: '#fff', fontSize: '12px' }}
                formatter={(val: any) => [formatCurrency(Number(val), currency)]}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Bar dataKey="myExpense" name={`${currentUser!.name} Expense`} fill="#fb7185" radius={[6, 6, 0, 0]} />
              <Bar dataKey="partnerExpense" name={`${partnerName} Expense`} fill="#818cf8" radius={[6, 6, 0, 0]} />
              <Bar dataKey="togetherExpense" name="Together Total Expense" fill="#f59e0b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. MONTHLY BUDGET LIMIT VS ACTUAL SPEND (INDIVIDUAL & COMBINED) */}
      <BudgetLimitStatsCard
        transactions={transactions}
        categories={categories}
        budgets={budgets}
        getBudgetForMonth={getBudgetForMonth}
        currency={currency}
        currentUser={currentUser}
        partner={partner}
        onOpenBudgetModal={(monthKey) => {
          setBudgetModalMonth(monthKey);
          setIsBudgetModalOpen(true);
        }}
      />

      {/* 4. GOAL DEFICIT: HOW MUCH AMOUNT IS NEEDED MORE (User Key Requirement) */}
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
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={formatYAxisTick} />
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

      {/* 5. INDIVIDUAL CATEGORY EXPENSE BREAKDOWN (BAR CHART) */}
      <CategoryExpenseBarCard
        transactions={transactions}
        categories={categories}
        currency={currency}
        currentUser={currentUser}
        partner={partner}
      />

      {/* 6. OVERALL CATEGORY DISTRIBUTION (PIE CHART) */}
      <div className="glass-card p-5 rounded-3xl border border-white/10 space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-pink-500/20 text-pink-400">
            <PieIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Category Spending Share
            </h3>
            <p className="text-[11px] text-slate-400">Macro proportion of couple expenses</p>
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

      {/* 4. Goal Savings Contribution & Progress Breakdown Plot */}
      <GoalStatsCard
        goals={goals}
        mySavings={mySavings}
        partnerSavings={partnerSavings}
        totalSavingsTogether={totalSavingsTogether}
      />

      {/* Budget Limits Settings Modal */}
      <BudgetSettingsModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        initialMonth={budgetModalMonth}
      />
    </div>
  );
};

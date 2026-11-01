import React, { useMemo, useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { 
  TrendingUp, 
  PiggyBank, 
  Target, 
  CalendarCheck, 
  ArrowUpRight, 
  ArrowDownRight, 
  Plus, 
  Users,
  ChevronRight,
  Settings2,
  Edit2,
  Flag,
  MessageSquare,
  Lock,
  StickyNote,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Check
} from 'lucide-react';
import { formatCurrency, formatDate, getGoalSavingsTitle } from '../../utils/formatters';
import { CategoryIcon } from '../common/CategoryIcon';
import { MonthNavigator } from '../common/MonthNavigator';
import { BudgetSettingsModal } from './BudgetSettingsModal';
import { BankAccountsCard } from './BankAccountsCard';
import { EditTransactionModal } from '../transactions/EditTransactionModal';
import { TransactionActivityDrawer } from '../transactions/TransactionActivityDrawer';
import { Transaction } from '../../types/finance';
import { UserAvatar } from '../common/UserAvatar';

interface DashboardViewProps {
  onOpenAddModal: () => void;
  onOpenGoalModal: () => void;
  onOpenStockModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ 
  onOpenAddModal, 
  onOpenGoalModal, 
  onOpenStockModal 
}) => {
  const { 
    currentUser, 
    partner, 
    transactions, 
    goals, 
    stocks, 
    bills, 
    currency, 
    viewMode, 
    setActiveTab,
    selectedMonth,
    budgets,
    bankBalances,
    updateBankBalance,
    updateMonthlyNote,
    getBudgetForMonth,
    toggleFlagTransaction,
    markBillAsPaid,
    vault
  } = useFinance();

  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteInput, setNoteInput] = useState('');

  // Filter transactions based on viewMode ('both' | 'me' | 'partner')
  const getTxAvatar = (tx: Transaction) => {
    return tx.userAvatar || (tx.userId === currentUser?.id ? currentUser?.avatarUrl : partner?.avatarUrl);
  };

  const filteredTxs = useMemo(() => {
    return transactions.filter(tx => {
      if (viewMode === 'me') return currentUser ? tx.userId === currentUser.id : true;
      if (viewMode === 'partner' && partner) return tx.userId === partner.id;
      return true; // 'both'
    });
  }, [transactions, viewMode, currentUser, partner]);

  // Selected month income & expenses:
  // - Goal allocations (Goal Savings) and Goal bill expenses do NOT count toward Monthly Budget Limits
  // - Goal bill expenses are tracked as Goal-based expenses for this month
  const { 
    monthlyIncome, 
    monthlyExpense, 
    monthlyGoalExpense,
    myExpense, 
    partnerExpense, 
    totalCoupleExpense 
  } = useMemo(() => {
    let income = 0;
    let expense = 0;
    let goalExp = 0;
    let myExp = 0;
    let partnerExp = 0;
    let coupleTotalExp = 0;

    // Couple-wide total expenses strictly for budget tracking (ignoring goal contributions & goal bill payments)
    transactions.forEach(t => {
      if (t.date.startsWith(selectedMonth) && t.type === 'expense') {
        const isGoalContribution = t.title?.startsWith('Goal Savings:') || t.title?.includes('Goal Savings');
        const isGoalBillExpense = Boolean(t.isGoalExpense || t.title?.startsWith('Goal Expense:') || t.title?.includes('Goal Expense'));

        if (isGoalBillExpense) {
          goalExp += t.amount;
        }

        // Budget limits strictly track everyday living expenses and regular bills
        if (!isGoalContribution && !isGoalBillExpense) {
          coupleTotalExp += t.amount;
          if (currentUser && t.userId === currentUser.id) {
            myExp += t.amount;
          } else if (partner && t.userId === partner.id) {
            partnerExp += t.amount;
          }
        }
      }
    });

    // Filtered by viewMode for headline cards
    filteredTxs.forEach(t => {
      if (t.date.startsWith(selectedMonth)) {
        if (t.type === 'income') {
          income += t.amount;
        } else if (t.type === 'expense') {
          const isGoalContribution = t.title?.startsWith('Goal Savings:') || t.title?.includes('Goal Savings');
          // Goal internal savings allocations do not count as expense
          if (!isGoalContribution) {
            expense += t.amount;
          }
        }
      }
    });

    return {
      monthlyIncome: income,
      monthlyExpense: expense,
      monthlyGoalExpense: goalExp,
      myExpense: myExp,
      partnerExpense: partnerExp,
      totalCoupleExpense: coupleTotalExp,
    };
  }, [filteredTxs, transactions, selectedMonth, currentUser, partner]);

  // Goal allocations for the selected month (deducted from Savings only)
  const monthlyGoalContributions = useMemo(() => {
    let total = 0;
    (goals || []).forEach(g => {
      (g.contributions || []).forEach(c => {
        if (c.date && c.date.startsWith(selectedMonth)) {
          if (viewMode === 'me') {
            if (currentUser && c.userId === currentUser.id) total += c.amount;
          } else if (viewMode === 'partner') {
            if (partner && c.userId === partner.id) total += c.amount;
          } else {
            total += c.amount;
          }
        }
      });
    });
    return total;
  }, [goals, selectedMonth, viewMode, currentUser, partner]);

  // Net savings = Income - Real Expenses - Goal Allocations
  const monthlySavings = monthlyIncome - monthlyExpense - monthlyGoalContributions;
  const savingsRate = monthlyIncome > 0 ? Math.round((monthlySavings / monthlyIncome) * 100) : 0;

  // Budget calculations mapped accurately by user ID and month
  const monthBudget = getBudgetForMonth(selectedMonth);
  const coupleLimit = monthBudget.coupleLimit;
  const myLimit = monthBudget.myLimit;
  const partnerLimit = monthBudget.partnerLimit;

  const couplePercent = coupleLimit > 0 ? Math.round((totalCoupleExpense / coupleLimit) * 100) : 0;
  const myPercent = myLimit > 0 ? Math.round((myExpense / myLimit) * 100) : 0;
  const partnerPercent = partnerLimit > 0 ? Math.round((partnerExpense / partnerLimit) * 100) : 0;

  // Selected month stocks total
  const monthStocks = useMemo(() => {
    let total = 0;
    let myStock = 0;
    let partnerStock = 0;

    stocks.filter(s => {
      const normalizedMonthYear = s.monthYear?.length === 7 ? s.monthYear : s.date?.slice(0, 7);
      return normalizedMonthYear === selectedMonth;
    }).forEach(s => {
      total += s.investedAmount;
      if (currentUser && s.userId === currentUser.id) {
        myStock += s.investedAmount;
      } else {
        partnerStock += s.investedAmount;
      }
    });

    return { total, myStock, partnerStock };
  }, [stocks, selectedMonth, currentUser]);

  // Upcoming bills due within 7 days or overdue
  const upcomingBills = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return bills
      .filter(b => !b.isPaid)
      .map(b => {
        const due = new Date(b.dueDate);
        due.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return { ...b, diffDays };
      })
      .filter(b => b.diffDays <= 7)
      .sort((a, b) => a.diffDays - b.diffDays);
  }, [bills]);

  // Monthly Spending Wrap-Up / Health Analytics
  const monthlyWrapUp = useMemo(() => {
    const categoryTotals: Record<string, { amount: number; color: string; icon: string }> = {};
    let totalSpent = 0;

    transactions
      .filter(t => t.date.startsWith(selectedMonth) && t.type === 'expense')
      .forEach(t => {
        totalSpent += t.amount;
        if (!categoryTotals[t.categoryName]) {
          categoryTotals[t.categoryName] = { amount: 0, color: t.categoryColor, icon: t.categoryIcon };
        }
        categoryTotals[t.categoryName].amount += t.amount;
      });

    const topCategoryEntry = Object.entries(categoryTotals).sort((a, b) => b[1].amount - a[1].amount)[0];
    const topCategory = topCategoryEntry ? {
      name: topCategoryEntry[0],
      amount: topCategoryEntry[1].amount,
      color: topCategoryEntry[1].color,
      pct: totalSpent > 0 ? Math.round((topCategoryEntry[1].amount / totalSpent) * 100) : 0,
    } : null;

    const now = new Date();
    const isCurrentMonth = selectedMonth === now.toISOString().slice(0, 7);
    const daysCount = isCurrentMonth ? Math.max(1, now.getDate()) : 30;
    const avgDailySpend = totalSpent / daysCount;

    return {
      topCategory,
      avgDailySpend,
      totalSpent,
    };
  }, [transactions, selectedMonth]);

  const activeMonthlyNote = budgets.monthlyNotes?.[selectedMonth] || '';

  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-300">
      {/* Month Navigator Header Bar */}
      <MonthNavigator />

      {/* Couple Welcome & Status Banner */}
      <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/80 border border-white/10 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-6 -ml-6 w-36 h-36 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-400">
              {viewMode === 'both' ? 'Shared Couple Balance' : viewMode === 'me' ? `${currentUser?.name || 'My'}'s Personal` : `${partner?.name || 'Partner'}'s Personal`}
            </span>
          </div>
          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/10 text-slate-300 border border-white/10 font-semibold">
            {selectedMonth}
          </span>
        </div>

        {/* Primary Savings / Net Worth Card */}
        <div className="space-y-1">
          <p className="text-xs text-slate-400 font-medium">Net Monthly Savings</p>
          <div className="flex items-baseline gap-2.5">
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {formatCurrency(monthlySavings, currency)}
            </h2>
            <span className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-lg ${
              savingsRate >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
            }`}>
              {savingsRate >= 0 ? `+${savingsRate}% saved` : `${savingsRate}%`}
            </span>
          </div>
        </div>

        {/* Income vs Expenses Stats Row */}
        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400">Total Income</p>
              <p className="text-sm sm:text-base font-bold text-emerald-400">
                {formatCurrency(monthlyIncome, currency)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
              <ArrowDownRight className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400">Total Expense</p>
              <p className="text-sm sm:text-base font-bold text-rose-400">
                {formatCurrency(monthlyExpense, currency)}
              </p>
            </div>
          </div>
        </div>

        {/* Who spent what breakdown (Collaborative transparency) */}
        {viewMode === 'both' && partner && (
          <div className="mt-3.5 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              {currentUser?.avatarUrl ? (
                <img src={currentUser.avatarUrl} alt={currentUser.name} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} className="w-5 h-5 rounded-full object-cover ring-1 ring-emerald-500" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-emerald-500/30 flex items-center justify-center ring-1 ring-emerald-500 text-[9px] font-bold text-emerald-300">{currentUser?.name?.[0]?.toUpperCase()}</div>
              )}
              <span className="text-slate-300 font-medium">{currentUser?.name}:</span>
              <span className="text-rose-400 font-bold">{formatCurrency(myExpense, currency)}</span>
            </div>
            <div className="h-3 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              {partner.avatarUrl ? (
                <img src={partner.avatarUrl} alt={partner.name} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} className="w-5 h-5 rounded-full object-cover ring-1 ring-indigo-500" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-indigo-500/30 flex items-center justify-center ring-1 ring-indigo-500 text-[9px] font-bold text-indigo-300">{partner.name?.[0]?.toUpperCase()}</div>
              )}
              <span className="text-slate-300 font-medium">{partner.name}:</span>
              <span className="text-indigo-400 font-bold">{formatCurrency(partnerExpense, currency)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Goal-Based Expenses Info Banner (if any occurred this month) */}
      {monthlyGoalExpense > 0 && (
        <div className="p-3.5 rounded-3xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-between text-xs shadow-lg">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300">
              <Target className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <p className="font-bold text-white">Goal-Based Expenses ({selectedMonth})</p>
              <p className="text-[10px] text-purple-300/80">Paid from goal savings · Excluded from budget limits</p>
            </div>
          </div>
          <span className="font-black text-purple-300 text-sm sm:text-base">
            {formatCurrency(monthlyGoalExpense, currency)}
          </span>
        </div>
      )}

      {/* Couple Bank Accounts & Live Reserves */}
      <BankAccountsCard
        currentUser={currentUser}
        partner={partner}
        currency={currency}
        bankBalances={bankBalances}
        transactions={transactions}
        updateBankBalance={updateBankBalance}
      />

      {/* Monthly Budget Limits Widget (3 Progress Cards: Couple Joint, My Spending, Partner Spending) */}
      <div className="glass-card rounded-3xl p-4.5 border border-white/10 space-y-3.5 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PiggyBank className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Monthly Budget Limits
            </span>
          </div>
          <button
            onClick={() => setIsBudgetModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all active:scale-95"
          >
            <Settings2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Set Limits</span>
          </button>
        </div>

        {/* 1. Couple Joint Budget Progress */}
        <div className="p-3 rounded-2xl bg-slate-900/70 border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-bold text-white">Couple Joint Budget</span>
            </div>
            <span className="font-semibold text-slate-300">
              {coupleLimit > 0 ? (
                <>
                  <strong className="text-white">{formatCurrency(totalCoupleExpense, currency)}</strong>
                  {' / '}
                  {formatCurrency(coupleLimit, currency)}
                </>
              ) : (
                <span className="text-slate-400 text-[11px]">No limit set (₹0)</span>
              )}
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                coupleLimit === 0
                  ? 'bg-slate-700 w-0'
                  : couplePercent > 90
                  ? 'bg-rose-500'
                  : couplePercent > 70
                  ? 'bg-amber-500'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-400'
              }`}
              style={{ width: `${coupleLimit === 0 ? 0 : Math.min(100, couplePercent)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>{coupleLimit > 0 ? `${couplePercent}% spent` : 'Tap Set Limits to configure'}</span>
            <span>
              {coupleLimit > 0 
                ? (coupleLimit >= totalCoupleExpense 
                    ? `${formatCurrency(coupleLimit - totalCoupleExpense, currency)} left to spend`
                    : `Over budget by ${formatCurrency(totalCoupleExpense - coupleLimit, currency)}`
                  )
                : `${formatCurrency(totalCoupleExpense, currency)} spent this month`
              }
            </span>
          </div>
        </div>

        {/* 2 & 3. Individual Split: My Budget & Partner Budget */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* My Budget */}
          <div className="p-3 rounded-2xl bg-slate-900/50 border border-white/5 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <UserAvatar src={currentUser?.avatarUrl} name={currentUser?.name || 'Me'} size="xs" ringColor="ring-emerald-500" />
                <span className="font-bold text-white text-[11px] truncate">{currentUser?.name || 'Me'} (Me)</span>
              </div>
              <span className="font-semibold text-[11px] text-slate-300">
                {myLimit > 0 ? `${formatCurrency(myExpense, currency)} / ${formatCurrency(myLimit, currency)}` : `${formatCurrency(myExpense, currency)} spent`}
              </span>
            </div>

            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  myLimit === 0 ? 'w-0' : myPercent > 90 ? 'bg-rose-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${myLimit === 0 ? 0 : Math.min(100, myPercent)}%` }}
            />
          </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>{myLimit > 0 ? `${myPercent}% spent` : 'No personal cap'}</span>
              <span>
                {myLimit > 0 
                  ? `${formatCurrency(Math.max(0, myLimit - myExpense), currency)} left`
                  : 'Limit: ₹0'
                }
              </span>
            </div>
          </div>

          {/* Partner Budget */}
          {partner && (
            <div className="p-3 rounded-2xl bg-slate-900/50 border border-white/5 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <UserAvatar src={partner.avatarUrl} name={partner.name} size="xs" ringColor="ring-purple-500" />
                  <span className="font-bold text-white text-[11px] truncate">{partner.name}</span>
                </div>
                <span className="font-semibold text-[11px] text-slate-300">
                  {partnerLimit > 0 ? `${formatCurrency(partnerExpense, currency)} / ${formatCurrency(partnerLimit, currency)}` : `${formatCurrency(partnerExpense, currency)} spent`}
                </span>
              </div>

              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    partnerLimit === 0 ? 'w-0' : partnerPercent > 90 ? 'bg-rose-500' : 'bg-purple-500'
                  }`}
                  style={{ width: `${partnerLimit === 0 ? 0 : Math.min(100, partnerPercent)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>{partnerLimit > 0 ? `${partnerPercent}% spent` : 'No personal cap'}</span>
                <span>
                  {partnerLimit > 0 
                    ? `${formatCurrency(Math.max(0, partnerLimit - partnerExpense), currency)} left`
                    : 'Limit: ₹0'
                  }
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stock Investment Month Card */}
      <div className="glass-card rounded-3xl p-4.5 border border-white/10 relative overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-blue-500/20 text-blue-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Stock Portfolio</h3>
              <p className="text-[11px] text-slate-400">Investments in {selectedMonth}</p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('stocks')}
            className="flex items-center text-xs font-semibold text-indigo-400 hover:text-indigo-300"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-baseline justify-between bg-slate-900/60 p-3 rounded-2xl border border-white/5">
          <div>
            <p className="text-[11px] text-slate-400">Invested This Month</p>
            <p className="text-xl font-black text-indigo-400">{formatCurrency(monthStocks.total, currency)}</p>
          </div>
          <button
            onClick={onOpenStockModal}
            className="px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-300 text-xs font-bold transition-all flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Invest</span>
          </button>
        </div>

        {/* Individual split */}
        {partner && (
          <div className="mt-2.5 flex items-center justify-around text-xs text-slate-400 px-1">
            <span>{currentUser?.name || 'Me'}: <strong className="text-slate-200">{formatCurrency(monthStocks.myStock, currency)}</strong></span>
            <span>•</span>
            <span>{partner.name}: <strong className="text-slate-200">{formatCurrency(monthStocks.partnerStock, currency)}</strong></span>
          </div>
        )}
      </div>

      {/* Finance Goals Snapshot */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Finance Goals</h3>
          </div>
          <button
            onClick={() => setActiveTab('goals')}
            className="flex items-center text-xs font-semibold text-emerald-400 hover:text-emerald-300"
          >
            <span>All Goals</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {goals.slice(0, 2).map((goal) => {
            const neededMore = Math.max(0, goal.targetAmount - goal.currentAmount);
            const progress = goal.targetAmount > 0 ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0;

            return (
              <div 
                key={goal.id} 
                onClick={() => setActiveTab('goals')}
                className="glass-card p-4 rounded-3xl border border-white/10 hover:border-emerald-500/40 cursor-pointer transition-all space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white truncate max-w-[170px]">{goal.title}</span>
                  <span className="text-xs font-black text-emerald-400">{progress}%</span>
                </div>

                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${progress}%`, backgroundColor: goal.color }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Saved: {formatCurrency(goal.currentAmount, currency)}</span>
                  <span className="text-amber-400 font-semibold">Needed: {formatCurrency(neededMore, currency)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming Bill Due Date Reminders (Next 7 Days / Overdue) */}
      <div className="glass-card p-4 rounded-3xl border border-orange-500/25 bg-gradient-to-br from-orange-950/30 via-slate-900 to-amber-950/20 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-orange-500/20 text-orange-400">
              <CalendarCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-white">Bill Due Reminders</span>
              <p className="text-[10px] text-slate-400">Dues coming up in the next 7 days</p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('bills')}
            className="text-xs font-semibold text-orange-400 hover:text-orange-300 transition-colors"
          >
            All Bills ({bills.length})
          </button>
        </div>

        {upcomingBills.length === 0 ? (
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-2.5 text-xs text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>All upcoming bills are settled for this week! Great job. 🎉</span>
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingBills.slice(0, 3).map((b) => {
              const isOverdue = b.diffDays < 0;
              const isToday = b.diffDays === 0;

              return (
                <div key={b.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/80 border border-white/5 text-xs gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-white truncate">{b.title}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                        isOverdue 
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                          : isToday 
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-orange-500/15 text-orange-300 border border-orange-500/25'
                      }`}>
                        {isOverdue ? `Overdue by ${Math.abs(b.diffDays)}d` : isToday ? 'Due Today!' : `Due in ${b.diffDays}d`}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">Due {formatDate(b.dueDate)}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-black text-orange-400 text-sm">{formatCurrency(b.amount, currency)}</span>
                    {currentUser && (
                      <button
                        onClick={() => markBillAsPaid(b.id, currentUser.id, currentUser.name)}
                        className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-md transition-all active:scale-95 flex items-center gap-1"
                        title="Mark as paid by you"
                      >
                        <Check className="w-3 h-3" />
                        <span>I Paid</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Monthly Financial Health & Wrap-Up Card */}
      <div className="glass-card p-4 rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-950/30 via-slate-900 to-purple-950/30 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-indigo-500/20 text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-white">Monthly Wrap-Up & Health</span>
              <p className="text-[10px] text-slate-400">Snapshot for {selectedMonth}</p>
            </div>
          </div>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
            savingsRate >= 30 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
            savingsRate >= 10 ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' :
            'bg-amber-500/20 text-amber-300 border border-amber-500/30'
          }`}>
            {savingsRate >= 30 ? '🟢 Strong Saver' : savingsRate >= 10 ? '🟡 Balanced' : '🟠 High Spend'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 text-xs">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-1">
            <p className="text-[10px] text-slate-400">Top Spend Category</p>
            {monthlyWrapUp.topCategory ? (
              <div>
                <p className="font-bold text-white truncate">{monthlyWrapUp.topCategory.name}</p>
                <p className="text-[11px] text-indigo-300 font-semibold mt-0.5">
                  {formatCurrency(monthlyWrapUp.topCategory.amount, currency)} ({monthlyWrapUp.topCategory.pct}%)
                </p>
              </div>
            ) : (
              <p className="text-slate-500 text-[11px]">No expenses yet</p>
            )}
          </div>

          <div className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-1">
            <p className="text-[10px] text-slate-400">Avg Daily Spend</p>
            <div>
              <p className="font-bold text-white">{formatCurrency(monthlyWrapUp.avgDailySpend, currency)}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Per day this month</p>
            </div>
          </div>
        </div>
      </div>

      {/* Shared Monthly Couple Note Card */}
      <div className="glass-card p-4 rounded-3xl border border-white/10 bg-gradient-to-br from-amber-950/20 via-slate-900 to-slate-900 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400">
              <StickyNote className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-white">Couple Finance Memo</span>
              <p className="text-[10px] text-slate-400">Shared note for {selectedMonth}</p>
            </div>
          </div>

          {!isEditingNote ? (
            <button
              onClick={() => {
                setNoteInput(activeMonthlyNote);
                setIsEditingNote(true);
              }}
              className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1 transition-all"
            >
              <Edit2 className="w-3 h-3 text-amber-400" />
              <span>{activeMonthlyNote ? 'Edit' : '+ Add Note'}</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsEditingNote(false)}
                className="px-2 py-0.5 rounded-lg text-slate-400 hover:text-white text-[11px]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  updateMonthlyNote(selectedMonth, noteInput.trim());
                  setIsEditingNote(false);
                }}
                className="px-2.5 py-1 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold shadow-sm"
              >
                Save
              </button>
            </div>
          )}
        </div>

        {isEditingNote ? (
          <div className="space-y-2">
            <textarea
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="e.g. Saving for anniversary trip next month; keep weekend eating out under ₹2,000..."
              className="w-full p-3 rounded-2xl bg-slate-900/90 border border-amber-500/40 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none h-20"
              autoFocus
            />
          </div>
        ) : (
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5 text-xs">
            {activeMonthlyNote ? (
              <p className="text-slate-200 whitespace-pre-wrap leading-relaxed">{activeMonthlyNote}</p>
            ) : (
              <p className="text-slate-500 italic">No notes set for {selectedMonth}. Tap "+ Add Note" to leave a reminder for you and {partner?.name || 'your partner'}.</p>
            )}
          </div>
        )}
      </div>

      {/* Recent Transactions List with Partner Avatars & Tap to Edit */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-white">Recent Transactions</span>
          <button
            onClick={() => setActiveTab('transactions')}
            className="flex items-center text-xs font-semibold text-slate-400 hover:text-slate-200"
          >
            <span>See All ({filteredTxs.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {filteredTxs.length === 0 ? (
          <div className="glass-card p-6 rounded-2xl border border-white/5 text-center space-y-2">
            <p className="text-xs text-slate-400">No transactions recorded yet</p>
            <button
              onClick={onOpenAddModal}
              className="px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 text-xs font-bold transition-all inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record First Expense</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredTxs.slice(0, 5).map((tx) => {
              const isMyTx = tx.userId === currentUser?.id;
              const isExpanded = expandedTxId === tx.id;
              const isFlagged = Boolean(tx.isFlagged);
              const commentsCount = tx.comments?.length || 0;
              const { displayTitle, isGoalSavings } = getGoalSavingsTitle(tx);

              return (
                <div
                  key={tx.id}
                  className={`glass-card p-3 rounded-2xl border transition-all ${
                    isFlagged 
                      ? 'border-amber-500/40 bg-amber-950/10' 
                      : isExpanded 
                      ? 'border-indigo-500/40 bg-slate-900/90' 
                      : isGoalSavings
                      ? 'border-emerald-500/20 bg-emerald-950/5 hover:border-emerald-500/30'
                      : 'border-white/5 hover:border-white/10'
                  }`}
                >
                  <div
                    onClick={() => {
                      if (isGoalSavings) {
                        setExpandedTxId(isExpanded ? null : tx.id);
                      } else if (isMyTx) {
                        setEditingTransaction(tx);
                      } else {
                        setExpandedTxId(isExpanded ? null : tx.id);
                      }
                    }}
                    className="flex items-center justify-between gap-3 cursor-pointer"
                    title={
                      isGoalSavings
                        ? "Tap to view goal details & discussion"
                        : isMyTx 
                        ? "Tap to edit (or use comment button below)" 
                        : "Tap to view discussion & comments"
                    }
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                        style={{ 
                          backgroundColor: isGoalSavings ? 'rgba(16, 185, 129, 0.15)' : `${tx.categoryColor}25`, 
                          color: isGoalSavings ? '#10B981' : tx.categoryColor 
                        }}
                      >
                        <CategoryIcon name={isGoalSavings ? 'Target' : tx.categoryIcon} size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                          <p className="text-xs font-bold text-white truncate max-w-[130px] sm:max-w-xs">{displayTitle}</p>
                          {isGoalSavings && (
                            <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold flex items-center gap-1 shrink-0">
                              <Target className="w-2.5 h-2.5" />
                              <span>Goal</span>
                            </span>
                          )}
                          {(tx.isGoalExpense || tx.title?.startsWith('Goal Expense:')) && (
                            <span className="px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] font-bold flex items-center gap-1 shrink-0">
                              <Target className="w-2.5 h-2.5" />
                              <span>Goal Expense</span>
                            </span>
                          )}
                          {isFlagged && (
                            <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-bold flex items-center gap-1 shrink-0">
                              <Flag className="w-2.5 h-2.5 fill-amber-400" />
                              <span>Flagged</span>
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5 truncate">
                          <span>{formatDate(tx.date)}</span>
                          {tx.paymentMethod && tx.paymentMethod !== 'None' && (
                            <>
                              <span>•</span>
                              <span className="text-slate-300 font-medium">{tx.paymentMethod}</span>
                            </>
                          )}
                          <span>•</span>
                          <span className={isGoalSavings ? "text-emerald-400 font-medium" : "text-slate-400 font-medium"}>
                            {isGoalSavings ? "Goal Allocation" : tx.categoryName}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p className={`text-xs font-black ${
                          tx.type === 'income' ? 'text-emerald-400' : isGoalSavings ? 'text-emerald-300' : 'text-slate-200'
                        }`}>
                          {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, currency)}
                        </p>
                        <div className="flex items-center justify-end gap-1 mt-1">
                          {getTxAvatar(tx) && (
                            <img src={getTxAvatar(tx)} alt={tx.userName} className="w-3.5 h-3.5 rounded-full object-cover" />
                          )}
                          <span className="text-[10px] text-slate-400">{tx.userName}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 pl-1">
                        {/* Flag Button (1-tap toggle) */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFlagTransaction(tx.id);
                          }}
                          className={`p-1.5 rounded-lg transition-all ${
                            isFlagged
                              ? 'text-amber-400 bg-amber-500/15 hover:bg-amber-500/25 ring-1 ring-amber-500/30'
                              : 'text-slate-400 hover:text-amber-400 hover:bg-amber-500/10'
                          }`}
                          title={isFlagged ? "Resolve flag" : "Flag for review"}
                        >
                          <Flag className={`w-3.5 h-3.5 ${isFlagged ? 'fill-amber-400' : ''}`} />
                        </button>

                        {/* Comments Toggle */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedTxId(isExpanded ? null : tx.id);
                          }}
                          className={`p-1.5 rounded-lg transition-all flex items-center gap-1 ${
                            isExpanded 
                              ? 'text-indigo-400 bg-indigo-500/20 ring-1 ring-indigo-500/40' 
                              : commentsCount > 0 
                              ? 'text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20' 
                              : 'text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10'
                          }`}
                          title="View comments & discussion"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          {commentsCount > 0 && (
                            <span className="text-[9px] font-bold px-1 rounded-full bg-indigo-500 text-white">
                              {commentsCount}
                            </span>
                          )}
                        </button>

                        {isMyTx ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTransaction(tx);
                            }}
                            className="p-1 rounded-lg text-slate-500 hover:text-indigo-400 transition-colors"
                            title="Edit transaction details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <div className="p-1 text-slate-600" title={`Recorded by ${tx.userName} (Read-only)`}>
                            <Lock className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Inline Collapsible Activity Drawer */}
                  {isExpanded && (
                    <TransactionActivityDrawer transaction={tx} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Transaction Modal */}
      <EditTransactionModal
        transaction={editingTransaction}
        isOpen={Boolean(editingTransaction)}
        onClose={() => setEditingTransaction(null)}
      />

      {/* Budget Limits Settings Modal */}
      <BudgetSettingsModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        initialMonth={selectedMonth}
      />
    </div>
  );
};

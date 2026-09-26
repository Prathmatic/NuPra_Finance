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
  Edit2
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { CategoryIcon } from '../common/CategoryIcon';
import { MonthNavigator } from '../common/MonthNavigator';
import { BudgetSettingsModal } from './BudgetSettingsModal';
import { EditTransactionModal } from '../transactions/EditTransactionModal';
import { Transaction } from '../../types/finance';

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
    budgets
  } = useFinance();

  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

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

  // Selected month income & expenses
  const { monthlyIncome, monthlyExpense, myExpense, partnerExpense, totalCoupleExpense } = useMemo(() => {
    let income = 0;
    let expense = 0;
    let myExp = 0;
    let partnerExp = 0;
    let coupleTotalExp = 0;

    transactions.forEach(t => {
      if (t.date.startsWith(selectedMonth)) {
        if (t.type === 'expense') {
          coupleTotalExp += t.amount;
        }
      }
    });

    filteredTxs.forEach(t => {
      if (t.date.startsWith(selectedMonth)) {
        if (t.type === 'income') {
          income += t.amount;
        } else {
          expense += t.amount;
          if (currentUser && t.userId === currentUser.id) {
            myExp += t.amount;
          } else {
            partnerExp += t.amount;
          }
        }
      }
    });

    return {
      monthlyIncome: income,
      monthlyExpense: expense,
      myExpense: myExp,
      partnerExpense: partnerExp,
      totalCoupleExpense: coupleTotalExp,
    };
  }, [filteredTxs, transactions, selectedMonth, currentUser]);

  const monthlySavings = monthlyIncome - monthlyExpense;
  const savingsRate = monthlyIncome > 0 ? Math.round((monthlySavings / monthlyIncome) * 100) : 0;

  // Budget calculations
  const coupleLimit = budgets.couple || 0;
  const myLimit = budgets.me || 0;
  const partnerLimit = budgets.partner || 0;

  const couplePercent = coupleLimit > 0 ? Math.round((totalCoupleExpense / coupleLimit) * 100) : 0;
  const myPercent = myLimit > 0 ? Math.round((myExpense / myLimit) * 100) : 0;
  const partnerPercent = partnerLimit > 0 ? Math.round((partnerExpense / partnerLimit) * 100) : 0;

  // Selected month stocks total
  const monthStocks = useMemo(() => {
    let total = 0;
    let myStock = 0;
    let partnerStock = 0;

    stocks.filter(s => s.monthYear === selectedMonth).forEach(s => {
      total += s.investedAmount;
      if (s.userId === currentUser!.id) {
        myStock += s.investedAmount;
      } else {
        partnerStock += s.investedAmount;
      }
    });

    return { total, myStock, partnerStock };
  }, [stocks, selectedMonth, currentUser]);

  // Pending bills
  const pendingBills = useMemo(() => {
    return bills.filter(b => !b.isPaid).slice(0, 2);
  }, [bills]);

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
              {viewMode === 'both' ? 'Shared Couple Balance' : viewMode === 'me' ? `${currentUser!.name}'s Personal` : `${partner?.name}'s Personal`}
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
              <img src={currentUser!.avatarUrl} alt={currentUser!.name} className="w-5 h-5 rounded-full object-cover ring-1 ring-emerald-500" />
              <span className="text-slate-300 font-medium">{currentUser!.name}:</span>
              <span className="text-rose-400 font-bold">{formatCurrency(myExpense, currency)}</span>
            </div>
            <div className="h-3 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <img src={partner.avatarUrl} alt={partner.name} className="w-5 h-5 rounded-full object-cover ring-1 ring-indigo-500" />
              <span className="text-slate-300 font-medium">{partner.name}:</span>
              <span className="text-indigo-400 font-bold">{formatCurrency(partnerExpense, currency)}</span>
            </div>
          </div>
        )}
      </div>

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
                <img src={currentUser?.avatarUrl || ''} alt={currentUser?.name || 'User'} className="w-4 h-4 rounded-full object-cover ring-1 ring-emerald-500 shrink-0" />
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
                  <img src={partner.avatarUrl} alt={partner.name} className="w-4 h-4 rounded-full object-cover ring-1 ring-purple-500 shrink-0" />
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
            <span>{currentUser!.name}: <strong className="text-slate-200">{formatCurrency(monthStocks.myStock, currency)}</strong></span>
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
            const progress = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));

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

      {/* Upcoming Unpaid Bills */}
      {pendingBills.length > 0 && (
        <div className="glass-card p-4 rounded-3xl border border-orange-500/20 bg-orange-950/20">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-orange-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-orange-300">Upcoming Bills</span>
            </div>
            <button
              onClick={() => setActiveTab('bills')}
              className="text-xs font-semibold text-orange-400 hover:text-orange-300"
            >
              Manage Bills
            </button>
          </div>

          <div className="space-y-2">
            {pendingBills.map((b) => (
              <div key={b.id} className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-900/80 border border-white/5 text-xs">
                <div>
                  <p className="font-semibold text-white">{b.title}</p>
                  <p className="text-[10px] text-slate-400">Due {formatDate(b.dueDate)}</p>
                </div>
                <span className="font-bold text-orange-400">{formatCurrency(b.amount, currency)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
          <div className="space-y-2">
            {filteredTxs.slice(0, 5).map((tx) => (
              <div
                key={tx.id}
                onClick={() => setEditingTransaction(tx)}
                className="glass-card p-3 rounded-2xl border border-white/5 flex items-center justify-between hover:bg-slate-800/60 hover:border-white/10 cursor-pointer transition-all group"
                title="Tap to edit this transaction"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${tx.categoryColor}25`, color: tx.categoryColor }}
                  >
                    <CategoryIcon name={tx.categoryIcon} size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate max-w-[150px] sm:max-w-xs">{tx.title}</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                      <span>{formatDate(tx.date)}</span>
                      {tx.paymentMethod && tx.paymentMethod !== 'None' && (
                        <>
                          <span>•</span>
                          <span className="text-slate-300 font-medium">{tx.paymentMethod}</span>
                        </>
                      )}
                      <span>•</span>
                      <span className="text-slate-400 font-medium">{tx.categoryName}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className={`text-xs font-black ${
                      tx.type === 'income' ? 'text-emerald-400' : 'text-slate-200'
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

                  <div className="p-1 rounded-lg text-slate-500 group-hover:text-indigo-400 transition-colors opacity-0 group-hover:opacity-100">
                    <Edit2 className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            ))}
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
      />
    </div>
  );
};

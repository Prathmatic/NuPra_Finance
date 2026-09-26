import React, { useState, useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { 
  Search, 
  Filter, 
  Trash2, 
  Edit2,
  Plus,
  X,
  FileText
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { CategoryIcon } from '../common/CategoryIcon';
import { MonthNavigator } from '../common/MonthNavigator';
import { EditTransactionModal } from './EditTransactionModal';
import { ExportStatementModal } from './ExportStatementModal';
import { Transaction } from '../../types/finance';

interface TransactionsViewProps {
  onOpenAddModal: () => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({ onOpenAddModal }) => {
  const { 
    transactions, 
    categories, 
    currency, 
    currentUser, 
    partner, 
    deleteTransaction,
    selectedMonth 
  } = useFinance();

  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<'all' | 'me' | 'partner'>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'expense' | 'income'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPayment, setSelectedPayment] = useState<string>('all');
  const [isAllTime, setIsAllTime] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const getTxAvatar = (tx: Transaction) => {
    return tx.userAvatar || (tx.userId === currentUser?.id ? currentUser?.avatarUrl : partner?.avatarUrl);
  };

  // Filter logic
  const filteredList = useMemo(() => {
    return transactions.filter(t => {
      // Search
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesTitle = t.title.toLowerCase().includes(query);
        const matchesCategory = t.categoryName.toLowerCase().includes(query);
        const matchesPayment = t.paymentMethod?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesCategory && !matchesPayment) return false;
      }

      // User filter
      if (selectedUser === 'me' && t.userId !== currentUser!.id) return false;
      if (selectedUser === 'partner' && partner && t.userId !== partner.id) return false;

      // Type filter
      if (selectedType !== 'all' && t.type !== selectedType) return false;

      // Category filter
      if (selectedCategory !== 'all' && t.categoryId !== selectedCategory) return false;

      // Payment Method
      if (selectedPayment !== 'all') {
        if (selectedPayment === 'None' && t.paymentMethod && t.paymentMethod !== 'None') return false;
        if (selectedPayment !== 'None' && t.paymentMethod !== selectedPayment) return false;
      }

      // Month filter (only if not viewing all time)
      if (!isAllTime && !t.date.startsWith(selectedMonth)) return false;

      return true;
    });
  }, [
    transactions, 
    search, 
    selectedUser, 
    selectedType, 
    selectedCategory, 
    selectedPayment, 
    isAllTime, 
    selectedMonth, 
    currentUser, 
    partner
  ]);

  // Aggregate totals for the filtered subset
  const { totalFilteredIncome, totalFilteredExpense } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    filteredList.forEach(t => {
      if (t.type === 'income') inc += t.amount;
      else exp += t.amount;
    });
    return { totalFilteredIncome: inc, totalFilteredExpense: exp };
  }, [filteredList]);

  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-300">
      {/* Global Month Navigator Bar */}
      <MonthNavigator 
        showAllTimeOption={true}
        isAllTime={isAllTime}
        onToggleAllTime={() => setIsAllTime(!isAllTime)}
      />

      {/* Search & Filter Bar */}
      <div className="glass-card p-3 rounded-2xl border border-white/10 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search expenses, labels, notes..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500 placeholder:text-slate-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-semibold ${
              showFilters || selectedCategory !== 'all' || selectedPayment !== 'all' || selectedUser !== 'all'
                ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                : 'bg-slate-900/80 border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
          </button>

          <button
            onClick={() => setIsExportOpen(true)}
            className="p-2 px-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-indigo-300 hover:text-white font-semibold text-xs transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
            title="Export bank statement (CSV or PDF)"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Statement</span>
          </button>

          <button
            onClick={onOpenAddModal}
            className="p-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 text-white font-bold text-xs shadow-md hover:opacity-90 flex items-center gap-1 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add</span>
          </button>
        </div>

        {/* Quick Type Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs pt-1">
          <button
            onClick={() => setSelectedType('all')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              selectedType === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All Types
          </button>
          <button
            onClick={() => setSelectedType('expense')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              selectedType === 'expense' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Expenses Only
          </button>
          <button
            onClick={() => setSelectedType('income')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              selectedType === 'income' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Income Only
          </button>
        </div>

        {/* Expanded Filters Drawer */}
        {showFilters && (
          <div className="pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs animate-in fade-in duration-150">
            {/* User Filter */}
            <div>
              <label className="block text-[11px] text-slate-400 font-semibold mb-1">User</label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value as any)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white text-xs"
              >
                <option value="all">Everyone (Couple)</option>
                <option value="me">{currentUser!.name} (Me)</option>
                {partner && <option value="partner">{partner.name} (Partner)</option>}
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-[11px] text-slate-400 font-semibold mb-1">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white text-xs"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Method Filter */}
            <div>
              <label className="block text-[11px] text-slate-400 font-semibold mb-1">Payment Method</label>
              <select
                value={selectedPayment}
                onChange={(e) => setSelectedPayment(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white text-xs"
              >
                <option value="all">All Payment Methods</option>
                <option value="None">None / Not Specified</option>
                <option value="UPI / Pix">UPI / Pix</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cash">Cash</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Filter Summary Stats */}
      <div className="flex items-center justify-between px-1 text-xs text-slate-400">
        <span>{filteredList.length} transactions found</span>
        <div className="flex items-center gap-3">
          <span className="text-emerald-400 font-semibold">+{formatCurrency(totalFilteredIncome, currency)}</span>
          <span className="text-rose-400 font-semibold">-{formatCurrency(totalFilteredExpense, currency)}</span>
        </div>
      </div>

      {/* Transaction Records List */}
      {filteredList.length === 0 ? (
        <div className="glass-card p-8 rounded-3xl text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
            <Filter className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-white">No transactions in this period</p>
          <p className="text-xs text-slate-400">Try switching months or adjusting your search filters.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredList.map((tx) => (
            <div
              key={tx.id}
              onClick={() => setEditingTx(tx)}
              className="glass-card p-3 rounded-2xl border border-white/5 flex items-center justify-between hover:bg-slate-800/60 hover:border-white/15 cursor-pointer transition-all group"
              title="Click to edit this transaction"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${tx.categoryColor}25`, color: tx.categoryColor }}
                >
                  <CategoryIcon name={tx.categoryIcon} size={18} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white truncate max-w-[150px] sm:max-w-xs">{tx.title}</p>
                    <span 
                      className="text-[9px] px-1.5 py-0.5 rounded-md font-semibold"
                      style={{ backgroundColor: `${tx.categoryColor}20`, color: tx.categoryColor }}
                    >
                      {tx.categoryName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                    <span>{formatDate(tx.date)}</span>
                    {tx.paymentMethod && tx.paymentMethod !== 'None' && (
                      <>
                        <span>•</span>
                        <span>{tx.paymentMethod}</span>
                      </>
                    )}
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
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    {getTxAvatar(tx) && (
                      <img src={getTxAvatar(tx)} alt={tx.userName} className="w-3.5 h-3.5 rounded-full object-cover" />
                    )}
                    <span className="text-[10px] text-slate-400">{tx.userName}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingTx(tx);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"
                    title="Edit transaction"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTransaction(tx.id);
                    }}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"
                    title="Delete transaction"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Transaction Modal */}
      <EditTransactionModal
        transaction={editingTx}
        isOpen={Boolean(editingTx)}
        onClose={() => setEditingTx(null)}
      />

      {/* Export Statement Modal */}
      <ExportStatementModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />
    </div>
  );
};

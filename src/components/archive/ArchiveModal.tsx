import React, { useState, useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { ArchiveItemType, ArchivedItem, Transaction, FinanceGoal, StockInvestment, BillItem, CurrencyCode } from '../../types/finance';
import { formatCurrency } from '../../utils/formatters';
import { 
  Archive, 
  Trash2, 
  RotateCcw, 
  Search, 
  X, 
  Clock, 
  Receipt, 
  Target, 
  TrendingUp, 
  CreditCard,
  AlertCircle,
  ShieldAlert
} from 'lucide-react';

interface ArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: ArchiveItemType | 'all';
}

type UnifiedArchivedItem = {
  type: ArchiveItemType;
  id: string;
  title: string;
  amount?: number;
  currency?: CurrencyCode;
  deletedAt: string;
  deletedByUserName: string;
  expiresAt: string;
  subtitle?: string;
  raw: ArchivedItem<any>;
};

export const ArchiveModal: React.FC<ArchiveModalProps> = ({ isOpen, onClose, initialType = 'all' }) => {
  const { 
    archive, 
    restoreFromArchive, 
    permanentDeleteFromArchive, 
    emptyArchive, 
    currency 
  } = useFinance();

  const [activeTab, setActiveTab] = useState<ArchiveItemType | 'all'>(initialType);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmEmptyOpen, setConfirmEmptyOpen] = useState(false);
  const [itemToDeleteForever, setItemToDeleteForever] = useState<{ type: ArchiveItemType; id: string; title: string } | null>(null);

  // Normalize all archive arrays into a single chronological feed
  const unifiedItems: UnifiedArchivedItem[] = useMemo(() => {
    const list: UnifiedArchivedItem[] = [];

    (archive.transactions || []).forEach(a => {
      const tx = a.item as Transaction;
      list.push({
        type: 'transaction',
        id: tx.id,
        title: tx.title || 'Untitled Transaction',
        amount: tx.amount,
        currency,
        deletedAt: a.deletedAt,
        deletedByUserName: a.deletedByUserName || 'Unknown',
        expiresAt: a.expiresAt,
        subtitle: `${tx.categoryName || 'General'} · ${tx.date || ''} · Added by ${tx.userName || 'Unknown'}`,
        raw: a,
      });
    });

    (archive.goals || []).forEach(a => {
      const g = a.item as FinanceGoal;
      list.push({
        type: 'goal',
        id: g.id,
        title: g.title || 'Untitled Goal',
        amount: g.targetAmount,
        currency,
        deletedAt: a.deletedAt,
        deletedByUserName: a.deletedByUserName || 'Unknown',
        expiresAt: a.expiresAt,
        subtitle: `Saved ${formatCurrency(g.currentAmount || 0, currency)} of ${formatCurrency(g.targetAmount, currency)}`,
        raw: a,
      });
    });

    (archive.stocks || []).forEach(a => {
      const s = a.item as StockInvestment;
      list.push({
        type: 'stock',
        id: s.id,
        title: s.ticker ? `${s.ticker} - ${s.assetName}` : s.assetName,
        amount: s.investedAmount,
        currency,
        deletedAt: a.deletedAt,
        deletedByUserName: a.deletedByUserName || 'Unknown',
        expiresAt: a.expiresAt,
        subtitle: `${s.shares ? `${s.shares} shares · ` : ''}${s.monthYear || s.date} · Added by ${s.userName}`,
        raw: a,
      });
    });

    (archive.bills || []).forEach(a => {
      const b = a.item as BillItem;
      list.push({
        type: 'bill',
        id: b.id,
        title: b.title || 'Untitled Bill',
        amount: b.amount,
        currency,
        deletedAt: a.deletedAt,
        deletedByUserName: a.deletedByUserName || 'Unknown',
        expiresAt: a.expiresAt,
        subtitle: `${b.categoryName || 'General'} · Due ${b.dueDate || 'N/A'} · ${b.isPaid ? 'Was Paid' : 'Unpaid'}`,
        raw: a,
      });
    });

    // Sort by deletedAt descending (most recently deleted first)
    return list.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
  }, [archive, currency]);

  // Counts per tab
  const counts = useMemo(() => ({
    all: unifiedItems.length,
    transaction: (archive.transactions || []).length,
    goal: (archive.goals || []).length,
    stock: (archive.stocks || []).length,
    bill: (archive.bills || []).length,
  }), [unifiedItems, archive]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return unifiedItems.filter(item => {
      if (activeTab !== 'all' && item.type !== activeTab) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
        item.deletedByUserName.toLowerCase().includes(q)
      );
    });
  }, [unifiedItems, activeTab, searchQuery]);

  if (!isOpen) return null;

  const getDaysRemaining = (expiresAtStr: string) => {
    const diffMs = new Date(expiresAtStr).getTime() - Date.now();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const getDeletedAgo = (deletedAtStr: string) => {
    const diffMs = Date.now() - new Date(deletedAtStr).getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days}d ago`;
  };

  const getTypeBadge = (type: ArchiveItemType) => {
    switch (type) {
      case 'transaction':
        return (
          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-semibold">
            <CreditCard className="w-2.5 h-2.5" />
            Transaction
          </span>
        );
      case 'goal':
        return (
          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/25 font-semibold">
            <Target className="w-2.5 h-2.5" />
            Goal
          </span>
        );
      case 'stock':
        return (
          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/25 font-semibold">
            <TrendingUp className="w-2.5 h-2.5" />
            Investment
          </span>
        );
      case 'bill':
        return (
          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25 font-semibold">
            <Receipt className="w-2.5 h-2.5" />
            Bill
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl bg-slate-900 border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-slate-950/60 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">Archive & Trash</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/10 font-medium">
                  {counts.all} items
                </span>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3 text-slate-500" />
                Items are auto-purged after 1 year (365 days)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Tabs */}
        <div className="p-4 border-b border-white/5 bg-slate-900/80 space-y-3 shrink-0">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search deleted items..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950/70 border border-white/10 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {[
              { id: 'all', label: 'All', count: counts.all },
              { id: 'transaction', label: 'Transactions', count: counts.transaction },
              { id: 'goal', label: 'Goals', count: counts.goal },
              { id: 'stock', label: 'Stocks', count: counts.stock },
              { id: 'bill', label: 'Bills', count: counts.bill },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-900 text-slate-400'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Content Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 no-scrollbar">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-14 h-14 rounded-full bg-slate-800/60 border border-white/10 flex items-center justify-center text-slate-500 mb-3">
                <Archive className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-300">
                {searchQuery ? 'No matching items found' : 'Trash is empty'}
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                {searchQuery 
                  ? 'Try a different search keyword or switch tabs' 
                  : 'Deleted transactions, bills, goals, and stocks will appear here for 1 year before automatic purging.'}
              </p>
            </div>
          ) : (
            filteredItems.map(item => {
              const daysLeft = getDaysRemaining(item.expiresAt);
              const deletedAgo = getDeletedAgo(item.deletedAt);

              return (
                <div
                  key={`${item.type}-${item.id}`}
                  className="group relative p-3 sm:p-3.5 rounded-2xl bg-slate-950/50 border border-white/5 hover:border-white/15 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm hover:shadow-md"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getTypeBadge(item.type)}
                      <h4 className="text-xs sm:text-sm font-bold text-slate-200 truncate">
                        {item.title}
                      </h4>
                      {item.amount !== undefined && (
                        <span className="text-xs font-bold text-white bg-slate-800/80 px-2 py-0.5 rounded-lg border border-white/10 ml-auto sm:ml-0">
                          {formatCurrency(item.amount, item.currency || currency)}
                        </span>
                      )}
                    </div>

                    {item.subtitle && (
                      <p className="text-[11px] text-slate-400 truncate">
                        {item.subtitle}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-[10px] text-slate-500 pt-0.5">
                      <span>Deleted {deletedAgo} by <strong className="text-slate-400 font-medium">{item.deletedByUserName}</strong></span>
                      <span>·</span>
                      <span className={daysLeft <= 14 ? 'text-amber-400 font-semibold' : ''}>
                        Expires in {daysLeft}d
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-1 sm:pt-0">
                    <button
                      onClick={() => restoreFromArchive(item.type, item.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all active:scale-95"
                      title="Restore back to active state"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore</span>
                    </button>
                    <button
                      onClick={() => setItemToDeleteForever({ type: item.type, id: item.id, title: item.title })}
                      className="flex items-center gap-1.5 p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Delete permanently"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {counts.all > 0 && (
          <div className="p-3 sm:p-4 border-t border-white/10 bg-slate-950/60 backdrop-blur-md flex items-center justify-between shrink-0">
            <span className="text-xs text-slate-500">
              Showing {filteredItems.length} of {counts.all} items
            </span>
            <button
              onClick={() => setConfirmEmptyOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-all active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Empty Archive</span>
            </button>
          </div>
        )}

        {/* Confirmation Modal for Permanent Delete of 1 item */}
        {itemToDeleteForever && (
          <div className="absolute inset-0 z-20 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="max-w-sm w-full p-5 rounded-2xl bg-slate-900 border border-rose-500/30 text-center space-y-4 shadow-2xl">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Permanently Delete?</h4>
                <p className="text-xs text-slate-400 mt-1">
                  "{itemToDeleteForever.title}" will be deleted forever and cannot be recovered.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => setItemToDeleteForever(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    permanentDeleteFromArchive(itemToDeleteForever.type, itemToDeleteForever.id);
                    setItemToDeleteForever(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/30"
                >
                  Delete Forever
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal for Empty Entire Archive */}
        {confirmEmptyOpen && (
          <div className="absolute inset-0 z-20 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="max-w-sm w-full p-5 rounded-2xl bg-slate-900 border border-rose-500/30 text-center space-y-4 shadow-2xl">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Empty Archive?</h4>
                <p className="text-xs text-slate-400 mt-1">
                  All {counts.all} archived items will be permanently erased. This action cannot be reversed.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => setConfirmEmptyOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    emptyArchive();
                    setConfirmEmptyOpen(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/30"
                >
                  Yes, Empty All
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

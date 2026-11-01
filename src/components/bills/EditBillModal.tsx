import React, { useState, useEffect } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { 
  X, 
  CalendarCheck, 
  Edit3, 
  Users, 
  User, 
  Clock,
  Sparkles
} from 'lucide-react';
import { BillItem } from '../../types/finance';
import { formatCurrency, getCurrencySymbol } from '../../utils/formatters';

interface EditBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: BillItem | null;
}

const CATEGORIES = [
  { name: 'Utilities', color: '#f59e0b' },
  { name: 'Rent & Housing', color: '#6366f1' },
  { name: 'Subscriptions & Streaming', color: '#ec4899' },
  { name: 'Groceries & Household', color: '#10b981' },
  { name: 'Insurance & Healthcare', color: '#06b6d4' },
  { name: 'Internet & Mobile', color: '#8b5cf6' },
  { name: 'Loan & EMI', color: '#ef4444' },
  { name: 'Other Dues', color: '#64748b' },
];

export const EditBillModal: React.FC<EditBillModalProps> = ({ isOpen, onClose, bill }) => {
  const { currency, updateBill, convertInputToBase, exchangeRate } = useFinance();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [categoryName, setCategoryName] = useState('Utilities');
  const [recurring, setRecurring] = useState<'none' | 'monthly' | 'yearly'>('monthly');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (bill && isOpen) {
      setTitle(bill.title);
      // bill.amount is in EUR base; if currency is INR, multiply by exchangeRate
      const displayAmt = currency === 'INR' ? Math.round(bill.amount * exchangeRate) : Math.round(bill.amount * 100) / 100;
      setAmount(String(displayAmt));
      setDueDate(bill.dueDate);
      setCategoryName(bill.categoryName || 'Utilities');
      setRecurring(bill.recurring || 'monthly');
      setNotes(bill.notes || '');
    }
  }, [bill, isOpen, currency, exchangeRate]);

  if (!isOpen || !bill) return null;

  const parsedAmount = parseFloat(amount) || 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || parsedAmount <= 0) return;

    const baseAmount = convertInputToBase(parsedAmount);
    const catColor = CATEGORIES.find(c => c.name === categoryName)?.color || '#64748b';

    const updated: BillItem = {
      ...bill,
      title: title.trim(),
      amount: baseAmount,
      dueDate,
      categoryName,
      categoryColor: catColor,
      recurring,
      notes: notes.trim() || undefined,
    };

    updateBill(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg glass-card border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl relative my-auto bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950/50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">Edit Bill</h2>
              <p className="text-xs text-slate-400">Update due date, amount or recurring settings</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Bill / Due Name
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Electricity, WiFi, Rent"
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-800/80 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50 text-sm font-semibold transition-all"
            />
          </div>

          {/* Amount & Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Amount ({getCurrencySymbol(currency)})
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                  {getCurrencySymbol(currency)}
                </span>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3 py-2.5 rounded-2xl bg-slate-800/80 border border-white/10 text-white font-bold text-sm focus:outline-none focus:border-orange-500/50 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Due Date
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-2xl bg-slate-800/80 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-orange-500/50 transition-all"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setCategoryName(cat.name)}
                  className={`px-2.5 py-2 rounded-xl text-[11px] font-bold border transition-all truncate text-left flex items-center gap-1.5 ${
                    categoryName === cat.name
                      ? 'bg-orange-500/20 text-orange-300 border-orange-500/40 shadow-sm'
                      : 'bg-slate-800/50 text-slate-400 border-white/5 hover:bg-slate-800'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="truncate">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Recurring Cycle */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Renewal Cycle
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'monthly', label: 'Monthly' },
                { id: 'yearly', label: 'Yearly' },
                { id: 'none', label: 'One-time' },
              ].map((cycle) => (
                <button
                  key={cycle.id}
                  type="button"
                  onClick={() => setRecurring(cycle.id as any)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                    recurring === cycle.id
                      ? 'bg-orange-600 text-white border-orange-500 shadow-md'
                      : 'bg-slate-800/50 text-slate-400 border-white/5 hover:bg-slate-800'
                  }`}
                >
                  {cycle.label}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Account number, payment reference"
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-800/80 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50 text-xs transition-all"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-all active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white text-xs font-bold shadow-lg shadow-orange-500/25 transition-all active:scale-95"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

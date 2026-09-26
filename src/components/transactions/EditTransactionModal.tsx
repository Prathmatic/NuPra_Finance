import React, { useState, useEffect } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { 
  X, 
  Check, 
  Trash2, 
  ArrowDownCircle, 
  ArrowUpCircle,
  Users
} from 'lucide-react';
import { Transaction, PaymentMethod } from '../../types/finance';
import { CategoryDropdown } from '../categories/CategoryDropdown';
import { getCurrencySymbol } from '../../utils/formatters';

interface EditTransactionModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
}

const PAYMENT_METHODS: { label: string; value: PaymentMethod }[] = [
  { label: 'None / Not specified', value: 'None' },
  { label: 'UPI / Pix', value: 'UPI / Pix' },
  { label: 'Credit Card', value: 'Credit Card' },
  { label: 'Debit Card', value: 'Debit Card' },
  { label: 'Bank Transfer', value: 'Bank Transfer' },
  { label: 'Cash', value: 'Cash' },
  { label: 'Crypto', value: 'Crypto' },
  { label: 'Other', value: 'Other' },
];

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  transaction,
  isOpen,
  onClose,
}) => {
  const { 
    currentUser, 
    partner, 
    categories, 
    currency, 
    updateTransaction,
    deleteTransaction
  } = useFinance();

  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCatId, setSelectedCatId] = useState('cat-food');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('None');
  const [paidByUserId, setPaidByUserId] = useState('');
  const [isShared, setIsShared] = useState(true);
  const [date, setDate] = useState('');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setTitle(transaction.title);
      setAmount(transaction.amount.toString());
      setSelectedCatId(transaction.categoryId);
      setPaymentMethod(transaction.paymentMethod || 'None');
      setPaidByUserId(transaction.userId);
      setIsShared(transaction.isShared);
      setDate(transaction.date);
      setShowConfirmDelete(false);
    }
  }, [transaction]);

  if (!isOpen || !transaction || !currentUser) return null;

  const currentCategories = categories.filter(
    c => c.type === 'both' || c.type === type
  );

  const selectedCategory = currentCategories.find(c => c.id === selectedCatId) 
    || categories.find(c => c.id === selectedCatId) 
    || currentCategories[0] 
    || categories[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!title.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

    const paidByUser = (partner && paidByUserId === partner.id) ? partner : currentUser;

    updateTransaction({
      ...transaction,
      title: title.trim(),
      amount: parsedAmount,
      type,
      categoryId: selectedCategory.id,
      categoryName: selectedCategory.name,
      categoryColor: selectedCategory.color,
      categoryIcon: selectedCategory.icon,
      paymentMethod: paymentMethod === 'None' ? undefined : paymentMethod,
      date,
      userId: paidByUser.id,
      userName: paidByUser.name,
      userAvatar: paidByUser.avatarUrl,
      isShared,
    });

    onClose();
  };

  const handleDelete = () => {
    deleteTransaction(transaction.id);
    onClose();
  };

  const currencySymbol = getCurrencySymbol(currency);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg glass-panel bg-slate-900 border border-white/15 rounded-3xl p-6 shadow-2xl max-h-[92vh] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white tracking-wide">
              Edit Transaction
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Expense vs Income Toggle */}
          <div className="flex p-1 rounded-2xl bg-slate-950/80 border border-white/10">
            <button
              type="button"
              onClick={() => {
                setType('expense');
                setSelectedCatId('cat-food');
              }}
              className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                type === 'expense'
                  ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ArrowDownCircle className="w-4 h-4" />
              <span>Expense</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setType('income');
                setSelectedCatId('cat-salary');
              }}
              className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                type === 'income'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ArrowUpCircle className="w-4 h-4" />
              <span>Income</span>
            </button>
          </div>

          {/* Amount Input */}
          <div>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-2xl font-bold text-slate-400">
                {currencySymbol}
              </span>
              <input
                type="number"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-800/80 border border-white/15 text-2xl font-black text-white focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Description
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Additional Description"
              required
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500 placeholder:text-slate-500 transition-all"
            />
          </div>

          {/* Category Dropdown */}
          <CategoryDropdown
            selectedCatId={selectedCatId}
            onChange={setSelectedCatId}
            type={type}
            label="Category Label"
          />

          {/* Who Paid / Received */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {type === 'expense' ? 'Who Paid?' : 'Received By:'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaidByUserId(currentUser.id)}
                className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${
                  paidByUserId === currentUser.id
                    ? 'border-indigo-500 bg-indigo-500/15 text-white'
                    : 'border-white/5 bg-slate-800/60 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="w-7 h-7 rounded-full object-cover ring-2 ring-indigo-500 shrink-0"
                />
                <div className="text-left truncate">
                  <p className="text-xs font-bold truncate">{currentUser.name} (Me)</p>
                  <p className="text-[10px] text-slate-400">Payer</p>
                </div>
              </button>

              {partner && (
                <button
                  type="button"
                  onClick={() => setPaidByUserId(partner.id)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${
                    paidByUserId === partner.id
                      ? 'border-indigo-500 bg-indigo-500/15 text-white'
                      : 'border-white/5 bg-slate-800/60 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <img
                    src={partner.avatarUrl}
                    alt={partner.name}
                    className="w-7 h-7 rounded-full object-cover ring-2 ring-indigo-500 shrink-0"
                  />
                  <div className="text-left truncate">
                    <p className="text-xs font-bold truncate">{partner.name}</p>
                    <p className="text-[10px] text-slate-400">Partner</p>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Payment Method & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Payment Method <span className="text-[10px] text-slate-500 font-normal">(Optional)</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500 transition-all"
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          {/* Shared vs Personal Expense Switch */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/50 border border-white/5">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <div>
                <p className="text-xs font-semibold text-white">Shared Couple Expense</p>
                <p className="text-[10px] text-slate-400">Included in joint monthly calculations</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={isShared}
              onChange={(e) => setIsShared(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900 accent-indigo-500 cursor-pointer"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center gap-2.5">
            {showConfirmDelete ? (
              <div className="flex items-center gap-2 w-full">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Confirm Delete</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(false)}
                  className="px-3 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-all"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(true)}
                  className="p-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all"
                  title="Delete Transaction"
                >
                  <Trash2 className="w-5 h-5" />
                </button>

                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-90 active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5 stroke-[2.5]" />
                  <span>Save Changes</span>
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

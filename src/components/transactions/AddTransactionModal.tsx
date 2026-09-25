import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { 
  X, 
  Plus, 
  Tag, 
  CreditCard, 
  Calendar, 
  FileText, 
  Users, 
  User, 
  ArrowDownCircle, 
  ArrowUpCircle 
} from 'lucide-react';
import { PaymentMethod } from '../../types/finance';
import { CategoryIcon } from '../common/CategoryIcon';
import { AddCategoryModal } from '../categories/AddCategoryModal';
import { getCurrencySymbol } from '../../utils/formatters';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  'Credit Card',
  'UPI / Pix',
  'Bank Transfer',
  'Cash',
  'Debit Card',
  'Crypto',
  'Other'
];

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({ isOpen, onClose }) => {
  const { 
    currentUser, 
    partner, 
    categories, 
    currency, 
    addTransaction 
  } = useFinance();

  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCatId, setSelectedCatId] = useState(
    type === 'expense' ? 'cat-food' : 'cat-salary'
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI / Pix');
  const [paidByUserId, setPaidByUserId] = useState(currentUser?.id ?? '');
  const [isShared, setIsShared] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  if (!isOpen || !currentUser) return null;

  const currentCategories = categories.filter(
    c => c.type === 'both' || c.type === type
  );

  const selectedCategory = categories.find(c => c.id === selectedCatId) || categories[0];

  const handleQuickAddAmount = (addValue: number) => {
    const current = parseFloat(amount) || 0;
    setAmount((current + addValue).toString());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!title.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

    const paidByUser = (partner && paidByUserId === partner.id) ? partner : currentUser;

    addTransaction({
      title: title.trim(),
      amount: parsedAmount,
      type,
      categoryId: selectedCategory.id,
      categoryName: selectedCategory.name,
      categoryColor: selectedCategory.color,
      categoryIcon: selectedCategory.icon,
      paymentMethod,
      date,
      userId: paidByUser.id,
      userName: paidByUser.name,
      userAvatar: paidByUser.avatarUrl,
      isShared,
      notes: notes.trim() || undefined,
    });

    // Reset & close
    setTitle('');
    setAmount('');
    setNotes('');
    onClose();
  };

  const currencySymbol = getCurrencySymbol(currency);
  const quickPills = currency === 'INR' ? [100, 500, 1000, 2000, 5000] : [5, 10, 25, 50, 100];

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="relative w-full max-w-lg glass-panel bg-slate-900 border border-white/15 rounded-3xl p-6 shadow-2xl max-h-[92vh] overflow-y-auto no-scrollbar">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">Add Transaction</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {/* Expense vs Income Type Toggle */}
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

            {/* Amount Input with Currency Symbol */}
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
                  autoFocus
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-800/80 border border-white/15 text-2xl font-black text-white focus:outline-none focus:border-rose-500 transition-all placeholder:text-slate-600"
                />
              </div>

              {/* Quick Amount Chips */}
              <div className="flex items-center gap-1.5 mt-2 overflow-x-auto no-scrollbar py-1">
                {quickPills.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleQuickAddAmount(val)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700 active:scale-95 border border-white/5 whitespace-nowrap"
                  >
                    +{currencySymbol}{val}
                  </button>
                ))}
              </div>
            </div>

            {/* Transaction Title */}
            <div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={type === 'expense' ? 'What was this expense for?' : 'Income source (e.g. Salary, Freelance)'}
                required
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800/70 border border-white/10 text-white text-sm focus:outline-none focus:border-rose-500 placeholder:text-slate-500"
              />
            </div>

            {/* Categories Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">Category Label</label>
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Custom Label</span>
                </button>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-36 overflow-y-auto no-scrollbar p-1">
                {currentCategories.map((cat) => {
                  const isSelected = selectedCatId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCatId(cat.id)}
                      className={`flex items-center gap-2 p-2 rounded-xl text-left transition-all border ${
                        isSelected
                          ? 'border-white bg-white/10 shadow-sm'
                          : 'border-white/5 bg-slate-800/60 hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <div 
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${cat.color}25`, color: cat.color }}
                      >
                        <CategoryIcon name={cat.icon} size={15} />
                      </div>
                      <span className="text-xs font-medium truncate">{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Who Paid / Added (Collaboration attribution) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {type === 'expense' ? 'Who Paid?' : 'Received By:'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaidByUserId(currentUser!.id)}
                  className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                    paidByUserId === currentUser!.id
                      ? 'border-rose-500 bg-rose-500/15 text-white'
                      : 'border-white/5 bg-slate-800/60 text-slate-400'
                  }`}
                >
                  <img
                    src={currentUser!.avatarUrl}
                    alt={currentUser!.name}
                    className="w-7 h-7 rounded-full object-cover ring-2 ring-rose-500"
                  />
                  <div className="text-left">
                    <p className="text-xs font-bold">{currentUser!.name} (Me)</p>
                    <p className="text-[10px] text-slate-400">Payer</p>
                  </div>
                </button>

                {partner && (
                  <button
                    type="button"
                    onClick={() => setPaidByUserId(partner.id)}
                    className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                      paidByUserId === partner.id
                        ? 'border-indigo-500 bg-indigo-500/15 text-white'
                        : 'border-white/5 bg-slate-800/60 text-slate-400'
                    }`}
                  >
                    <img
                      src={partner.avatarUrl}
                      alt={partner.name}
                      className="w-7 h-7 rounded-full object-cover ring-2 ring-indigo-500"
                    />
                    <div className="text-left">
                      <p className="text-xs font-bold">{partner.name}</p>
                      <p className="text-[10px] text-slate-400">Partner</p>
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* Payment Method & Shared Toggle */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-rose-500"
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method}
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
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {/* Shared vs Personal Expense Switch */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/50 border border-white/5">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-rose-400" />
                <div>
                  <p className="text-xs font-semibold text-white">Shared Couple Expense</p>
                  <p className="text-[10px] text-slate-400">Included in joint monthly calculations</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={isShared}
                onChange={(e) => setIsShared(e.target.checked)}
                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 focus:ring-offset-slate-900 accent-rose-500 cursor-pointer"
              />
            </div>

            {/* Optional Notes */}
            <div>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes or tags..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-800/60 border border-white/10 text-white text-xs focus:outline-none focus:border-rose-500 placeholder:text-slate-500"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-indigo-600 hover:opacity-90 text-white font-bold text-sm shadow-lg shadow-rose-500/25 transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
              <span>Record {type === 'expense' ? 'Expense' : 'Income'}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Embedded Custom Category Modal */}
      <AddCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onCreated={(newId) => setSelectedCatId(newId)}
      />
    </>
  );
};

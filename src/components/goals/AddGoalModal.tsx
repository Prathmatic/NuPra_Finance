import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { X, Target, Plus, Heart, Home, Plane, ShieldCheck, Car, Gift, Sparkles, Users, User, HeartHandshake } from 'lucide-react';
import { PRESET_CATEGORY_COLORS } from '../../constants/defaultCategories';
import { getCurrencySymbol } from '../../utils/formatters';

interface AddGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GOAL_ICONS = [
  { name: 'Target', label: 'General' },
  { name: 'Plane', label: 'Travel' },
  { name: 'Home', label: 'Home' },
  { name: 'ShieldCheck', label: 'Emergency' },
  { name: 'Car', label: 'Vehicle' },
  { name: 'Sparkles', label: 'Milestone' },
];

export const AddGoalModal: React.FC<AddGoalModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, partner, currency, addGoal, convertInputToBase, exchangeRate } = useFinance();
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('2027-01-01');
  const [color, setColor] = useState('#3B82F6');
  const [icon, setIcon] = useState('Target');
  const [notes, setNotes] = useState('');
  const [assignedTo, setAssignedTo] = useState<'both' | 'me'>('both');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(targetAmount);
    if (!title.trim() || isNaN(amountNum) || amountNum <= 0) return;

    let assignedUserId: string | undefined;
    let assignedUserName: string | undefined;
    let isShared = true;

    if (assignedTo === 'me') {
      assignedUserId = currentUser?.id;
      assignedUserName = currentUser?.name || 'Me';
      isShared = false;
    } else {
      assignedUserId = undefined;
      assignedUserName = 'Both of Us';
      isShared = true;
    }

    const baseTarget = convertInputToBase(amountNum);

    addGoal({
      title: title.trim(),
      targetAmount: baseTarget,
      targetDate,
      color,
      icon,
      createdByUserId: currentUser!.id,
      createdByUserName: currentUser!.name,
      isShared,
      assignedTo,
      assignedUserId,
      assignedUserName,
      notes: notes.trim() || undefined,
    });

    setTitle('');
    setTargetAmount('');
    setNotes('');
    setAssignedTo('both');
    onClose();
  };

  const currencySymbol = getCurrencySymbol(currency);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md glass-panel bg-slate-900 border border-white/15 rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl" style={{ backgroundColor: color }}>
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Create Goal</h2>
              <p className="text-[11px] text-slate-400">Set a milestone for you, your partner, or both</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Assignment Selector (Both / Me) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Assign Goal To
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAssignedTo('both')}
                className={`p-2.5 rounded-2xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all ${
                  assignedTo === 'both'
                    ? 'bg-rose-500/20 border-rose-500 text-white shadow-lg shadow-rose-500/10 ring-1 ring-rose-500/50'
                    : 'bg-slate-800/60 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <div className={`p-1.5 rounded-xl ${assignedTo === 'both' ? 'bg-rose-500 text-white' : 'bg-white/5 text-slate-400'}`}>
                  <Users className="w-4 h-4" />
                </div>
                <span className="font-bold">Both of Us</span>
                <span className="text-[10px] text-slate-400">Joint Couple Milestone</span>
              </button>

              <button
                type="button"
                onClick={() => setAssignedTo('me')}
                className={`p-2.5 rounded-2xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all ${
                  assignedTo === 'me'
                    ? 'bg-blue-500/20 border-blue-500 text-white shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/50'
                    : 'bg-slate-800/60 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <div className={`p-1.5 rounded-xl ${assignedTo === 'me' ? 'bg-blue-500 text-white' : 'bg-white/5 text-slate-400'}`}>
                  <User className="w-4 h-4" />
                </div>
                <span className="font-bold truncate max-w-[120px]">{currentUser?.name?.split(' ')[0] || 'Me'}</span>
                <span className="text-[10px] text-slate-400">Personal Goal</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Goal Name</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={assignedTo === 'both' ? 'e.g. Wedding Fund, Dream Home' : assignedTo === 'me' ? 'e.g. New Laptop, Gym Membership' : 'e.g. Birthday Gift, Study Course'}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-white text-sm focus:outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Target Amount ({currencySymbol})</label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-base font-bold text-slate-400">
                {currencySymbol}
              </span>
              <input
                type="number"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="50000"
                required
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-white text-base font-bold focus:outline-none focus:border-rose-500"
              />
            </div>
            {currency === 'INR' && parseFloat(targetAmount) > 0 && (
              <p className="mt-1 text-[11px] text-teal-300">
                ≈ €{Math.round(parseFloat(targetAmount) / exchangeRate)} EUR base target
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Target Achievement Date</label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              required
              className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Theme Color</label>
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
              {PRESET_CATEGORY_COLORS.slice(0, 8).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full shrink-0 transition-all ${
                    color === c ? 'ring-2 ring-white scale-110 shadow-md' : 'opacity-70'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Notes / Motivation</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Why this goal matters..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-rose-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Set Goal</span>
          </button>
        </form>
      </div>
    </div>
  );
};

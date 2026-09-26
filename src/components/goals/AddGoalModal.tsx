import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { X, Target, Plus, Heart, Home, Plane, ShieldCheck, Car, Gift, Sparkles } from 'lucide-react';
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
  const { currentUser, currency, addGoal } = useFinance();
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('2027-01-01');
  const [color, setColor] = useState('#3B82F6');
  const [icon, setIcon] = useState('Target');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(targetAmount);
    if (!title.trim() || isNaN(amountNum) || amountNum <= 0) return;

    addGoal({
      title: title.trim(),
      targetAmount: amountNum,
      targetDate,
      color,
      icon,
      createdByUserId: currentUser!.id,
      createdByUserName: currentUser!.name,
      isShared: true,
      notes: notes.trim() || undefined,
    });

    setTitle('');
    setTargetAmount('');
    setNotes('');
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
            <h2 className="text-base font-bold text-white">Create Couple Goal</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Goal Name</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Wedding Fund, Japan Trip, Dream Home"
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
                placeholder="500000"
                required
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-white text-base font-bold focus:outline-none focus:border-rose-500"
              />
            </div>
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
              placeholder="Why this goal matters to both of us..."
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

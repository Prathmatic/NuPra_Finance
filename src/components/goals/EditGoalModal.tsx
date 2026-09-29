import React, { useState, useEffect } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { X, Target, Users, User, HeartHandshake, Send, Clock } from 'lucide-react';
import { PRESET_CATEGORY_COLORS } from '../../constants/defaultCategories';
import { getCurrencySymbol } from '../../utils/formatters';
import { FinanceGoal } from '../../types/finance';

interface EditGoalModalProps {
  goal: FinanceGoal | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EditGoalModal: React.FC<EditGoalModalProps> = ({ goal, isOpen, onClose }) => {
  const { currentUser, partner, currency, updateGoal, requestGoalChange } = useFinance();

  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [notes, setNotes] = useState('');
  const [assignedTo, setAssignedTo] = useState<'both' | 'me' | 'partner'>('both');

  // Sync form when goal changes
  useEffect(() => {
    if (goal) {
      setTitle(goal.title);
      setTargetAmount(String(goal.targetAmount));
      setTargetDate(goal.targetDate);
      setColor(goal.color);
      setNotes(goal.notes || '');
      if (goal.isShared) {
        setAssignedTo('both');
      } else if (goal.assignedUserId === currentUser?.id) {
        setAssignedTo('me');
      } else {
        setAssignedTo('partner');
      }
    }
  }, [goal, currentUser]);

  if (!isOpen || !goal) return null;

  const isCombinedGoal = goal.isShared || goal.assignedTo === 'both';

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
    } else if (assignedTo === 'partner') {
      assignedUserId = partner?.id;
      assignedUserName = partner?.name || 'Partner';
      isShared = false;
    } else {
      assignedUserId = undefined;
      assignedUserName = 'Both of Us';
      isShared = true;
    }

    const proposedPayload = {
      title: title.trim(),
      targetAmount: amountNum,
      targetDate,
      color,
      notes: notes.trim() || undefined,
      isShared,
      assignedTo,
      assignedUserId,
      assignedUserName,
    };

    // If it's a combined goal, create a change request for partner approval!
    if (isCombinedGoal) {
      requestGoalChange(goal.id, proposedPayload);
    } else {
      // Individual goal: owner can directly update!
      updateGoal(goal.id, proposedPayload);
    }

    onClose();
  };

  const currencySymbol = getCurrencySymbol(currency);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md glass-panel bg-slate-900 border border-white/15 rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl" style={{ backgroundColor: color }}>
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Edit Goal</h2>
              <p className="text-[11px] text-slate-400 truncate max-w-[200px]">{goal.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Assignment Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Assign Goal To</label>
            <div className="grid grid-cols-3 gap-2">
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
                  <Users className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold text-[10px]">Both</span>
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
                  <User className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold text-[10px] truncate max-w-[60px]">{currentUser?.name?.split(' ')[0] || 'Me'}</span>
              </button>

              {partner && (
                <button
                  type="button"
                  onClick={() => setAssignedTo('partner')}
                  className={`p-2.5 rounded-2xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all ${
                    assignedTo === 'partner'
                      ? 'bg-purple-500/20 border-purple-500 text-white shadow-lg shadow-purple-500/10 ring-1 ring-purple-500/50'
                      : 'bg-slate-800/60 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <div className={`p-1.5 rounded-xl ${assignedTo === 'partner' ? 'bg-purple-500 text-white' : 'bg-white/5 text-slate-400'}`}>
                    <HeartHandshake className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-bold text-[10px] truncate max-w-[60px]">{partner?.name?.split(' ')[0] || 'Partner'}</span>
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Goal Name</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Wedding Fund, Dream Home"
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-white text-sm focus:outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Target Amount ({currencySymbol})</label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-base font-bold text-slate-400">{currencySymbol}</span>
              <input
                type="number"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="50000"
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
              placeholder="Why this goal matters..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-rose-500"
            />
          </div>

          {isCombinedGoal && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-[11px] text-amber-200/90 leading-relaxed">
                <span className="font-bold text-amber-300">Partner Approval Required:</span> Since this is a shared couple goal, your changes will be submitted to {partner?.name || 'your partner'} for review and approval before taking effect.
              </div>
            </div>
          )}

          <button
            type="submit"
            className={`w-full py-2.5 rounded-xl font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 hover:opacity-90 ${
              isCombinedGoal
                ? 'bg-gradient-to-r from-amber-600 to-rose-600 text-white shadow-amber-500/20'
                : 'bg-gradient-to-r from-rose-600 to-indigo-600 text-white shadow-rose-500/20'
            }`}
          >
            {isCombinedGoal ? (
              <>
                <Send className="w-4 h-4" />
                <span>Submit Change Request</span>
              </>
            ) : (
              <>
                <Target className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { 
  Target, 
  Plus, 
  Calendar, 
  CheckCircle2, 
  Trash2, 
  Sparkles,
  TrendingUp
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { FinanceGoal } from '../../types/finance';
import { ContributeModal } from './ContributeModal';

interface GoalsViewProps {
  onOpenAddGoalModal: () => void;
}

export const GoalsView: React.FC<GoalsViewProps> = ({ onOpenAddGoalModal }) => {
  const { goals, currency, currentUser, partner, deleteGoal } = useFinance();
  const [selectedGoalForContribute, setSelectedGoalForContribute] = useState<FinanceGoal | null>(null);

  const { totalTarget, totalSaved, totalNeededMore } = React.useMemo(() => {
    let target = 0;
    let saved = 0;
    let needed = 0;
    goals.forEach(g => {
      target += g.targetAmount;
      saved += g.currentAmount;
      needed += Math.max(0, g.targetAmount - g.currentAmount);
    });
    return { totalTarget: target, totalSaved: saved, totalNeededMore: needed };
  }, [goals]);

  const overallProgress = totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0;

  if (goals.length === 0) {
    return (
      <div className="space-y-5 pb-20 animate-in fade-in duration-300">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-white">Finance Goals</h2>
          <button
            onClick={onOpenAddGoalModal}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:opacity-90 text-white text-xs font-bold shadow-md flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> New Goal
          </button>
        </div>
        <div className="flex flex-col items-center justify-center py-16 space-y-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-500/20 to-indigo-500/20 flex items-center justify-center">
            <Target className="w-8 h-8 text-rose-400" />
          </div>
          <div>
            <p className="text-white font-bold text-base">No goals yet</p>
            <p className="text-slate-400 text-sm mt-1">Set your first couple finance goal!</p>
          </div>
          <button
            onClick={onOpenAddGoalModal}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 text-white text-sm font-bold"
          >
            Create First Goal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-20 animate-in fade-in duration-300">
      {/* Overview Banner */}
      <div className="glass-panel p-5 rounded-3xl border border-white/10 bg-gradient-to-br from-rose-950/70 via-slate-900 to-indigo-950/70 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-rose-500 to-indigo-600 text-white">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">Couple Finance Goals</h2>
              <p className="text-xs text-slate-400">Joint Milestones & Progress</p>
            </div>
          </div>
          <button
            onClick={onOpenAddGoalModal}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:opacity-90 text-white text-xs font-bold shadow-md flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>New Goal</span>
          </button>
        </div>

        {/* Summary cards — stacked vertically to prevent overlap */}
        <div className="flex flex-col gap-2.5 pt-1">
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-slate-400 mb-0.5">Total Saved Across Goals</p>
              <p className="text-base sm:text-lg font-black leading-tight text-emerald-400 break-words [overflow-wrap:anywhere]">{formatCurrency(totalSaved, currency)}</p>
            </div>
            <div className="shrink-0 text-right">
              <span className="text-[10px] text-slate-500 block">{overallProgress}% of target</span>
              <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden mt-1">
                <div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${overallProgress}%` }} />
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-slate-400 mb-0.5">Amount Still Needed</p>
              <p className="text-base sm:text-lg font-black leading-tight text-amber-400 break-words [overflow-wrap:anywhere]">{formatCurrency(totalNeededMore, currency)}</p>
            </div>
            <div className="shrink-0 p-2 rounded-xl bg-amber-500/10">
              <TrendingUp className="w-5 h-5 text-amber-400" />
            </div>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-400 font-medium">
            <span>Overall Progress</span>
            <span>{overallProgress}%</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-rose-500 via-pink-500 to-indigo-500 transition-all duration-700"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Goal Cards */}
      <div className="space-y-4">
        {goals.map((goal) => {
          const neededMore = Math.max(0, goal.targetAmount - goal.currentAmount);
          const progress = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
          const isCompleted = goal.currentAmount >= goal.targetAmount;

          let myContribution = 0;
          let partnerContribution = 0;
          goal.contributions.forEach(c => {
            if (currentUser && c.userId === currentUser.id) myContribution += c.amount;
            else partnerContribution += c.amount;
          });

          return (
            <div
              key={goal.id}
              className="glass-card rounded-3xl p-5 border border-white/10 hover:border-white/20 transition-all space-y-4 relative overflow-hidden"
            >
              {/* Goal Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md"
                    style={{ backgroundColor: `${goal.color}25`, color: goal.color }}
                  >
                    <Target className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-white">{goal.title}</h3>
                      {isCompleted && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Done!
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Target: {formatDate(goal.targetDate)}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => deleteGoal(goal.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Progress */}
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-xs text-slate-400">Saved: </span>
                    <strong className="text-sm text-white">{formatCurrency(goal.currentAmount, currency)}</strong>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400">Target: </span>
                    <strong className="text-sm text-slate-300">{formatCurrency(goal.targetAmount, currency)}</strong>
                  </div>
                </div>

                <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${progress}%`, backgroundColor: goal.color }}
                  />
                </div>

                {/* Amount needed + deposit button */}
                <div className="p-3 rounded-2xl bg-slate-900/80 border border-white/5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] text-slate-400">Still Needed:</p>
                      <p className="text-base font-extrabold text-amber-400 truncate">
                        {neededMore === 0 ? 'Goal Achieved! 🎉' : formatCurrency(neededMore, currency)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedGoalForContribute(goal)}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Deposit</span>
                  </button>
                </div>
              </div>

              {/* Contributions split */}
              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-slate-300">{currentUser?.name ?? 'You'}:</span>
                  <span className="text-emerald-400 font-semibold">{formatCurrency(myContribution, currency)}</span>
                </div>
                {partner && (
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-slate-300">{partner.name}:</span>
                    <span className="text-indigo-400 font-semibold">{formatCurrency(partnerContribution, currency)}</span>
                  </div>
                )}
                <span className="text-[11px] text-slate-500">{goal.contributions.length} deposits</span>
              </div>
            </div>
          );
        })}
      </div>

      <ContributeModal
        goal={selectedGoalForContribute}
        isOpen={!!selectedGoalForContribute}
        onClose={() => setSelectedGoalForContribute(null)}
      />
    </div>
  );
};

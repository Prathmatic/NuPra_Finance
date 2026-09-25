import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { 
  Target, 
  Plus, 
  Calendar, 
  CheckCircle2, 
  Users, 
  ChevronRight, 
  Trash2, 
  Sparkles,
  ArrowRight
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

  // Overall Goal Deficit calculations
  const { totalTarget, totalSaved, totalNeededMore } = React.useMemo(() => {
    let target = 0;
    let saved = 0;
    goals.forEach(g => {
      target += g.targetAmount;
      saved += g.currentAmount;
    });
    return {
      totalTarget: target,
      totalSaved: saved,
      totalNeededMore: Math.max(0, target - saved),
    };
  }, [goals]);

  const overallProgress = totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0;

  return (
    <div className="space-y-5 pb-20 animate-in fade-in duration-300">
      {/* Overview Goals Deficit Banner (Explicitly requested by user) */}
      <div className="glass-panel p-5 rounded-3xl border border-white/10 bg-gradient-to-br from-rose-950/70 via-slate-900 to-indigo-950/70 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-rose-500 to-indigo-600 text-white shadow-glow-rose">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">Couple Finance Goals</h2>
              <p className="text-xs text-slate-400">Joint Milestones & Target Deficits</p>
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

        {/* Big Deficit Summary Callout */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5">
            <p className="text-[11px] text-slate-400">Total Saved Across Goals</p>
            <p className="text-xl font-black text-emerald-400">
              {formatCurrency(totalSaved, currency)}
            </p>
            <span className="text-[10px] text-slate-400">{overallProgress}% of portfolio target</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5">
            <p className="text-[11px] text-slate-400">Amount Needed More</p>
            <p className="text-xl font-black text-amber-400">
              {formatCurrency(totalNeededMore, currency)}
            </p>
            <span className="text-[10px] text-amber-300/80">Remaining to accomplish all</span>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-400 font-medium">
            <span>Overall Milestone Progress</span>
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

      {/* Goal Cards List */}
      <div className="space-y-4">
        {goals.map((goal) => {
          const neededMore = Math.max(0, goal.targetAmount - goal.currentAmount);
          const progress = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
          const isCompleted = goal.currentAmount >= goal.targetAmount;

          // Split contributions by user
          let nuContribution = 0;
          let praContribution = 0;
          goal.contributions.forEach(c => {
            if (c.userId === currentUser.id) nuContribution += c.amount;
            else praContribution += c.amount;
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
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">{goal.title}</h3>
                      {isCompleted && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Completed!
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
                  title="Delete Goal"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Progress and Key Requirement: Amount Needed More */}
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-xs text-slate-400">Current Saved: </span>
                    <strong className="text-sm text-white">{formatCurrency(goal.currentAmount, currency)}</strong>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400">Target: </span>
                    <strong className="text-sm text-slate-300">{formatCurrency(goal.targetAmount, currency)}</strong>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden relative">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${progress}%`,
                      backgroundColor: goal.color,
                    }}
                  />
                </div>

                {/* Amount needed more highlight badge */}
                <div className="p-3 rounded-2xl bg-slate-900/80 border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <div>
                      <p className="text-[11px] text-slate-400">Amount Needed More to Reach Goal:</p>
                      <p className="text-base font-extrabold text-amber-400">
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

              {/* Collaborative Contributions Split */}
              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-slate-300">{currentUser.name}:</span>
                  <span className="text-emerald-400 font-semibold">{formatCurrency(nuContribution, currency)}</span>
                </div>
                {partner && (
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-slate-300">{partner.name}:</span>
                    <span className="text-indigo-400 font-semibold">{formatCurrency(praContribution, currency)}</span>
                  </div>
                )}
                <span className="text-[11px] text-slate-500">{goal.contributions.length} contributions</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Deposit Modal */}
      <ContributeModal
        goal={selectedGoalForContribute}
        isOpen={!!selectedGoalForContribute}
        onClose={() => setSelectedGoalForContribute(null)}
      />
    </div>
  );
};

import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { Transaction } from '../../types/finance';
import { 
  Flag, 
  MessageSquare, 
  Send, 
  CheckCircle, 
  Lock,
  Target,
  ChevronRight,
  Info
} from 'lucide-react';
import { formatDate, formatCurrency, getGoalSavingsTitle } from '../../utils/formatters';

interface TransactionActivityDrawerProps {
  transaction: Transaction;
}

export const TransactionActivityDrawer: React.FC<TransactionActivityDrawerProps> = ({ transaction }) => {
  const { 
    currentUser, 
    partner, 
    toggleFlagTransaction, 
    addTransactionComment,
    setActiveTab,
    currency,
    goals
  } = useFinance();

  const [commentText, setCommentText] = useState('');

  const isMyTx = transaction.userId === currentUser?.id;
  const isFlagged = Boolean(transaction.isFlagged);
  const comments = transaction.comments || [];

  const { goalName, isGoalSavings } = getGoalSavingsTitle(transaction);
  const matchedGoal = isGoalSavings 
    ? goals?.find(g => (transaction.goalId && g.id === transaction.goalId) || (goalName && g.title.toLowerCase() === goalName.toLowerCase()))
    : undefined;

  const resolvedGoalTitle = goalName || matchedGoal?.title || 'Couples Savings Goal';
  const goalProgress = matchedGoal && matchedGoal.targetAmount > 0
    ? Math.min(100, Math.round((matchedGoal.currentAmount / matchedGoal.targetAmount) * 100))
    : null;

  const handleSendComment = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commentText.trim()) return;
    addTransactionComment(transaction.id, commentText);
    setCommentText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendComment();
    }
  };

  const flaggedByName = transaction.flaggedByUserId === currentUser?.id 
    ? 'You' 
    : (transaction.flaggedByUserName || partner?.name || 'Partner');

  return (
    <div className="mt-3 pt-3 border-t border-white/10 space-y-3.5 animate-in fade-in duration-200">
      {/* ─── Goal Savings Details & Description Card ──────────────────────── */}
      {isGoalSavings && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-teal-950/30 border border-emerald-500/30 space-y-2.5 shadow-lg">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <Target className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 block">
                  Savings Goal Allocation
                </span>
                <p className="text-xs sm:text-sm font-bold text-white truncate">
                  {resolvedGoalTitle}
                </p>
              </div>
            </div>

            {setActiveTab && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab('goals');
                }}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold transition-all flex items-center gap-1 shrink-0 active:scale-95 shadow-sm"
                title="Go to Goals view"
              >
                <span>View Goal</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Goal Progress if matched */}
          {matchedGoal && (
            <div className="space-y-1.5 bg-black/25 p-2.5 rounded-xl border border-white/5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Total Saved for Goal</span>
                <span className="text-emerald-400 font-bold">
                  {formatCurrency(matchedGoal.currentAmount, currency)} / {formatCurrency(matchedGoal.targetAmount, currency)} ({goalProgress}%)
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                  style={{ width: `${goalProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Description & Contribution Details */}
          <div className="text-xs bg-black/20 p-2.5 rounded-xl border border-white/5 space-y-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Contribution Description
            </span>
            <p className="text-slate-200 text-xs leading-relaxed">
              {transaction.notes || `Contributed ${formatCurrency(transaction.amount, currency)} towards "${resolvedGoalTitle}".`}
            </p>
            <p className="text-[10px] text-slate-400 pt-0.5">
              Saved by {transaction.userName} on {formatDate(transaction.date)}
            </p>
          </div>
        </div>
      )}

      {/* ─── Notes Description for Regular Transactions ────────────────────── */}
      {!isGoalSavings && transaction.notes && (
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 flex items-start gap-2 text-xs">
          <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Note
            </span>
            <p className="text-slate-200 text-xs leading-relaxed">{transaction.notes}</p>
          </div>
        </div>
      )}
      {/* ─── Flag Status & Quick Action Bar ───────────────────────────────── */}
      <div className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
        isFlagged 
          ? 'bg-amber-500/15 border-amber-500/30' 
          : 'bg-slate-900/60 border-white/5'
      }`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`p-2 rounded-xl shrink-0 ${
            isFlagged ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-slate-400'
          }`}>
            <Flag className={`w-4 h-4 ${isFlagged ? 'fill-amber-400 text-amber-400' : ''}`} />
          </div>
          <div className="min-w-0">
            {isFlagged ? (
              <>
                <p className="text-xs font-bold text-amber-300 truncate">
                  Flagged for Discussion
                </p>
                <p className="text-[10px] text-amber-200/70 truncate">
                  Flagged by {flaggedByName} • Needs review or receipt
                </p>
              </>
            ) : (
              <>
                <p className="text-xs font-semibold text-slate-300">
                  Transaction Flag
                </p>
                <p className="text-[10px] text-slate-400">
                  Flag this transaction if you have a question or need receipts
                </p>
              </>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleFlagTransaction(transaction.id);
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 active:scale-95 shadow-sm ${
            isFlagged
              ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
              : 'bg-white/10 hover:bg-white/20 text-slate-300 border border-white/10 hover:text-white'
          }`}
          title={isFlagged ? "Resolve and remove flag" : "Flag this transaction for your partner"}
        >
          {isFlagged ? (
            <>
              <CheckCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Resolve Flag</span>
            </>
          ) : (
            <>
              <Flag className="w-3.5 h-3.5 text-amber-400" />
              <span>Flag Expense</span>
            </>
          )}
        </button>
      </div>

      {/* ─── Read-only Info Banner for Partner Transactions ───────────────── */}
      {!isMyTx && (
        <div className="px-3 py-2 rounded-xl bg-slate-900/80 border border-white/5 flex items-center gap-2 text-[11px] text-slate-400">
          <Lock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>
            Created by <strong className="text-white">{transaction.userName}</strong> (Read-only). You cannot modify amounts, but can discuss and flag freely.
          </span>
        </div>
      )}

      {/* ─── Comments Conversation Thread ─────────────────────────────────── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs px-0.5">
          <div className="flex items-center gap-1.5 text-slate-400 font-semibold">
            <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
            <span>Comments & Notes ({comments.length})</span>
          </div>
          {comments.length > 0 && (
            <span className="text-[10px] text-slate-500">Shared conversation</span>
          )}
        </div>

        {comments.length === 0 ? (
          <div className="p-3.5 rounded-2xl bg-slate-900/40 border border-dashed border-white/10 text-center space-y-1">
            <p className="text-xs text-slate-400 font-medium">No comments yet</p>
            <p className="text-[10px] text-slate-400">
              Have a question or note about this expense? Type a message below.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1 no-scrollbar">
            {comments.map((cmnt) => {
              const isMyComment = cmnt.userId === currentUser?.id;
              return (
                <div
                  key={cmnt.id}
                  className={`p-2.5 rounded-2xl border text-xs space-y-1 transition-all ${
                    isMyComment
                      ? 'bg-indigo-950/30 border-indigo-500/20 ml-4'
                      : 'bg-slate-900/80 border-white/10 mr-4'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {cmnt.userAvatar ? (
                        <img 
                          src={cmnt.userAvatar} 
                          alt={cmnt.userName} 
                          className="w-4 h-4 rounded-full object-cover shrink-0" 
                        />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-slate-700 flex items-center justify-center text-[9px] text-white shrink-0">
                          {cmnt.userName?.[0] || 'U'}
                        </div>
                      )}
                      <span className="font-bold text-white text-[11px] truncate">
                        {isMyComment ? `${currentUser?.name || 'You'} (You)` : cmnt.userName}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {formatDate(cmnt.createdAt)}
                    </span>
                  </div>
                  <p className="text-slate-200 text-xs pl-5 leading-relaxed break-words [overflow-wrap:anywhere]">
                    {cmnt.text}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* ─── Add Comment Input ────────────────────────────────────────── */}
        <form onSubmit={handleSendComment} className="flex items-center gap-2 pt-1">
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Add a comment or reply to ${isMyTx ? 'partner' : transaction.userName}...`}
            className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-white/15 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
          />
          <button
            type="submit"
            disabled={!commentText.trim()}
            className="px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-rose-600 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-md flex items-center gap-1 shrink-0"
            title="Post comment"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};

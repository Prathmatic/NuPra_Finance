import { CurrencyCode } from '../types/finance';

export const formatCurrency = (amount: number, currency: CurrencyCode = 'INR'): string => {
  const rounded = Math.round(amount);
  if (currency === 'INR') {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(rounded);
  }
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(amount);
};

export const getCurrencySymbol = (currency: CurrencyCode): string => {
  return currency === 'INR' ? '₹' : '€';
};

export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const formatMonthYear = (monthYearStr: string): string => {
  if (!monthYearStr) return '';
  const [year, month] = monthYearStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
};

export const isGoalSavingsTx = (tx?: { title?: string; goalId?: string }): boolean => {
  if (!tx) return false;
  if (tx.goalId) return true;
  const rawTitle = (tx.title || '').trim();
  return (
    rawTitle === 'Goal Savings' ||
    rawTitle.startsWith('Goal Savings:') ||
    rawTitle === 'Goal Contribution' ||
    rawTitle.startsWith('Goal Contribution:')
  );
};

export const getGoalSavingsTitle = (tx?: { title?: string; goalId?: string; goalTitle?: string }): {
  displayTitle: string;
  goalName: string;
  isGoalSavings: boolean;
} => {
  if (!tx) return { displayTitle: '', goalName: '', isGoalSavings: false };
  const rawTitle = (tx.title || '').trim();
  const isGoal = Boolean(
    tx.goalId ||
    rawTitle === 'Goal Savings' ||
    rawTitle.startsWith('Goal Savings:') ||
    rawTitle === 'Goal Contribution' ||
    rawTitle.startsWith('Goal Contribution:')
  );

  if (isGoal) {
    let goalName = tx.goalTitle || '';
    if (!goalName) {
      if (rawTitle.startsWith('Goal Savings:')) {
        goalName = rawTitle.replace(/^Goal Savings:\s*/i, '').trim();
      } else if (rawTitle.startsWith('Goal Contribution:')) {
        goalName = rawTitle.replace(/^Goal Contribution:\s*/i, '').trim();
      }
    }
    return {
      displayTitle: 'Goal Savings',
      goalName,
      isGoalSavings: true,
    };
  }

  return {
    displayTitle: rawTitle,
    goalName: '',
    isGoalSavings: false,
  };
};


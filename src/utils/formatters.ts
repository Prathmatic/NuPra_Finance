import { CurrencyCode } from '../types/finance';

// Central global exchange rate tracker for EUR -> INR
let currentGlobalEurToInrRate = 108.12;

export const setGlobalExchangeRate = (rate: number): void => {
  if (typeof rate === 'number' && rate > 0) {
    currentGlobalEurToInrRate = rate;
  }
};

export const getGlobalExchangeRate = (): number => {
  return currentGlobalEurToInrRate;
};

export const convertEurToInr = (eurAmount: number, rate?: number): number => {
  const effectiveRate = rate && rate > 0 ? rate : currentGlobalEurToInrRate;
  return Math.round(eurAmount * effectiveRate);
};

export const convertInrToEur = (inrAmount: number, rate?: number): number => {
  const effectiveRate = rate && rate > 0 ? rate : currentGlobalEurToInrRate;
  return Math.round((inrAmount / effectiveRate) * 100) / 100;
};

export const formatRawInr = (inrAmount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Math.round(inrAmount));
};

export const formatRawEur = (eurAmount: number): string => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(eurAmount);
};

export const formatCurrency = (
  amount: number, 
  currency: CurrencyCode = 'INR',
  exchangeRate?: number
): string => {
  if (currency === 'INR') {
    const effectiveRate = exchangeRate && exchangeRate > 0 ? exchangeRate : currentGlobalEurToInrRate;
    const inrValue = Math.round(amount * effectiveRate);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(inrValue);
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


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

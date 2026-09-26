export type CurrencyCode = 'INR' | 'EUR';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  partnerCode: string; // unique code this user shares
  vaultId: string;     // couple vault ID they belong to
  createdAt: string;
}

export interface CoupleVault {
  id: string;
  inviteCode: string;
  name: string;
  partner1: UserProfile;
  partner2?: UserProfile;
  currency: CurrencyCode;
  monthlyBudget: number;
  myBudget?: number;
  partnerBudget?: number;
  createdAt: string;
}

export interface BudgetsConfig {
  couple: number;
  me: number;
  partner: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  isDefault?: boolean;
  type: 'expense' | 'income' | 'both';
}

export type PaymentMethod = 
  | 'Credit Card' 
  | 'Cash' 
  | 'Bank Transfer' 
  | 'UPI / Pix' 
  | 'Debit Card' 
  | 'Crypto' 
  | 'Other'
  | 'None';

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: 'expense' | 'income';
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  paymentMethod?: PaymentMethod;
  date: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  isShared: boolean;
  notes?: string;
  createdAt: string;
}

export interface GoalContribution {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  date: string;
  note?: string;
}

export interface FinanceGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  color: string;
  icon: string;
  createdByUserId: string;
  createdByUserName: string;
  isShared: boolean;
  contributions: GoalContribution[];
  notes?: string;
}

export interface StockInvestment {
  id: string;
  assetName: string;
  ticker?: string;
  shares?: number;
  investedAmount: number;
  monthYear: string;
  date: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  notes?: string;
}

export interface BillItem {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  categoryName: string;
  categoryColor: string;
  isPaid: boolean;
  paidDate?: string;
  paidByUserId?: string;
  paidByUserName?: string;
  recurring: 'none' | 'monthly' | 'yearly';
}

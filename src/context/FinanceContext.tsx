import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { 
  UserProfile, 
  CoupleVault, 
  Transaction, 
  FinanceGoal, 
  StockInvestment, 
  BillItem, 
  Category, 
  CurrencyCode 
} from '../types/finance';
import { CloudStore } from '../services/cloudSync';
import { pullSharedData, pushSharedData, SharedVaultData } from '../services/partnerLink';

const profilesMatch = (left?: UserProfile, right?: UserProfile) =>
  left === right || (!!left && !!right &&
    left.id === right.id &&
    left.name === right.name &&
    left.email === right.email &&
    left.avatarUrl === right.avatarUrl &&
    left.partnerCode === right.partnerCode &&
    left.vaultId === right.vaultId &&
    left.createdAt === right.createdAt);

interface FinanceContextType {
  currentUser: UserProfile | null;
  vault: CoupleVault | null;
  partner?: UserProfile;
  transactions: Transaction[];
  categories: Category[];
  goals: FinanceGoal[];
  stocks: StockInvestment[];
  bills: BillItem[];
  currency: CurrencyCode;
  activeTab: string;
  viewMode: 'both' | 'me' | 'partner';
  isSyncing: boolean;
  isOnboarded: boolean;

  // Auth
  completeOnboarding: (user: UserProfile, vault: CoupleVault, sharedData?: SharedVaultData | null) => void;

  // Navigation & View Actions
  setActiveTab: (tab: string) => void;
  setViewMode: (mode: 'both' | 'me' | 'partner') => void;
  setCurrency: (c: CurrencyCode) => void;

  // User & Partner Actions
  updateCurrentUserProfile: (updated: Partial<UserProfile>) => void;

  // Transaction Actions
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => void;
  deleteTransaction: (id: string) => void;

  // Category Actions
  addCategory: (cat: Omit<Category, 'id'>) => void;

  // Goal Actions
  addGoal: (goal: Omit<FinanceGoal, 'id' | 'currentAmount' | 'contributions'>) => void;
  contributeToGoal: (goalId: string, amount: number, note?: string) => void;
  deleteGoal: (id: string) => void;

  // Stock Actions
  addStock: (stock: Omit<StockInvestment, 'id'>) => void;
  deleteStock: (id: string) => void;

  // Bill Actions
  addBill: (bill: Omit<BillItem, 'id' | 'isPaid'>) => void;
  markBillAsPaid: (billId: string) => void;
  deleteBill: (id: string) => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOnboarded, setIsOnboarded] = useState<boolean>(CloudStore.isOnboarded());
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(CloudStore.getCurrentUser());
  const [vault, setVault] = useState<CoupleVault | null>(CloudStore.getVault());
  const [transactions, setTransactions] = useState<Transaction[]>(CloudStore.getTransactions());
  const [categories, setCategories] = useState<Category[]>(CloudStore.getCategories());
  const [goals, setGoals] = useState<FinanceGoal[]>(CloudStore.getGoals());
  const [stocks, setStocks] = useState<StockInvestment[]>(CloudStore.getStocks());
  const [bills, setBills] = useState<BillItem[]>(CloudStore.getBills());
  const [currency, setCurrencyState] = useState<CurrencyCode>(CloudStore.getCurrency());
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [viewMode, setViewMode] = useState<'both' | 'me' | 'partner'>('both');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Determine partner profile
  const partner = useMemo<UserProfile | undefined>(() => {
    if (!vault || !currentUser) return undefined;
    if (vault.partner1.id === currentUser.id) return vault.partner2;
    return vault.partner1;
  }, [vault, currentUser]);

  // Flash syncing indicator
  const triggerSyncFlash = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 800);
  };

  // Push current state to kvdb so partner gets it
  const pushToCloud = useCallback(async (overrides?: Partial<SharedVaultData>) => {
    if (!vault) return;
    const data: SharedVaultData = {
      vault,
      partner1Profile: vault.partner1,
      partner2Profile: vault.partner2,
      transactions: overrides?.transactions ?? transactions,
      goals: overrides?.goals ?? goals,
      stocks: overrides?.stocks ?? stocks,
      bills: overrides?.bills ?? bills,
      categories: overrides?.categories ?? categories,
      currency: overrides?.currency ?? currency,
      updatedAt: Date.now(),
      ...overrides,
    };
    await pushSharedData(vault.id, data);
  }, [vault, transactions, goals, stocks, bills, categories, currency]);

  // Pull shared state from kvdb
  const pullFromCloud = useCallback(async () => {
    if (!vault) return;
    const data = await pullSharedData(vault.id) as SharedVaultData | null;
    if (!data) return;
    triggerSyncFlash();
    if (data.transactions) { setTransactions(data.transactions as Transaction[]); CloudStore.saveTransactions(data.transactions as Transaction[]); }
    if (data.goals)        { setGoals(data.goals as FinanceGoal[]);               CloudStore.saveGoals(data.goals as FinanceGoal[]); }
    if (data.stocks)       { setStocks(data.stocks as StockInvestment[]);          CloudStore.saveStocks(data.stocks as StockInvestment[]); }
    if (data.bills)        { setBills(data.bills as BillItem[]);                   CloudStore.saveBills(data.bills as BillItem[]); }
    if (data.categories)   { setCategories(data.categories as Category[]);         CloudStore.saveCategories(data.categories as Category[]); }
    if (data.currency)     { setCurrencyState(data.currency as CurrencyCode);      CloudStore.saveCurrency(data.currency as CurrencyCode); }
    if (data.vault && vault) {
      const partner1 = data.vault.partner1 ?? vault.partner1;
      const partner2 = data.vault.partner2 ?? vault.partner2;
      if (!profilesMatch(partner1, vault.partner1) || !profilesMatch(partner2, vault.partner2)) {
        const updatedVault = { ...vault, partner1, partner2 };
        setVault(updatedVault);
        CloudStore.saveVault(updatedVault);
      }
    }
  }, [vault]);

  // Poll cloud every 15 seconds if vault is set
  useEffect(() => {
    if (!vault?.id) return;
    pullFromCloud();
    const interval = setInterval(pullFromCloud, 15000);
    return () => clearInterval(interval);
  }, [pullFromCloud]);

  // Also sync on app focus
  useEffect(() => {
    const onFocus = () => { if (vault?.id) pullFromCloud(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [vault?.id, pullFromCloud]);

  // Listen to cross-window / real-time cloud broadcast sync
  useEffect(() => {
    const unsubscribe = CloudStore.onSync((type, payload) => {
      triggerSyncFlash();
      if (type === 'transactions_updated') setTransactions(payload as Transaction[]);
      if (type === 'goals_updated')        setGoals(payload as FinanceGoal[]);
      if (type === 'stocks_updated')       setStocks(payload as StockInvestment[]);
      if (type === 'bills_updated')        setBills(payload as BillItem[]);
      if (type === 'categories_updated')   setCategories(payload as Category[]);
      if (type === 'vault_updated')        setVault(payload as CoupleVault);
      if (type === 'currency_updated')     setCurrencyState(payload as CurrencyCode);
    });
    return unsubscribe;
  }, []);

  /* ─── Onboarding ──────────────────────────────────────────────────────── */
  const completeOnboarding = (user: UserProfile, v: CoupleVault, sharedData?: SharedVaultData | null) => {
    const completedVault: CoupleVault = sharedData?.vault
      ? {
          ...sharedData.vault,
          ...v,
          partner1: v.partner1,
          partner2: v.partner2 ?? sharedData.vault.partner2,
        }
      : v;
    const initialTransactions = (sharedData?.transactions ?? []) as Transaction[];
    const initialGoals = (sharedData?.goals ?? []) as FinanceGoal[];
    const initialStocks = (sharedData?.stocks ?? []) as StockInvestment[];
    const initialBills = (sharedData?.bills ?? []) as BillItem[];
    const initialCategories = (sharedData?.categories?.length ? sharedData.categories : CloudStore.getCategories()) as Category[];
    const initialCurrency = sharedData?.currency ?? 'INR';

    CloudStore.saveCurrentUser(user);
    CloudStore.saveVault(completedVault);
    CloudStore.saveTransactions(initialTransactions);
    CloudStore.saveGoals(initialGoals);
    CloudStore.saveStocks(initialStocks);
    CloudStore.saveBills(initialBills);
    CloudStore.saveCategories(initialCategories);
    CloudStore.saveCurrency(initialCurrency as CurrencyCode);
    CloudStore.setOnboarded(true);
    setCurrentUser(user);
    setVault(completedVault);
    setTransactions(initialTransactions);
    setGoals(initialGoals);
    setStocks(initialStocks);
    setBills(initialBills);
    setCategories(initialCategories);
    setCurrencyState(initialCurrency as CurrencyCode);
    setIsOnboarded(true);
    // Preserve existing shared records when the second partner joins.
    pushSharedData(v.id, {
      vault: completedVault,
      partner1Profile: completedVault.partner1,
      partner2Profile: completedVault.partner2,
      transactions: initialTransactions,
      goals: initialGoals,
      stocks: initialStocks,
      bills: initialBills,
      categories: initialCategories,
      currency: initialCurrency,
      updatedAt: Date.now(),
    });
  };

  /* ─── Currency ────────────────────────────────────────────────────────── */
  const setCurrency = (c: CurrencyCode) => {
    setCurrencyState(c);
    CloudStore.saveCurrency(c);
    triggerSyncFlash();
    pushToCloud({ currency: c });
  };

  /* ─── User profile ────────────────────────────────────────────────────── */
  const updateCurrentUserProfile = (updated: Partial<UserProfile>) => {
    if (!currentUser) return;
    const newUser = { ...currentUser, ...updated };
    setCurrentUser(newUser);
    CloudStore.saveCurrentUser(newUser);
    if (vault) {
      const updatedVault = { ...vault };
      if (updatedVault.partner1.id === newUser.id) updatedVault.partner1 = newUser;
      else if (updatedVault.partner2?.id === newUser.id) updatedVault.partner2 = newUser;
      setVault(updatedVault);
      CloudStore.saveVault(updatedVault);
      pushToCloud({ vault: updatedVault });
    }
    triggerSyncFlash();
  };

  /* ─── Transactions ────────────────────────────────────────────────────── */
  const addTransaction = (tx: Omit<Transaction, 'id' | 'createdAt'>) => {
    const newTx: Transaction = { ...tx, id: 'tx-' + Date.now(), createdAt: new Date().toISOString() };
    const updated = [newTx, ...transactions];
    setTransactions(updated);
    CloudStore.saveTransactions(updated);
    triggerSyncFlash();
    pushToCloud({ transactions: updated });
  };

  const deleteTransaction = (id: string) => {
    const updated = transactions.filter(t => t.id !== id);
    setTransactions(updated);
    CloudStore.saveTransactions(updated);
    triggerSyncFlash();
    pushToCloud({ transactions: updated });
  };

  /* ─── Categories ──────────────────────────────────────────────────────── */
  const addCategory = (cat: Omit<Category, 'id'>) => {
    const newCat: Category = { ...cat, id: 'cat-' + Date.now() };
    const updated = [...categories, newCat];
    setCategories(updated);
    CloudStore.saveCategories(updated);
    triggerSyncFlash();
    pushToCloud({ categories: updated });
  };

  /* ─── Goals ───────────────────────────────────────────────────────────── */
  const addGoal = (goal: Omit<FinanceGoal, 'id' | 'currentAmount' | 'contributions'>) => {
    const newGoal: FinanceGoal = { ...goal, id: 'goal-' + Date.now(), currentAmount: 0, contributions: [] };
    const updated = [newGoal, ...goals];
    setGoals(updated);
    CloudStore.saveGoals(updated);
    triggerSyncFlash();
    pushToCloud({ goals: updated });
  };

  const contributeToGoal = (goalId: string, amount: number, note?: string) => {
    if (!currentUser) return;
    const updated = goals.map(goal => {
      if (goal.id !== goalId) return goal;
      return {
        ...goal,
        currentAmount: goal.currentAmount + amount,
        contributions: [
          { id: 'c-' + Date.now(), userId: currentUser.id, userName: currentUser.name, amount, date: new Date().toISOString().split('T')[0], note: note || `Added by ${currentUser.name}` },
          ...goal.contributions,
        ],
      };
    });
    setGoals(updated);
    CloudStore.saveGoals(updated);
    addTransaction({
      title: `Goal Savings: ${goals.find(g => g.id === goalId)?.title || 'Goal'}`,
      amount, type: 'expense',
      categoryId: 'cat-investment', categoryName: 'Investment',
      categoryColor: '#3B82F6', categoryIcon: 'TrendingUp',
      paymentMethod: 'Bank Transfer',
      date: new Date().toISOString().split('T')[0],
      userId: currentUser.id, userName: currentUser.name,
      userAvatar: currentUser.avatarUrl,
      isShared: true, notes: note || 'Contribution towards couple goal',
    });
    triggerSyncFlash();
    pushToCloud({ goals: updated });
  };

  const deleteGoal = (id: string) => {
    const updated = goals.filter(g => g.id !== id);
    setGoals(updated);
    CloudStore.saveGoals(updated);
    triggerSyncFlash();
    pushToCloud({ goals: updated });
  };

  /* ─── Stocks ──────────────────────────────────────────────────────────── */
  const addStock = (stock: Omit<StockInvestment, 'id'>) => {
    const newStock: StockInvestment = { ...stock, id: 'stk-' + Date.now() };
    const updated = [newStock, ...stocks];
    setStocks(updated);
    CloudStore.saveStocks(updated);
    addTransaction({
      title: `Stock Investment: ${newStock.assetName}${newStock.ticker ? ` (${newStock.ticker})` : ''}`,
      amount: newStock.investedAmount, type: 'expense',
      categoryId: 'cat-investment', categoryName: 'Investment',
      categoryColor: '#3B82F6', categoryIcon: 'TrendingUp',
      paymentMethod: 'Bank Transfer',
      date: newStock.date,
      userId: newStock.userId, userName: newStock.userName,
      userAvatar: newStock.userAvatar, isShared: true,
      notes: newStock.notes || `Stock investment by ${newStock.userName}`,
    });
    triggerSyncFlash();
    pushToCloud({ stocks: updated });
  };

  const deleteStock = (id: string) => {
    const updated = stocks.filter(s => s.id !== id);
    setStocks(updated);
    CloudStore.saveStocks(updated);
    triggerSyncFlash();
    pushToCloud({ stocks: updated });
  };

  /* ─── Bills ───────────────────────────────────────────────────────────── */
  const addBill = (bill: Omit<BillItem, 'id' | 'isPaid'>) => {
    const newBill: BillItem = { ...bill, id: 'bill-' + Date.now(), isPaid: false };
    const updated = [newBill, ...bills];
    setBills(updated);
    CloudStore.saveBills(updated);
    triggerSyncFlash();
    pushToCloud({ bills: updated });
  };

  const markBillAsPaid = (billId: string) => {
    if (!currentUser) return;
    let paidBill: BillItem | undefined;
    const updated = bills.map(b => {
      if (b.id !== billId) return b;
      paidBill = { ...b, isPaid: true, paidDate: new Date().toISOString().split('T')[0], paidByUserId: currentUser.id, paidByUserName: currentUser.name };
      return paidBill;
    });
    setBills(updated);
    CloudStore.saveBills(updated);
    if (paidBill) {
      addTransaction({
        title: `Bill Paid: ${paidBill.title}`, amount: paidBill.amount, type: 'expense',
        categoryId: 'cat-utilities', categoryName: paidBill.categoryName || 'Utilities',
        categoryColor: paidBill.categoryColor || '#F97316', categoryIcon: 'Zap',
        paymentMethod: 'UPI / Pix',
        date: new Date().toISOString().split('T')[0],
        userId: currentUser.id, userName: currentUser.name, userAvatar: currentUser.avatarUrl,
        isShared: true, notes: `Paid on ${new Date().toLocaleDateString()}`,
      });
    }
    triggerSyncFlash();
    pushToCloud({ bills: updated });
  };

  const deleteBill = (id: string) => {
    const updated = bills.filter(b => b.id !== id);
    setBills(updated);
    CloudStore.saveBills(updated);
    triggerSyncFlash();
    pushToCloud({ bills: updated });
  };

  return (
    <FinanceContext.Provider
      value={{
        currentUser, vault, partner,
        transactions, categories, goals, stocks, bills,
        currency, activeTab, viewMode, isSyncing, isOnboarded,
        completeOnboarding,
        setActiveTab, setViewMode, setCurrency,
        updateCurrentUserProfile,
        addTransaction, deleteTransaction,
        addCategory,
        addGoal, contributeToGoal, deleteGoal,
        addStock, deleteStock,
        addBill, markBillAsPaid, deleteBill,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) throw new Error('useFinance must be used within a FinanceProvider');
  return context;
};

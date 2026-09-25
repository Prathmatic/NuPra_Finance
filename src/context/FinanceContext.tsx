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
import {
  FinanceSnapshot,
  loadWorkspace,
  saveProfile,
  saveFinanceSnapshot,
  signOut as signOutFromSupabase,
  subscribeToVaultState,
} from '../services/supabaseFinance';
import { getSupabase, isSupabaseConfigured } from '../services/supabaseClient';

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
  isAuthLoading: boolean;
  isBackendConfigured: boolean;
  authError: string;

  // Auth
  completeOnboarding: (user: UserProfile, vault: CoupleVault) => Promise<void>;
  signOut: () => void;

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

const emptySnapshot = (): FinanceSnapshot => ({
  transactions: [],
  goals: [],
  stocks: [],
  bills: [],
  categories: CloudStore.getCategories(),
  currency: 'INR',
});

const createRecordId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

export const FinanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [vault, setVault] = useState<CoupleVault | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>(CloudStore.getCategories());
  const [goals, setGoals] = useState<FinanceGoal[]>([]);
  const [stocks, setStocks] = useState<StockInvestment[]>([]);
  const [bills, setBills] = useState<BillItem[]>([]);
  const [currency, setCurrencyState] = useState<CurrencyCode>('INR');
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [viewMode, setViewMode] = useState<'both' | 'me' | 'partner'>('both');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  // Determine partner profile
  const partner = useMemo<UserProfile | undefined>(() => {
    if (!vault || !currentUser) return undefined;
    if (vault.partner1.id === currentUser.id) return vault.partner2;
    return vault.partner1;
  }, [vault, currentUser]);

  // Flash syncing indicator
  const triggerSyncFlash = useCallback(() => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 800);
  }, []);

  const applyWorkspaceSnapshot = useCallback((snapshot: FinanceSnapshot) => {
    setTransactions(snapshot.transactions);
    setGoals(snapshot.goals);
    setStocks(snapshot.stocks);
    setBills(snapshot.bills);
    setCategories(snapshot.categories);
    setCurrencyState(snapshot.currency);
    CloudStore.saveTransactions(snapshot.transactions);
    CloudStore.saveGoals(snapshot.goals);
    CloudStore.saveStocks(snapshot.stocks);
    CloudStore.saveBills(snapshot.bills);
    CloudStore.saveCategories(snapshot.categories);
    CloudStore.saveCurrency(snapshot.currency);
  }, []);

  const pushToCloud = useCallback(async (overrides?: Partial<FinanceSnapshot>) => {
    if (!vault) return;
    const snapshot: FinanceSnapshot = {
      transactions: overrides?.transactions ?? transactions,
      goals: overrides?.goals ?? goals,
      stocks: overrides?.stocks ?? stocks,
      bills: overrides?.bills ?? bills,
      categories: overrides?.categories ?? categories,
      currency: overrides?.currency ?? currency,
    };
    try {
      await saveFinanceSnapshot(vault.id, snapshot);
      setAuthError('');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Could not sync finance data.');
    }
  }, [vault, transactions, goals, stocks, bills, categories, currency]);

  // Pull the authenticated user's current workspace and partner profile.
  const pullFromCloud = useCallback(async () => {
    try {
      const workspace = await loadWorkspace();
      if (!workspace.currentUser || !workspace.vault) return;
      setCurrentUser(workspace.currentUser);
      setVault(workspace.vault);
      applyWorkspaceSnapshot(workspace.snapshot ?? emptySnapshot());
      setIsOnboarded(Boolean(workspace.partner));
      setAuthError('');
      triggerSyncFlash();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Could not load your couple vault.');
    }
  }, [applyWorkspaceSnapshot, triggerSyncFlash]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsAuthLoading(false);
      return;
    }

    let active = true;
    const initializeSession = async (userId: string | null) => {
      if (!active) return;
      try {
        if (!userId) {
          setCurrentUser(null);
          setVault(null);
          setTransactions([]);
          setGoals([]);
          setStocks([]);
          setBills([]);
          setCategories(CloudStore.getCategories());
          setCurrencyState('INR');
          setIsOnboarded(false);
          CloudStore.clearAll();
          setAuthError('');
          return;
        }
        const workspace = await loadWorkspace();
        if (!active) return;
        setCurrentUser(workspace.currentUser);
        setVault(workspace.vault);
        if (workspace.snapshot) applyWorkspaceSnapshot(workspace.snapshot);
        else applyWorkspaceSnapshot(emptySnapshot());
        setIsOnboarded(Boolean(workspace.currentUser && workspace.vault && workspace.partner));
        setAuthError('');
      } catch (error) {
        if (active) setAuthError(error instanceof Error ? error.message : 'Could not load your account.');
      } finally {
        if (active) setIsAuthLoading(false);
      }
    };

    const { data: { subscription } } = getSupabase().auth.onAuthStateChange((_event, session) => {
      queueMicrotask(() => void initializeSession(session?.user.id ?? null));
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [applyWorkspaceSnapshot]);

  // Realtime updates are primary; polling covers reconnects and suspended mobile apps.
  useEffect(() => {
    if (!vault?.id) return;
    const channel = subscribeToVaultState(vault.id, () => { void pullFromCloud(); });
    void pullFromCloud();
    const interval = setInterval(pullFromCloud, 15000);
    return () => {
      clearInterval(interval);
      void getSupabase().removeChannel(channel);
    };
  }, [vault?.id, pullFromCloud]);

  // Also sync on app focus
  useEffect(() => {
    const onFocus = () => { if (vault?.id) pullFromCloud(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [vault?.id, pullFromCloud]);

  // Keep other app tabs on this device aligned with the local cache.
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
  }, [triggerSyncFlash]);

  /* ─── Onboarding ──────────────────────────────────────────────────────── */
  const completeOnboarding = async (user: UserProfile, fallbackVault: CoupleVault) => {
    setAuthError('');
    try {
      const workspace = await loadWorkspace();
      if (!workspace.currentUser) throw new Error('Your verified profile could not be loaded.');
      if (!workspace.vault) throw new Error('Your couple vault could not be loaded.');
      const completedVault = workspace.vault ?? fallbackVault;
      const baseSnapshot = workspace.snapshot ?? emptySnapshot();
      const snapshot = baseSnapshot.categories.length
        ? baseSnapshot
        : { ...baseSnapshot, categories: CloudStore.getCategories() };
      if (!baseSnapshot.categories.length) {
        await saveFinanceSnapshot(completedVault.id, snapshot);
      }

      CloudStore.saveCurrentUser(workspace.currentUser ?? user);
      CloudStore.saveVault(completedVault);
      CloudStore.setOnboarded(Boolean(workspace.partner));
      setCurrentUser(workspace.currentUser ?? user);
      setVault(completedVault);
      applyWorkspaceSnapshot(snapshot);
      setIsOnboarded(Boolean(workspace.partner));
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Could not finish account setup.');
      throw error;
    }
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
    void saveProfile(newUser).catch(error => {
      setAuthError(error instanceof Error ? error.message : 'Could not save your profile.');
    });
    if (vault) {
      const updatedVault = { ...vault };
      if (updatedVault.partner1.id === newUser.id) updatedVault.partner1 = newUser;
      else if (updatedVault.partner2?.id === newUser.id) updatedVault.partner2 = newUser;
      setVault(updatedVault);
      CloudStore.saveVault(updatedVault);
    }
    triggerSyncFlash();
  };

  const handleSignOut = () => {
    void signOutFromSupabase().catch(error => {
      setAuthError(error instanceof Error ? error.message : 'Could not sign out.');
    });
  };

  /* ─── Transactions ────────────────────────────────────────────────────── */
  const addTransaction = (tx: Omit<Transaction, 'id' | 'createdAt'>) => {
    const newTx: Transaction = { ...tx, id: createRecordId('tx'), createdAt: new Date().toISOString() };
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
    const newCat: Category = { ...cat, id: createRecordId('cat') };
    const updated = [...categories, newCat];
    setCategories(updated);
    CloudStore.saveCategories(updated);
    triggerSyncFlash();
    pushToCloud({ categories: updated });
  };

  /* ─── Goals ───────────────────────────────────────────────────────────── */
  const addGoal = (goal: Omit<FinanceGoal, 'id' | 'currentAmount' | 'contributions'>) => {
    const newGoal: FinanceGoal = { ...goal, id: createRecordId('goal'), currentAmount: 0, contributions: [] };
    const updated = [newGoal, ...goals];
    setGoals(updated);
    CloudStore.saveGoals(updated);
    triggerSyncFlash();
    pushToCloud({ goals: updated });
  };

  const contributeToGoal = (goalId: string, amount: number, note?: string) => {
    if (!currentUser) return;
    const existingGoal = goals.find(goal => goal.id === goalId);
    if (!existingGoal) return;
    const updatedGoals = goals.map(goal => {
      if (goal.id !== goalId) return goal;
      return {
        ...goal,
        currentAmount: goal.currentAmount + amount,
        contributions: [
          { id: createRecordId('c'), userId: currentUser.id, userName: currentUser.name, amount, date: new Date().toISOString().split('T')[0], note: note || `Added by ${currentUser.name}` },
          ...goal.contributions,
        ],
      };
    });
    const transaction: Transaction = {
      id: createRecordId('tx'),
      title: `Goal Savings: ${existingGoal.title}`,
      amount, type: 'expense',
      categoryId: 'cat-investment', categoryName: 'Investment',
      categoryColor: '#3B82F6', categoryIcon: 'TrendingUp',
      paymentMethod: 'Bank Transfer',
      date: new Date().toISOString().split('T')[0],
      userId: currentUser.id, userName: currentUser.name,
      userAvatar: currentUser.avatarUrl,
      isShared: true, notes: note || 'Contribution towards couple goal',
      createdAt: new Date().toISOString(),
    };
    const updatedTransactions = [transaction, ...transactions];
    setGoals(updatedGoals);
    CloudStore.saveGoals(updatedGoals);
    setTransactions(updatedTransactions);
    CloudStore.saveTransactions(updatedTransactions);
    triggerSyncFlash();
    pushToCloud({ goals: updatedGoals, transactions: updatedTransactions });
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
    const newStock: StockInvestment = { ...stock, id: createRecordId('stk') };
    const updatedStocks = [newStock, ...stocks];
    const transaction: Transaction = {
      id: createRecordId('tx'),
      title: `Stock Investment: ${newStock.assetName}${newStock.ticker ? ` (${newStock.ticker})` : ''}`,
      amount: newStock.investedAmount, type: 'expense',
      categoryId: 'cat-investment', categoryName: 'Investment',
      categoryColor: '#3B82F6', categoryIcon: 'TrendingUp',
      paymentMethod: 'Bank Transfer',
      date: newStock.date,
      userId: newStock.userId, userName: newStock.userName,
      userAvatar: newStock.userAvatar, isShared: true,
      notes: newStock.notes || `Stock investment by ${newStock.userName}`,
      createdAt: new Date().toISOString(),
    };
    const updatedTransactions = [transaction, ...transactions];
    setStocks(updatedStocks);
    CloudStore.saveStocks(updatedStocks);
    setTransactions(updatedTransactions);
    CloudStore.saveTransactions(updatedTransactions);
    triggerSyncFlash();
    pushToCloud({ stocks: updatedStocks, transactions: updatedTransactions });
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
    const newBill: BillItem = { ...bill, id: createRecordId('bill'), isPaid: false };
    const updated = [newBill, ...bills];
    setBills(updated);
    CloudStore.saveBills(updated);
    triggerSyncFlash();
    pushToCloud({ bills: updated });
  };

  const markBillAsPaid = (billId: string) => {
    if (!currentUser) return;
    let paidBill: BillItem | undefined;
    const updatedBills = bills.map(b => {
      if (b.id !== billId) return b;
      paidBill = { ...b, isPaid: true, paidDate: new Date().toISOString().split('T')[0], paidByUserId: currentUser.id, paidByUserName: currentUser.name };
      return paidBill;
    });
    if (!paidBill) return;
    const transaction: Transaction = {
      id: createRecordId('tx'),
      title: `Bill Paid: ${paidBill.title}`, amount: paidBill.amount, type: 'expense',
      categoryId: 'cat-utilities', categoryName: paidBill.categoryName || 'Utilities',
      categoryColor: paidBill.categoryColor || '#F97316', categoryIcon: 'Zap',
      paymentMethod: 'UPI / Pix',
      date: new Date().toISOString().split('T')[0],
      userId: currentUser.id, userName: currentUser.name, userAvatar: currentUser.avatarUrl,
      isShared: true, notes: `Paid on ${new Date().toLocaleDateString()}`,
      createdAt: new Date().toISOString(),
    };
    const updatedTransactions = [transaction, ...transactions];
    setBills(updatedBills);
    CloudStore.saveBills(updatedBills);
    setTransactions(updatedTransactions);
    CloudStore.saveTransactions(updatedTransactions);
    triggerSyncFlash();
    pushToCloud({ bills: updatedBills, transactions: updatedTransactions });
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
        isAuthLoading,
        isBackendConfigured: isSupabaseConfigured,
        authError,
        completeOnboarding,
        signOut: handleSignOut,
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

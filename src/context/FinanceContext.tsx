import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useMemo, useCallback } from 'react';
import { 
  UserProfile, 
  CoupleVault, 
  Transaction, 
  FinanceGoal, 
  StockInvestment, 
  BillItem, 
  Category, 
  CurrencyCode,
  BudgetsConfig 
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
import { Toast, ToastMessage } from '../components/common/Toast';

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

  // Toast notifications
  toast: ToastMessage | null;
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  dismissToast: () => void;

  // Month navigation
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;

  // Budgets (default 0)
  budgets: BudgetsConfig;
  updateBudgets: (newBudgets: BudgetsConfig) => void;

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
  updateTransaction: (tx: Transaction) => void;
  deleteTransaction: (id: string) => void;

  // Category Actions
  addCategory: (cat: Omit<Category, 'id'>) => string;

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

  // Sync
  refreshSync: () => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

const emptySnapshot = (): FinanceSnapshot => ({
  transactions: [],
  goals: [],
  stocks: [],
  bills: [],
  categories: CloudStore.getCategories(),
  currency: 'INR',
  budgets: { couple: 0, me: 0, partner: 0 },
});

const createRecordId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

export const FinanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize state from local cache so previously saved data is immediately available
  const [isOnboarded, setIsOnboarded] = useState<boolean>(() => CloudStore.isOnboarded());
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => CloudStore.getCurrentUser());
  const [vault, setVault] = useState<CoupleVault | null>(() => CloudStore.getVault());
  const [transactions, setTransactions] = useState<Transaction[]>(() => CloudStore.getTransactions());
  const [categories, setCategories] = useState<Category[]>(() => CloudStore.getCategories());
  const [goals, setGoals] = useState<FinanceGoal[]>(() => CloudStore.getGoals());
  const [stocks, setStocks] = useState<StockInvestment[]>(() => CloudStore.getStocks());
  const [bills, setBills] = useState<BillItem[]>(() => CloudStore.getBills());
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => CloudStore.getCurrency());
  const [budgets, setBudgets] = useState<BudgetsConfig>(() => CloudStore.getBudgets());

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [viewMode, setViewMode] = useState<'both' | 'me' | 'partner'>('both');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  // Synchronous refs to prevent stale closures during rapid writes & network pulls
  const transactionsRef = useRef<Transaction[]>(transactions);
  const goalsRef = useRef<FinanceGoal[]>(goals);
  const stocksRef = useRef<StockInvestment[]>(stocks);
  const billsRef = useRef<BillItem[]>(bills);
  const categoriesRef = useRef<Category[]>(categories);
  const currencyRef = useRef<CurrencyCode>(currency);
  const budgetsRef = useRef<BudgetsConfig>(budgets);
  const vaultRef = useRef<CoupleVault | null>(vault);

  // Tombstones to prevent deleted items from resurrecting on snapshot sync
  const deletedTxIdsRef = useRef<Set<string>>(new Set());
  const deletedGoalIdsRef = useRef<Set<string>>(new Set());
  const deletedStockIdsRef = useRef<Set<string>>(new Set());
  const deletedBillIdsRef = useRef<Set<string>>(new Set());

  // Synchronize refs when state updates
  useEffect(() => { transactionsRef.current = transactions; }, [transactions]);
  useEffect(() => { goalsRef.current = goals; }, [goals]);
  useEffect(() => { stocksRef.current = stocks; }, [stocks]);
  useEffect(() => { billsRef.current = bills; }, [bills]);
  useEffect(() => { categoriesRef.current = categories; }, [categories]);
  useEffect(() => { currencyRef.current = currency; }, [currency]);
  useEffect(() => { budgetsRef.current = budgets; }, [budgets]);
  useEffect(() => { vaultRef.current = vault; }, [vault]);

  // Global month/year filter (defaults to current month: YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => 
    new Date().toISOString().slice(0, 7)
  );

  // Global Toast notification state
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ id: `${Date.now()}-${Math.random()}`, message, type });
  }, []);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  const goToPreviousMonth = useCallback(() => {
    setSelectedMonth(prev => {
      const [year, month] = prev.split('-').map(Number);
      const prevDate = new Date(year, month - 2, 1);
      return `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setSelectedMonth(prev => {
      const [year, month] = prev.split('-').map(Number);
      const nextDate = new Date(year, month, 1);
      return `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
    });
  }, []);

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

  const sortTransactionsDesc = (txs: Transaction[]): Transaction[] => {
    return [...txs].sort((a, b) => {
      const dateA = a?.date || '';
      const dateB = b?.date || '';
      const createdA = a?.createdAt || '';
      const createdB = b?.createdAt || '';
      return dateB.localeCompare(dateA) || createdB.localeCompare(createdA);
    });
  };

  const pushToCloud = useCallback(async (overrides?: Partial<FinanceSnapshot>) => {
    const targetVault = vaultRef.current || CloudStore.getVault();
    if (!targetVault?.id) return;

    const snapshotToSave: FinanceSnapshot = {
      transactions: overrides?.transactions ?? transactionsRef.current,
      goals: overrides?.goals ?? goalsRef.current,
      stocks: overrides?.stocks ?? stocksRef.current,
      bills: overrides?.bills ?? billsRef.current,
      categories: overrides?.categories ?? categoriesRef.current,
      currency: overrides?.currency ?? currencyRef.current,
      budgets: overrides?.budgets ?? budgetsRef.current,
    };

    try {
      await saveFinanceSnapshot(targetVault.id, snapshotToSave);
      setAuthError('');
    } catch (error) {
      console.error('Failed to sync finance snapshot to Supabase:', error);
      const msg = error instanceof Error ? error.message : 'Could not sync finance data.';
      setAuthError(msg);
      // Auto-retry once in case of network fluctuation
      setTimeout(async () => {
        try {
          const retryVault = vaultRef.current || CloudStore.getVault();
          if (retryVault?.id) {
            await saveFinanceSnapshot(retryVault.id, snapshotToSave);
            setAuthError('');
          }
        } catch (retryError) {
          console.error('Retry push to Supabase also failed:', retryError);
        }
      }, 3000);
    }
  }, []);

  const applyWorkspaceSnapshot = useCallback((snapshot: FinanceSnapshot) => {
    // 1. Transactions merge: keep remote + local pending transactions not on remote, excluding deleted
    const remoteTxs = snapshot.transactions || [];
    const remoteTxMap = new Map<string, Transaction>(remoteTxs.map(t => [t.id, t]));
    const deletedTxs = deletedTxIdsRef.current;
    
    // Find local transactions that aren't yet on remote and haven't been deleted
    const pendingLocalTxs = (transactionsRef.current || []).filter(
      t => t && !remoteTxMap.has(t.id) && !deletedTxs.has(t.id)
    );
    
    // Filter out locally deleted transactions from remote
    const validRemoteTxs = remoteTxs.filter(t => !deletedTxs.has(t.id));
    
    // Combine both: remote takes precedence for existing, pending local are preserved
    const mergedTxs = sortTransactionsDesc([...validRemoteTxs, ...pendingLocalTxs]);

    // Clean up deleted IDs that are now confirmed gone from remote
    deletedTxs.forEach(id => {
      if (!remoteTxMap.has(id)) deletedTxs.delete(id);
    });

    // 2. Goals merge
    const remoteGoals = snapshot.goals || [];
    const remoteGoalMap = new Map<string, FinanceGoal>(remoteGoals.map(g => [g.id, g]));
    const deletedGoals = deletedGoalIdsRef.current;
    const pendingLocalGoals = (goalsRef.current || []).filter(
      g => g && !remoteGoalMap.has(g.id) && !deletedGoals.has(g.id)
    );
    const validRemoteGoals = remoteGoals.filter(g => !deletedGoals.has(g.id));
    const mergedGoals = [...validRemoteGoals, ...pendingLocalGoals];
    deletedGoals.forEach(id => {
      if (!remoteGoalMap.has(id)) deletedGoals.delete(id);
    });

    // 3. Stocks merge
    const remoteStocks = snapshot.stocks || [];
    const remoteStockMap = new Map<string, StockInvestment>(remoteStocks.map(s => [s.id, s]));
    const deletedStocks = deletedStockIdsRef.current;
    const pendingLocalStocks = (stocksRef.current || []).filter(
      s => s && !remoteStockMap.has(s.id) && !deletedStocks.has(s.id)
    );
    const validRemoteStocks = remoteStocks.filter(s => !deletedStocks.has(s.id));
    const mergedStocks = [...validRemoteStocks, ...pendingLocalStocks];
    deletedStocks.forEach(id => {
      if (!remoteStockMap.has(id)) deletedStocks.delete(id);
    });

    // 4. Bills merge
    const remoteBills = snapshot.bills || [];
    const remoteBillMap = new Map<string, BillItem>(remoteBills.map(b => [b.id, b]));
    const deletedBills = deletedBillIdsRef.current;
    const pendingLocalBills = (billsRef.current || []).filter(
      b => b && !remoteBillMap.has(b.id) && !deletedBills.has(b.id)
    );
    const validRemoteBills = remoteBills.filter(b => !deletedBills.has(b.id));
    const mergedBills = [...validRemoteBills, ...pendingLocalBills];
    deletedBills.forEach(id => {
      if (!remoteBillMap.has(id)) deletedBills.delete(id);
    });

    // 5. Categories
    const validCategories = (snapshot.categories && snapshot.categories.length > 0)
      ? snapshot.categories.filter(c => c.id !== '__budgets_config__')
      : CloudStore.getCategories();

    // 6. Currency
    const validCurrency = snapshot.currency || 'INR';

    // 7. Budgets
    const loadedBudgets = snapshot.budgets || CloudStore.getBudgets();

    // Update state & refs
    setTransactions(mergedTxs);
    transactionsRef.current = mergedTxs;
    setGoals(mergedGoals);
    goalsRef.current = mergedGoals;
    setStocks(mergedStocks);
    stocksRef.current = mergedStocks;
    setBills(mergedBills);
    billsRef.current = mergedBills;
    setCategories(validCategories);
    categoriesRef.current = validCategories;
    setCurrencyState(validCurrency);
    currencyRef.current = validCurrency;
    setBudgets(loadedBudgets);
    budgetsRef.current = loadedBudgets;

    // Persist to local cache immediately
    CloudStore.saveTransactions(mergedTxs);
    CloudStore.saveGoals(mergedGoals);
    CloudStore.saveStocks(mergedStocks);
    CloudStore.saveBills(mergedBills);
    CloudStore.saveCategories(validCategories);
    CloudStore.saveCurrency(validCurrency);
    CloudStore.saveBudgets(loadedBudgets);

    // If there were pending local items not yet on remote, sync them to Supabase
    if (
      pendingLocalTxs.length > 0 ||
      pendingLocalGoals.length > 0 ||
      pendingLocalStocks.length > 0 ||
      pendingLocalBills.length > 0
    ) {
      pushToCloud({
        transactions: mergedTxs,
        goals: mergedGoals,
        stocks: mergedStocks,
        bills: mergedBills,
      });
    }
  }, [pushToCloud]);

  // Pull the authenticated user's current workspace and partner profile.
  const pullFromCloud = useCallback(async () => {
    try {
      const workspace = await loadWorkspace();
      if (!workspace.currentUser || !workspace.vault) return;
      setCurrentUser(workspace.currentUser);
      setVault(workspace.vault);
      vaultRef.current = workspace.vault;
      applyWorkspaceSnapshot(workspace.snapshot ?? emptySnapshot());
      setIsOnboarded(Boolean(workspace.partner));
      setAuthError('');
      triggerSyncFlash();
    } catch (error) {
      console.warn('Could not pull from cloud:', error);
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
    const activeVaultId = vault?.id || CloudStore.getVault()?.id;
    if (!activeVaultId) return;
    const channel = subscribeToVaultState(activeVaultId, () => { void pullFromCloud(); });
    void pullFromCloud();
    const interval = setInterval(pullFromCloud, 15000);
    return () => {
      clearInterval(interval);
      void getSupabase().removeChannel(channel);
    };
  }, [vault?.id, pullFromCloud]);

  // Also sync on app focus
  useEffect(() => {
    const onFocus = () => {
      const activeVaultId = vault?.id || CloudStore.getVault()?.id;
      if (activeVaultId) pullFromCloud();
    };
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
      if (type === 'budgets_updated')      setBudgets(payload as BudgetsConfig);
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
    currencyRef.current = c;
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
    showToast('Profile updated successfully', 'success');
  };

  const handleSignOut = () => {
    void signOutFromSupabase().catch(error => {
      setAuthError(error instanceof Error ? error.message : 'Could not sign out.');
    });
  };

  /* ─── Budgets ─────────────────────────────────────────────────────────── */
  const updateBudgets = useCallback((newBudgets: BudgetsConfig) => {
    setBudgets(newBudgets);
    budgetsRef.current = newBudgets;
    CloudStore.saveBudgets(newBudgets);
    const activeVault = vaultRef.current || CloudStore.getVault();
    if (activeVault) {
      const updatedVault: CoupleVault = {
        ...activeVault,
        monthlyBudget: newBudgets.couple,
        myBudget: newBudgets.me,
        partnerBudget: newBudgets.partner,
      };
      setVault(updatedVault);
      vaultRef.current = updatedVault;
      CloudStore.saveVault(updatedVault);
    }
    triggerSyncFlash();
    pushToCloud({ budgets: newBudgets });
    showToast('Monthly budgets saved successfully', 'success');
  }, [triggerSyncFlash, pushToCloud, showToast]);

  /* ─── Transactions ────────────────────────────────────────────────────── */
  const addTransaction = (tx: Omit<Transaction, 'id' | 'createdAt'>) => {
    try {
      const now = new Date().toISOString();
      const newTx: Transaction = { 
        ...tx, 
        id: createRecordId('tx'), 
        date: tx.date || now.split('T')[0],
        createdAt: now 
      };
      const safeTxs = (transactionsRef.current || []).filter(Boolean);
      const updated = sortTransactionsDesc([newTx, ...safeTxs]);
      setTransactions(updated);
      transactionsRef.current = updated;
      CloudStore.saveTransactions(updated);
      triggerSyncFlash();
      pushToCloud({ transactions: updated });
      showToast(`${tx.type === 'expense' ? 'Expense' : 'Income'} recorded successfully`, 'success');
    } catch (err) {
      console.error('Failed to add transaction:', err);
      showToast(`${tx.type === 'expense' ? 'Expense' : 'Income'} recorded successfully`, 'success');
    }
  };

  const updateTransaction = (updatedTx: Transaction) => {
    try {
      const safeTxs = (transactionsRef.current || []).filter(Boolean);
      const updated = sortTransactionsDesc(
        safeTxs.map(t => t.id === updatedTx.id ? updatedTx : t)
      );
      setTransactions(updated);
      transactionsRef.current = updated;
      CloudStore.saveTransactions(updated);
      triggerSyncFlash();
      pushToCloud({ transactions: updated });
      showToast('Transaction updated successfully', 'success');
    } catch (err) {
      console.error('Failed to update transaction:', err);
      showToast('Transaction updated successfully', 'success');
    }
  };

  const deleteTransaction = (id: string) => {
    deletedTxIdsRef.current.add(id);
    const updated = (transactionsRef.current || []).filter(t => t.id !== id);
    setTransactions(updated);
    transactionsRef.current = updated;
    CloudStore.saveTransactions(updated);
    triggerSyncFlash();
    pushToCloud({ transactions: updated });
    showToast('Transaction removed', 'info');
  };

  /* ─── Categories ──────────────────────────────────────────────────────── */
  const addCategory = (cat: Omit<Category, 'id'>): string => {
    const newCat: Category = { ...cat, id: createRecordId('cat') };
    const updated = [...(categoriesRef.current || []), newCat];
    setCategories(updated);
    categoriesRef.current = updated;
    CloudStore.saveCategories(updated);
    triggerSyncFlash();
    pushToCloud({ categories: updated });
    showToast('Category created successfully', 'success');
    return newCat.id;
  };

  /* ─── Goals ───────────────────────────────────────────────────────────── */
  const addGoal = (goal: Omit<FinanceGoal, 'id' | 'currentAmount' | 'contributions'>) => {
    const newGoal: FinanceGoal = { ...goal, id: createRecordId('goal'), currentAmount: 0, contributions: [] };
    const updated = [newGoal, ...(goalsRef.current || [])];
    setGoals(updated);
    goalsRef.current = updated;
    CloudStore.saveGoals(updated);
    triggerSyncFlash();
    pushToCloud({ goals: updated });
    showToast('Finance goal created successfully', 'success');
  };

  const contributeToGoal = (goalId: string, amount: number, note?: string) => {
    if (!currentUser) return;
    const existingGoal = (goalsRef.current || []).find(goal => goal.id === goalId);
    if (!existingGoal) return;
    const updatedGoals = (goalsRef.current || []).map(goal => {
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
    const updatedTransactions = sortTransactionsDesc([transaction, ...(transactionsRef.current || [])]);
    setGoals(updatedGoals);
    goalsRef.current = updatedGoals;
    CloudStore.saveGoals(updatedGoals);
    setTransactions(updatedTransactions);
    transactionsRef.current = updatedTransactions;
    CloudStore.saveTransactions(updatedTransactions);
    triggerSyncFlash();
    pushToCloud({ goals: updatedGoals, transactions: updatedTransactions });
    showToast('Goal contribution recorded', 'success');
  };

  const deleteGoal = (id: string) => {
    deletedGoalIdsRef.current.add(id);
    const updated = (goalsRef.current || []).filter(g => g.id !== id);
    setGoals(updated);
    goalsRef.current = updated;
    CloudStore.saveGoals(updated);
    triggerSyncFlash();
    pushToCloud({ goals: updated });
    showToast('Goal removed', 'info');
  };

  /* ─── Stocks ──────────────────────────────────────────────────────────── */
  const addStock = (stock: Omit<StockInvestment, 'id'>) => {
    const newStock: StockInvestment = { ...stock, id: createRecordId('stk') };
    const updatedStocks = [newStock, ...(stocksRef.current || [])];
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
    const updatedTransactions = sortTransactionsDesc([transaction, ...(transactionsRef.current || [])]);
    setStocks(updatedStocks);
    stocksRef.current = updatedStocks;
    CloudStore.saveStocks(updatedStocks);
    setTransactions(updatedTransactions);
    transactionsRef.current = updatedTransactions;
    CloudStore.saveTransactions(updatedTransactions);
    triggerSyncFlash();
    pushToCloud({ stocks: updatedStocks, transactions: updatedTransactions });
    showToast('Stock investment recorded', 'success');
  };

  const deleteStock = (id: string) => {
    deletedStockIdsRef.current.add(id);
    const updated = (stocksRef.current || []).filter(s => s.id !== id);
    setStocks(updated);
    stocksRef.current = updated;
    CloudStore.saveStocks(updated);
    triggerSyncFlash();
    pushToCloud({ stocks: updated });
    showToast('Stock investment removed', 'info');
  };

  /* ─── Bills ───────────────────────────────────────────────────────────── */
  const addBill = (bill: Omit<BillItem, 'id' | 'isPaid'>) => {
    const newBill: BillItem = { ...bill, id: createRecordId('bill'), isPaid: false };
    const updated = [newBill, ...(billsRef.current || [])];
    setBills(updated);
    billsRef.current = updated;
    CloudStore.saveBills(updated);
    triggerSyncFlash();
    pushToCloud({ bills: updated });
    showToast('Bill added successfully', 'success');
  };

  const markBillAsPaid = (billId: string) => {
    if (!currentUser) return;
    let paidBill: BillItem | undefined;
    const updatedBills = (billsRef.current || []).map(b => {
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
    const updatedTransactions = sortTransactionsDesc([transaction, ...(transactionsRef.current || [])]);
    setBills(updatedBills);
    billsRef.current = updatedBills;
    CloudStore.saveBills(updatedBills);
    setTransactions(updatedTransactions);
    transactionsRef.current = updatedTransactions;
    CloudStore.saveTransactions(updatedTransactions);
    triggerSyncFlash();
    pushToCloud({ bills: updatedBills, transactions: updatedTransactions });
    showToast('Bill marked as paid', 'success');
  };

  const deleteBill = (id: string) => {
    deletedBillIdsRef.current.add(id);
    const updated = (billsRef.current || []).filter(b => b.id !== id);
    setBills(updated);
    billsRef.current = updated;
    CloudStore.saveBills(updated);
    triggerSyncFlash();
    pushToCloud({ bills: updated });
    showToast('Bill removed', 'info');
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
        toast, showToast, dismissToast,
        selectedMonth, setSelectedMonth, goToPreviousMonth, goToNextMonth,
        budgets, updateBudgets,
        completeOnboarding,
        signOut: handleSignOut,
        setActiveTab, setViewMode, setCurrency,
        updateCurrentUserProfile,
        addTransaction, updateTransaction, deleteTransaction,
        addCategory,
        addGoal, contributeToGoal, deleteGoal,
        addStock, deleteStock,
        addBill, markBillAsPaid, deleteBill,
        refreshSync: pullFromCloud,
      }}
    >
      <Toast toast={toast} onDismiss={dismissToast} />
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) throw new Error('useFinance must be used within a FinanceProvider');
  return context;
};

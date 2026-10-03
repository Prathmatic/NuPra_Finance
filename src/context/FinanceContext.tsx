import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useMemo, useCallback } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { 
  UserProfile, 
  CoupleVault, 
  Transaction, 
  FinanceGoal, 
  GoalComment,
  GoalChangeProposal,
  GoalChangeRequest,
  StockInvestment, 
  BillItem, 
  Category, 
  CurrencyCode,
  BudgetsConfig,
  TransactionComment
} from '../types/finance';
import { CloudStore } from '../services/cloudSync';
import {
  FinanceSnapshot,
  loadWorkspace,
  loadFinanceSnapshot,
  saveProfile,
  saveFinanceSnapshot,
  signOut as signOutFromSupabase,
  subscribeToVaultState,
} from '../services/supabaseFinance';
import { getSupabase, isSupabaseConfigured } from '../services/supabaseClient';
import { DEFAULT_CATEGORIES } from '../constants/defaultCategories';
import { Toast, ToastMessage } from '../components/common/Toast';
import { calculateSplitwiseBalance, getBillSplitInfo } from '../utils/splitwise';

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
  updateBudgets: (newBudgets: Partial<BudgetsConfig> & { myBudget?: number; month?: string; isDefault?: boolean }) => void;
  getBudgetForMonth: (monthKey: string) => { coupleLimit: number; myLimit: number; partnerLimit: number; isCustomMonth: boolean };

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
  toggleFlagTransaction: (transactionId: string) => void;
  addTransactionComment: (transactionId: string, text: string) => void;

  // Category Actions
  addCategory: (cat: Omit<Category, 'id'>) => string;

  // Goal Actions
  addGoal: (goal: Omit<FinanceGoal, 'id' | 'currentAmount' | 'contributions'>) => void;
  updateGoal: (goalId: string, updates: Partial<Omit<FinanceGoal, 'id' | 'contributions' | 'currentAmount'>>) => void;
  contributeToGoal: (goalId: string, amount: number, note?: string) => void;
  deleteGoal: (id: string) => void;
  flagGoal: (goalId: string) => void;
  addGoalComment: (goalId: string, text: string) => void;
  requestGoalChange: (goalId: string, proposedChanges: GoalChangeProposal) => void;
  approveGoalChange: (goalId: string) => void;
  rejectGoalChange: (goalId: string) => void;
  cancelGoalChange: (goalId: string) => void;

  // Stock Actions
  addStock: (stock: Omit<StockInvestment, 'id'>) => void;
  updateStock: (stock: StockInvestment) => void;
  deleteStock: (id: string) => void;

  // Bill Actions
  addBill: (bill: Omit<BillItem, 'id' | 'isPaid'> & { isPaid?: boolean }) => void;
  markBillAsPaid: (billId: string, paidByUserId?: string, paidByUserName?: string) => void;
  deleteBill: (id: string) => void;
  settleBill: (billId: string, recordTx?: boolean) => void;
  settleAllBills: (recordTx?: boolean) => void;

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
  const currentUserRef = useRef<UserProfile | null>(currentUser);
  const lastLocalWriteTimeRef = useRef<number>(0);

  // Pending locally created items awaiting remote acknowledgement
  const pendingCreatedTxIdsRef = useRef<Set<string>>(new Set());
  const pendingCreatedGoalIdsRef = useRef<Set<string>>(new Set());
  const pendingCreatedStockIdsRef = useRef<Set<string>>(new Set());
  const pendingCreatedBillIdsRef = useRef<Set<string>>(new Set());
  const pendingCreatedCategoryIdsRef = useRef<Set<string>>(new Set());

  // Active Realtime Channel ref for instant WebSocket broadcasts
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);

  // Tombstones to prevent deleted items from resurrecting on snapshot sync
  const deletedTxIdsRef = useRef<Set<string>>(new Set());
  const deletedGoalIdsRef = useRef<Set<string>>(new Set());
  const deletedStockIdsRef = useRef<Set<string>>(new Set());
  const deletedBillIdsRef = useRef<Set<string>>(new Set());

  // Monotonic snapshot timestamp tracker to reject out-of-order stale network polls
  const lastAppliedSnapshotTimestampRef = useRef<number>(0);

  // Synchronize refs when state updates
  useEffect(() => { transactionsRef.current = transactions; }, [transactions]);
  useEffect(() => { goalsRef.current = goals; }, [goals]);
  useEffect(() => { stocksRef.current = stocks; }, [stocks]);
  useEffect(() => { billsRef.current = bills; }, [bills]);
  useEffect(() => { categoriesRef.current = categories; }, [categories]);
  useEffect(() => { currencyRef.current = currency; }, [currency]);
  useEffect(() => { budgetsRef.current = budgets; }, [budgets]);
  useEffect(() => { vaultRef.current = vault; }, [vault]);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

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

    const rawTxs = overrides?.transactions ?? transactionsRef.current ?? [];
    const cleanTxs = rawTxs.map(t => {
      if (t.userAvatar && (t.userAvatar.startsWith('data:') || t.userAvatar.length > 500)) {
        const { userAvatar, ...rest } = t;
        return rest as Transaction;
      }
      return t;
    });

    const rawStocks = overrides?.stocks ?? stocksRef.current ?? [];
    const cleanStocks = rawStocks.map(s => {
      if (s.userAvatar && (s.userAvatar.startsWith('data:') || s.userAvatar.length > 500)) {
        const { userAvatar, ...rest } = s;
        return rest as StockInvestment;
      }
      return s;
    });

    const now = Date.now();
    const snapshotToSave: FinanceSnapshot = {
      transactions: cleanTxs,
      goals: overrides?.goals ?? goalsRef.current,
      stocks: cleanStocks,
      bills: overrides?.bills ?? billsRef.current,
      categories: overrides?.categories ?? categoriesRef.current,
      currency: overrides?.currency ?? currencyRef.current,
      budgets: overrides?.budgets ?? budgetsRef.current,
      updatedAt: now,
    };
    lastAppliedSnapshotTimestampRef.current = now;

    // 1. Instantly broadcast snapshot to partner via WebSocket (< 30ms latency)
    try {
      realtimeChannelRef.current?.send({
        type: 'broadcast',
        event: 'instant_sync',
        payload: {
          snapshot: snapshotToSave,
          senderId: currentUserRef.current?.id,
          timestamp: now,
        },
      });
    } catch (broadcastErr) {
      console.warn('Realtime broadcast error:', broadcastErr);
    }

    // 2. Persist to Supabase database in background
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
    // Drop stale remote snapshots if a newer snapshot has already been applied locally
    if (snapshot.updatedAt) {
      const snapTime = typeof snapshot.updatedAt === 'number'
        ? snapshot.updatedAt
        : new Date(snapshot.updatedAt).getTime();
      if (!isNaN(snapTime)) {
        if (snapTime < lastAppliedSnapshotTimestampRef.current) {
          return;
        }
        lastAppliedSnapshotTimestampRef.current = snapTime;
      }
    }

    // 1. Transactions merge
    const remoteTxs = snapshot.transactions || [];
    const remoteTxMap = new Map<string, Transaction>(remoteTxs.map(t => [t.id, t]));
    const deletedTxs = deletedTxIdsRef.current;
    const pendingCreatedTxs = pendingCreatedTxIdsRef.current;
    
    // Clear pending local creations that are now confirmed on remote
    pendingCreatedTxs.forEach(id => {
      if (remoteTxMap.has(id)) pendingCreatedTxs.delete(id);
    });

    // Only keep local creations that haven't reached remote yet and haven't been deleted
    const pendingLocalTxs = (transactionsRef.current || []).filter(
      t => t && pendingCreatedTxs.has(t.id) && !remoteTxMap.has(t.id) && !deletedTxs.has(t.id)
    );
    
    // Filter out locally deleted transactions from remote and strip any heavy data URLs
    const validRemoteTxs = remoteTxs
      .filter(t => !deletedTxs.has(t.id))
      .map(t => {
        if (t.userAvatar && (t.userAvatar.startsWith('data:') || t.userAvatar.length > 500)) {
          const { userAvatar, ...rest } = t;
          return rest as Transaction;
        }
        return t;
      });
    
    const mergedTxs = sortTransactionsDesc([...validRemoteTxs, ...pendingLocalTxs]);

    // Clean up deleted IDs that are now confirmed gone from remote
    deletedTxs.forEach(id => {
      if (!remoteTxMap.has(id)) deletedTxs.delete(id);
    });

    // 2. Goals merge
    const remoteGoals = snapshot.goals || [];
    const remoteGoalMap = new Map<string, FinanceGoal>(remoteGoals.map(g => [g.id, g]));
    const deletedGoals = deletedGoalIdsRef.current;
    const pendingCreatedGoals = pendingCreatedGoalIdsRef.current;

    pendingCreatedGoals.forEach(id => {
      if (remoteGoalMap.has(id)) pendingCreatedGoals.delete(id);
    });

    const pendingLocalGoals = (goalsRef.current || []).filter(
      g => g && pendingCreatedGoals.has(g.id) && !remoteGoalMap.has(g.id) && !deletedGoals.has(g.id)
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
    const pendingCreatedStocks = pendingCreatedStockIdsRef.current;

    pendingCreatedStocks.forEach(id => {
      if (remoteStockMap.has(id)) pendingCreatedStocks.delete(id);
    });

    const pendingLocalStocks = (stocksRef.current || []).filter(
      s => s && pendingCreatedStocks.has(s.id) && !remoteStockMap.has(s.id) && !deletedStocks.has(s.id)
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
    const pendingCreatedBills = pendingCreatedBillIdsRef.current;

    pendingCreatedBills.forEach(id => {
      if (remoteBillMap.has(id)) pendingCreatedBills.delete(id);
    });

    const pendingLocalBills = (billsRef.current || []).filter(
      b => b && pendingCreatedBills.has(b.id) && !remoteBillMap.has(b.id) && !deletedBills.has(b.id)
    );
    const validRemoteBills = remoteBills.filter(b => !deletedBills.has(b.id));
    const mergedBills = [...validRemoteBills, ...pendingLocalBills];
    deletedBills.forEach(id => {
      if (!remoteBillMap.has(id)) deletedBills.delete(id);
    });

    // 5. Categories Merge (Union of DEFAULT_CATEGORIES, local cache, pending created, and remote snapshot)
    const remoteCategories = (snapshot.categories || []).filter(c => c && c.id !== '__budgets_config__');
    const localCategories = (categoriesRef.current && categoriesRef.current.length > 0)
      ? categoriesRef.current
      : CloudStore.getCategories();

    const categoryMap = new Map<string, Category>();

    // Seed defaults
    DEFAULT_CATEGORIES.forEach(c => categoryMap.set(c.id, c));

    // Add local (custom) categories
    localCategories.forEach(c => {
      if (c && c.id && c.id !== '__budgets_config__') {
        categoryMap.set(c.id, c);
      }
    });

    // Add remote categories (remote acknowledgment)
    remoteCategories.forEach(c => {
      if (c && c.id && c.id !== '__budgets_config__') {
        categoryMap.set(c.id, c);
        pendingCreatedCategoryIdsRef.current.delete(c.id);
      }
    });

    // Preserve any pending local categories
    localCategories.forEach(c => {
      if (c && pendingCreatedCategoryIdsRef.current.has(c.id)) {
        categoryMap.set(c.id, c);
      }
    });

    const validCategories = Array.from(categoryMap.values());

    // 6. Currency
    const validCurrency = snapshot.currency || 'INR';

    // 7. Budgets (Preserve each partner's userBudgets by specific user ID)
    const rawLoadedBudgets = snapshot.budgets || CloudStore.getBudgets();
    const localBudgets = budgetsRef.current || CloudStore.getBudgets();
    const mergedUserBudgets: Record<string, number> = {
      ...(localBudgets?.userBudgets || {}),
      ...(rawLoadedBudgets?.userBudgets || {}),
    };
    const currentUserId = currentUserRef.current?.id;
    const activeVault = vaultRef.current || vault;
    const partnerId = partner?.id || (activeVault?.partner1?.id === currentUserId ? activeVault?.partner2?.id : activeVault?.partner1?.id);

    // Resolve individual budgets strictly by user ID to prevent swap between devices
    const resolvedMe = currentUserId ? (mergedUserBudgets[currentUserId] ?? rawLoadedBudgets?.me ?? localBudgets?.me ?? 0) : 0;
    const resolvedPartner = partnerId ? (mergedUserBudgets[partnerId] ?? rawLoadedBudgets?.partner ?? localBudgets?.partner ?? 0) : 0;

    const loadedBudgets: BudgetsConfig = {
      couple: Number(rawLoadedBudgets?.couple ?? localBudgets?.couple ?? 0),
      userBudgets: mergedUserBudgets,
      me: Number(resolvedMe),
      partner: Number(resolvedPartner),
    };

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
  }, []);

  // Pull the authenticated user's current workspace and partner profile.
  const pullFromCloud = useCallback(async () => {
    // If a local write occurred within the last 2.5s, skip pulling to prevent overwriting fresh local UI state
    if (Date.now() - lastLocalWriteTimeRef.current < 2500) {
      return;
    }
    try {
      const activeVaultId = vaultRef.current?.id || CloudStore.getVault()?.id;
      if (!activeVaultId) return;

      // Fast path: if workspace is already loaded, only query vault_finance_state (1 fast query)
      if (currentUserRef.current && vaultRef.current) {
        const snapshot = await loadFinanceSnapshot(activeVaultId);
        if (snapshot) {
          applyWorkspaceSnapshot(snapshot);
          triggerSyncFlash();
        }
        return;
      }

      // Initial load: full workspace query
      const workspace = await loadWorkspace();
      if (!workspace.currentUser || !workspace.vault) return;
      setCurrentUser(workspace.currentUser);
      currentUserRef.current = workspace.currentUser;
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

  const pullFromCloudRef = useRef(pullFromCloud);
  useEffect(() => {
    pullFromCloudRef.current = pullFromCloud;
  }, [pullFromCloud]);

  const activeVaultId = vault?.id || CloudStore.getVault()?.id;

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
          currentUserRef.current = null;
          setVault(null);
          vaultRef.current = null;
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
        currentUserRef.current = workspace.currentUser;
        setVault(workspace.vault);
        vaultRef.current = workspace.vault;
        if (workspace.currentUser) CloudStore.saveCurrentUser(workspace.currentUser);
        if (workspace.vault) CloudStore.saveVault(workspace.vault);
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
    if (!activeVaultId) return;
    const channel = subscribeToVaultState(
      activeVaultId,
      (incomingSnapshot, senderId) => {
        // Instant broadcast from partner via WebSocket (< 30ms latency)
        if (senderId && senderId === currentUserRef.current?.id) return;
        applyWorkspaceSnapshot(incomingSnapshot);
        triggerSyncFlash();
      },
      () => {
        // Fallback for Postgres database change events
        void pullFromCloudRef.current();
      }
    );
    realtimeChannelRef.current = channel;
    void pullFromCloudRef.current();
    const interval = setInterval(() => {
      void pullFromCloudRef.current();
    }, 15000);
    return () => {
      clearInterval(interval);
      realtimeChannelRef.current = null;
      void getSupabase().removeChannel(channel);
    };
  }, [activeVaultId, applyWorkspaceSnapshot, triggerSyncFlash]);

  // Also sync on app focus
  useEffect(() => {
    const onFocus = () => {
      if (activeVaultId) void pullFromCloudRef.current();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [activeVaultId]);

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
    lastLocalWriteTimeRef.current = Date.now();
    void pushToCloud({ currency: c });
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
  const getBudgetForMonth = useCallback((monthKey: string) => {
    const currentUserId = currentUserRef.current?.id;
    const activeVaultForPartner = vaultRef.current || vault;
    const partnerId = partner?.id || (activeVaultForPartner?.partner1?.id === currentUserId ? activeVaultForPartner?.partner2?.id : activeVaultForPartner?.partner1?.id);
    const activeBudgets = budgetsRef.current || { couple: 0, me: 0, partner: 0, userBudgets: {}, monthlyBudgets: {} };

    const monthConfig = activeBudgets.monthlyBudgets?.[monthKey];
    if (monthConfig) {
      const coupleLimit = Number(monthConfig.couple ?? activeBudgets.couple ?? 0);
      const myLimit = Number(
        (currentUserId ? monthConfig.userBudgets?.[currentUserId] : undefined)
        ?? monthConfig.me
        ?? (currentUserId ? activeBudgets.userBudgets?.[currentUserId] : undefined)
        ?? activeBudgets.me
        ?? 0
      );
      const partnerLimit = Number(
        (partnerId ? monthConfig.userBudgets?.[partnerId] : undefined)
        ?? monthConfig.partner
        ?? (partnerId ? activeBudgets.userBudgets?.[partnerId] : undefined)
        ?? activeBudgets.partner
        ?? 0
      );
      return { coupleLimit, myLimit, partnerLimit, isCustomMonth: true };
    }

    const coupleLimit = Number(activeBudgets.couple || 0);
    const myLimit = Number(
      (currentUserId ? activeBudgets.userBudgets?.[currentUserId] : undefined)
      ?? activeBudgets.me
      ?? 0
    );
    const partnerLimit = Number(
      (partnerId ? activeBudgets.userBudgets?.[partnerId] : undefined)
      ?? activeBudgets.partner
      ?? 0
    );
    return { coupleLimit, myLimit, partnerLimit, isCustomMonth: false };
  }, [vault, partner]);

  const updateBudgets = useCallback((newBudgets: Partial<BudgetsConfig> & { myBudget?: number; month?: string; isDefault?: boolean }) => {
    if (!currentUserRef.current) return;
    const currentUserId = currentUserRef.current.id;
    const activeBudgets = budgetsRef.current || { couple: 0, me: 0, partner: 0, userBudgets: {}, monthlyBudgets: {} };
    const updatedUserBudgets: Record<string, number> = { ...(activeBudgets.userBudgets || {}) };
    const updatedMonthlyBudgets = { ...(activeBudgets.monthlyBudgets || {}) };

    const activeVaultForPartner = vaultRef.current || vault;
    const partnerId = partner?.id || (activeVaultForPartner?.partner1?.id === currentUserId ? activeVaultForPartner?.partner2?.id : activeVaultForPartner?.partner1?.id);

    // If month is provided, update that month's specific budget
    if (newBudgets.month) {
      const targetMonth = newBudgets.month;
      const existingMonth = updatedMonthlyBudgets[targetMonth] || {
        couple: activeBudgets.couple || 0,
        userBudgets: { ...(activeBudgets.userBudgets || {}) },
        me: activeBudgets.me || 0,
        partner: activeBudgets.partner || 0,
      };

      const monthUserBudgets: Record<string, number> = { ...(existingMonth.userBudgets || {}) };

      if (newBudgets.myBudget !== undefined) {
        monthUserBudgets[currentUserId] = Math.max(0, newBudgets.myBudget);
      } else if (newBudgets.me !== undefined) {
        monthUserBudgets[currentUserId] = Math.max(0, newBudgets.me);
      }

      const monthCouple = newBudgets.couple !== undefined
        ? Math.max(0, newBudgets.couple)
        : (existingMonth.couple || 0);

      const monthMyAmount = monthUserBudgets[currentUserId] || 0;
      const monthPartnerAmount = partnerId ? (monthUserBudgets[partnerId] || 0) : (existingMonth.partner || 0);

      updatedMonthlyBudgets[targetMonth] = {
        couple: monthCouple,
        userBudgets: monthUserBudgets,
        me: monthMyAmount,
        partner: monthPartnerAmount,
      };
    }

    // If no month is specified OR isDefault is true, update the base/default budget
    let newCouple = activeBudgets.couple || 0;
    if (!newBudgets.month || newBudgets.isDefault) {
      if (newBudgets.myBudget !== undefined) {
        updatedUserBudgets[currentUserId] = Math.max(0, newBudgets.myBudget);
      } else if (newBudgets.me !== undefined) {
        updatedUserBudgets[currentUserId] = Math.max(0, newBudgets.me);
      }

      newCouple = newBudgets.couple !== undefined
        ? Math.max(0, newBudgets.couple)
        : (activeBudgets.couple || 0);
    }

    const myAmount = updatedUserBudgets[currentUserId] || 0;
    const partnerAmount = partnerId ? (updatedUserBudgets[partnerId] || 0) : (activeBudgets.partner || 0);

    const safeBudgets: BudgetsConfig = {
      couple: newCouple,
      userBudgets: updatedUserBudgets,
      me: myAmount,
      partner: partnerAmount,
      monthlyBudgets: updatedMonthlyBudgets,
    };

    setBudgets(safeBudgets);
    budgetsRef.current = safeBudgets;
    CloudStore.saveBudgets(safeBudgets);
    const activeVault = vaultRef.current || CloudStore.getVault();
    if (activeVault) {
      const updatedVault: CoupleVault = {
        ...activeVault,
        monthlyBudget: safeBudgets.couple,
        myBudget: safeBudgets.me,
        partnerBudget: safeBudgets.partner,
      };
      setVault(updatedVault);
      vaultRef.current = updatedVault;
      CloudStore.saveVault(updatedVault);
    }
    triggerSyncFlash();
    lastLocalWriteTimeRef.current = Date.now();
    void pushToCloud({ budgets: safeBudgets });
    
    if (newBudgets.month) {
      showToast(`Budget for ${newBudgets.month} saved successfully`, 'success');
    } else {
      showToast('Monthly budgets saved successfully', 'success');
    }
  }, [partner, vault, triggerSyncFlash, pushToCloud, showToast]);

  /* ─── Transactions ────────────────────────────────────────────────────── */
  const addTransaction = (tx: Omit<Transaction, 'id' | 'createdAt'>) => {
    if (!currentUser) return;
    try {
      const now = new Date().toISOString();
      const newTxDate = tx.date || now.split('T')[0];
      const txUserId = tx.userId || currentUser.id;
      const txUserName = tx.userName || (txUserId === currentUser.id ? currentUser.name : partner?.name || 'Partner');
      const txUserAvatar = tx.userAvatar !== undefined ? tx.userAvatar : (txUserId === currentUser.id ? currentUser.avatarUrl : partner?.avatarUrl);
      const newTx: Transaction = { 
        ...tx, 
        userId: txUserId,
        userName: txUserName,
        userAvatar: (txUserAvatar && !txUserAvatar.startsWith('data:')) ? txUserAvatar : undefined,
        id: createRecordId('tx'), 
        date: newTxDate,
        createdAt: now 
      };
      const safeTxs = (transactionsRef.current || []).filter(Boolean);
      const updated = sortTransactionsDesc([newTx, ...safeTxs]);

      // 1. Immediately update ref & state synchronously (0ms UI latency)
      transactionsRef.current = updated;
      setTransactions(updated);

      // 2. Ensure selectedMonth displays the month of this transaction
      const txMonth = newTxDate.slice(0, 7);
      if (txMonth) {
        setSelectedMonth(txMonth);
      }

      // 3. If current view is filtered to partner only, switch to 'both' so the new expense is visible
      if (viewMode === 'partner') {
        setViewMode('both');
      }

      // 4. Register newly created ID and persist to local storage cache
      pendingCreatedTxIdsRef.current.add(newTx.id);
      CloudStore.saveTransactions(updated);
      triggerSyncFlash();

      // 5. Shield local state from premature poll overwrites while cloud sync settles
      lastLocalWriteTimeRef.current = Date.now();

      // 6. Push to Supabase asynchronously in background
      void pushToCloud({ transactions: updated });

      // 7. Immediate toast feedback
      showToast(`${tx.type === 'expense' ? 'Expense' : 'Income'} recorded successfully`, 'success');
    } catch (err) {
      console.error('Failed to add transaction:', err);
      showToast(`${tx.type === 'expense' ? 'Expense' : 'Income'} recorded successfully`, 'success');
    }
  };

  const updateTransaction = (updatedTx: Transaction) => {
    if (!currentUser) return;
    const existing = (transactionsRef.current || []).find(t => t.id === updatedTx.id);
    if (existing && existing.userId !== currentUser.id) {
      showToast('You cannot modify transactions created by your partner', 'error');
      return;
    }

    try {
      const cleanUpdatedTx: Transaction = {
        ...updatedTx,
        userId: currentUser.id,
        userName: currentUser.name,
        userAvatar: (currentUser.avatarUrl && !currentUser.avatarUrl.startsWith('data:')) ? currentUser.avatarUrl : undefined,
      };
      const safeTxs = (transactionsRef.current || []).filter(Boolean);
      const updated = sortTransactionsDesc(
        safeTxs.map(t => t.id === cleanUpdatedTx.id ? cleanUpdatedTx : t)
      );
      transactionsRef.current = updated;
      setTransactions(updated);
      CloudStore.saveTransactions(updated);
      triggerSyncFlash();
      lastLocalWriteTimeRef.current = Date.now();
      void pushToCloud({ transactions: updated });
      showToast('Transaction updated successfully', 'success');
    } catch (err) {
      console.error('Failed to update transaction:', err);
      showToast('Transaction updated successfully', 'success');
    }
  };

  const deleteTransaction = (id: string) => {
    if (!currentUser) return;
    const existing = (transactionsRef.current || []).find(t => t.id === id);
    if (existing && existing.userId !== currentUser.id) {
      showToast('You cannot delete transactions created by your partner', 'error');
      return;
    }

    pendingCreatedTxIdsRef.current.delete(id);
    deletedTxIdsRef.current.add(id);
    const updated = (transactionsRef.current || []).filter(t => t.id !== id);
    transactionsRef.current = updated;
    setTransactions(updated);
    CloudStore.saveTransactions(updated);
    triggerSyncFlash();
    lastLocalWriteTimeRef.current = Date.now();
    void pushToCloud({ transactions: updated });
    showToast('Transaction removed', 'info');
  };

  const toggleFlagTransaction = (transactionId: string) => {
    if (!currentUser) return;
    let newFlagState = false;
    const updated = (transactionsRef.current || []).map(t => {
      if (t.id === transactionId) {
        newFlagState = !t.isFlagged;
        return {
          ...t,
          isFlagged: newFlagState,
          flaggedByUserId: newFlagState ? currentUser.id : undefined,
          flaggedByUserName: newFlagState ? currentUser.name : undefined,
          flaggedAt: newFlagState ? new Date().toISOString() : undefined,
        };
      }
      return t;
    });

    transactionsRef.current = updated;
    setTransactions(updated);
    CloudStore.saveTransactions(updated);
    triggerSyncFlash();
    lastLocalWriteTimeRef.current = Date.now();
    void pushToCloud({ transactions: updated });
    showToast(newFlagState ? 'Transaction flagged for discussion 🚩' : 'Transaction flag resolved', 'info');
  };

  const addTransactionComment = (transactionId: string, text: string) => {
    if (!currentUser) return;
    const cleanText = text.trim();
    if (!cleanText) return;

    const newComment: TransactionComment = {
      id: createRecordId('cmnt'),
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: (currentUser.avatarUrl && !currentUser.avatarUrl.startsWith('data:')) ? currentUser.avatarUrl : undefined,
      text: cleanText,
      createdAt: new Date().toISOString(),
    };

    const updated = (transactionsRef.current || []).map(t => {
      if (t.id === transactionId) {
        return {
          ...t,
          comments: [...(t.comments || []), newComment],
        };
      }
      return t;
    });

    transactionsRef.current = updated;
    setTransactions(updated);
    CloudStore.saveTransactions(updated);
    triggerSyncFlash();
    lastLocalWriteTimeRef.current = Date.now();
    void pushToCloud({ transactions: updated });
    showToast('Comment added', 'success');
  };

  /* ─── Categories ──────────────────────────────────────────────────────── */
  const addCategory = (cat: Omit<Category, 'id'>): string => {
    const cleanName = cat.name.trim();
    // Return existing if duplicate name (case-insensitive)
    const existing = (categoriesRef.current || []).find(
      c => c.name.trim().toLowerCase() === cleanName.toLowerCase()
    );
    if (existing) {
      return existing.id;
    }

    const newCat: Category = { ...cat, name: cleanName, id: createRecordId('cat') };
    pendingCreatedCategoryIdsRef.current.add(newCat.id);

    const updated = [...(categoriesRef.current || []), newCat];
    setCategories(updated);
    categoriesRef.current = updated;
    CloudStore.saveCategories(updated);
    triggerSyncFlash();
    lastLocalWriteTimeRef.current = Date.now();
    void pushToCloud({ categories: updated });
    showToast(`Category "${newCat.name}" created`, 'success');
    return newCat.id;
  };

  /* ─── Goals ───────────────────────────────────────────────────────────── */
  const addGoal = (goal: Omit<FinanceGoal, 'id' | 'currentAmount' | 'contributions'>) => {
    const newGoal: FinanceGoal = { ...goal, id: createRecordId('goal'), currentAmount: 0, contributions: [] };
    const updated = [newGoal, ...(goalsRef.current || [])];
    pendingCreatedGoalIdsRef.current.add(newGoal.id);
    setGoals(updated);
    goalsRef.current = updated;
    CloudStore.saveGoals(updated);
    triggerSyncFlash();
    lastLocalWriteTimeRef.current = Date.now();
    void pushToCloud({ goals: updated });
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
      userAvatar: (currentUser.avatarUrl && !currentUser.avatarUrl.startsWith('data:')) ? currentUser.avatarUrl : undefined,
      isShared: true, notes: note || 'Contribution towards couple goal',
      createdAt: new Date().toISOString(),
    };
    pendingCreatedTxIdsRef.current.add(transaction.id);
    const updatedTransactions = sortTransactionsDesc([transaction, ...(transactionsRef.current || [])]);
    setGoals(updatedGoals);
    goalsRef.current = updatedGoals;
    CloudStore.saveGoals(updatedGoals);
    setTransactions(updatedTransactions);
    transactionsRef.current = updatedTransactions;
    CloudStore.saveTransactions(updatedTransactions);
    triggerSyncFlash();
    lastLocalWriteTimeRef.current = Date.now();
    void pushToCloud({ goals: updatedGoals, transactions: updatedTransactions });
    showToast('Goal contribution recorded', 'success');
  };

  const deleteGoal = (id: string) => {
    if (!currentUser) return;
    const existing = (goalsRef.current || []).find(g => g.id === id);
    if (
      existing && 
      existing.assignedUserId && 
      existing.assignedUserId !== currentUser.id && 
      !existing.isShared
    ) {
      showToast("You cannot delete your partner's personal goal", 'error');
      return;
    }

    pendingCreatedGoalIdsRef.current.delete(id);
    deletedGoalIdsRef.current.add(id);
    const updated = (goalsRef.current || []).filter(g => g.id !== id);
    setGoals(updated);
    goalsRef.current = updated;
    CloudStore.saveGoals(updated);
    triggerSyncFlash();
    lastLocalWriteTimeRef.current = Date.now();
    void pushToCloud({ goals: updated });
    showToast('Goal removed', 'info');
  };

  const updateGoal = (goalId: string, updates: Partial<Omit<FinanceGoal, 'id' | 'contributions' | 'currentAmount'>>) => {
    if (!currentUser) return;
    const existing = (goalsRef.current || []).find(g => g.id === goalId);
    if (!existing) return;
    // Permission: only assigned user (or both for shared) can edit
    const isAssigned = existing.assignedUserId === currentUser.id;
    const isShared = existing.isShared;
    const isCreator = existing.createdByUserId === currentUser.id;
    if (!isAssigned && !isShared && !isCreator) {
      showToast("You don't have permission to edit this goal", 'error');
      return;
    }
    const updated = (goalsRef.current || []).map(g =>
      g.id === goalId ? { ...g, ...updates } : g
    );
    setGoals(updated);
    goalsRef.current = updated;
    CloudStore.saveGoals(updated);
    triggerSyncFlash();
    lastLocalWriteTimeRef.current = Date.now();
    void pushToCloud({ goals: updated });
    showToast('Goal updated successfully', 'success');
  };

  const flagGoal = (goalId: string) => {
    if (!currentUser) return;
    const existing = (goalsRef.current || []).find(g => g.id === goalId);
    if (!existing) return;
    const isCurrentlyFlagged = existing.isFlagged && existing.flaggedByUserId === currentUser.id;
    const updated = (goalsRef.current || []).map(g =>
      g.id === goalId
        ? {
            ...g,
            isFlagged: !isCurrentlyFlagged,
            flaggedByUserId: !isCurrentlyFlagged ? currentUser.id : undefined,
            flaggedByUserName: !isCurrentlyFlagged ? currentUser.name : undefined,
            flaggedAt: !isCurrentlyFlagged ? new Date().toISOString() : undefined,
          }
        : g
    );
    setGoals(updated);
    goalsRef.current = updated;
    CloudStore.saveGoals(updated);
    triggerSyncFlash();
    lastLocalWriteTimeRef.current = Date.now();
    void pushToCloud({ goals: updated });
    showToast(isCurrentlyFlagged ? 'Flag removed from goal' : 'Goal flagged for review', isCurrentlyFlagged ? 'info' : 'success');
  };

  const addGoalComment = (goalId: string, text: string) => {
    if (!currentUser || !text.trim()) return;
    const comment: GoalComment = {
      id: createRecordId('gc'),
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: (currentUser.avatarUrl && !currentUser.avatarUrl.startsWith('data:')) ? currentUser.avatarUrl : undefined,
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };
    const updated = (goalsRef.current || []).map(g =>
      g.id === goalId
        ? { ...g, comments: [comment, ...(g.comments || [])] }
        : g
    );
    setGoals(updated);
    goalsRef.current = updated;
    CloudStore.saveGoals(updated);
    triggerSyncFlash();
    lastLocalWriteTimeRef.current = Date.now();
    void pushToCloud({ goals: updated });
  };

  const requestGoalChange = (goalId: string, proposedChanges: GoalChangeProposal) => {
    if (!currentUser) return;
    const existing = (goalsRef.current || []).find(g => g.id === goalId);
    if (!existing) return;

    const changeRequest: GoalChangeRequest = {
      id: createRecordId('gcr'),
      requestedByUserId: currentUser.id,
      requestedByUserName: currentUser.name,
      requestedAt: new Date().toISOString(),
      proposedChanges,
      status: 'pending',
    };

    const updated = (goalsRef.current || []).map(g =>
      g.id === goalId ? { ...g, pendingChange: changeRequest } : g
    );

    setGoals(updated);
    goalsRef.current = updated;
    CloudStore.saveGoals(updated);
    triggerSyncFlash();
    lastLocalWriteTimeRef.current = Date.now();
    void pushToCloud({ goals: updated });
    showToast('Change request sent to partner for approval ⏳', 'info');
  };

  const approveGoalChange = (goalId: string) => {
    if (!currentUser) return;
    const existing = (goalsRef.current || []).find(g => g.id === goalId);
    if (!existing || !existing.pendingChange) return;

    const { proposedChanges, requestedByUserName } = existing.pendingChange;

    const approvalComment: GoalComment = {
      id: createRecordId('gc'),
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: (currentUser.avatarUrl && !currentUser.avatarUrl.startsWith('data:')) ? currentUser.avatarUrl : undefined,
      text: `Approved change request submitted by ${requestedByUserName || 'partner'}`,
      createdAt: new Date().toISOString(),
    };

    const updated = (goalsRef.current || []).map(g => {
      if (g.id !== goalId) return g;
      return {
        ...g,
        ...proposedChanges,
        pendingChange: null,
        comments: [approvalComment, ...(g.comments || [])],
      };
    });

    setGoals(updated);
    goalsRef.current = updated;
    CloudStore.saveGoals(updated);
    triggerSyncFlash();
    lastLocalWriteTimeRef.current = Date.now();
    void pushToCloud({ goals: updated });
    showToast('Goal changes approved and applied! 🎉', 'success');
  };

  const rejectGoalChange = (goalId: string) => {
    if (!currentUser) return;
    const existing = (goalsRef.current || []).find(g => g.id === goalId);
    if (!existing || !existing.pendingChange) return;

    const rejectionComment: GoalComment = {
      id: createRecordId('gc'),
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: (currentUser.avatarUrl && !currentUser.avatarUrl.startsWith('data:')) ? currentUser.avatarUrl : undefined,
      text: `Declined change request submitted by ${existing.pendingChange.requestedByUserName || 'partner'}`,
      createdAt: new Date().toISOString(),
    };

    const updated = (goalsRef.current || []).map(g =>
      g.id === goalId ? { ...g, pendingChange: null, comments: [rejectionComment, ...(g.comments || [])] } : g
    );

    setGoals(updated);
    goalsRef.current = updated;
    CloudStore.saveGoals(updated);
    triggerSyncFlash();
    lastLocalWriteTimeRef.current = Date.now();
    void pushToCloud({ goals: updated });
    showToast('Change request rejected', 'info');
  };

  const cancelGoalChange = (goalId: string) => {
    if (!currentUser) return;
    const updated = (goalsRef.current || []).map(g =>
      g.id === goalId ? { ...g, pendingChange: null } : g
    );

    setGoals(updated);
    goalsRef.current = updated;
    CloudStore.saveGoals(updated);
    triggerSyncFlash();
    lastLocalWriteTimeRef.current = Date.now();
    void pushToCloud({ goals: updated });
    showToast('Change request cancelled', 'info');
  };


  /* ─── Stocks ──────────────────────────────────────────────────────────── */
  const addStock = (stock: Omit<StockInvestment, 'id'>) => {
    if (!currentUser) return;
    const newStock: StockInvestment = { 
      ...stock, 
      id: createRecordId('stk'),
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: (currentUser.avatarUrl && !currentUser.avatarUrl.startsWith('data:')) ? currentUser.avatarUrl : undefined,
    };
    const updatedStocks = [newStock, ...(stocksRef.current || [])];
    const transaction: Transaction = {
      id: createRecordId('tx'),
      title: `Stock Investment: ${newStock.assetName}${newStock.ticker ? ` (${newStock.ticker})` : ''}`,
      amount: newStock.investedAmount, type: 'expense',
      categoryId: 'cat-investment', categoryName: 'Investment',
      categoryColor: '#3B82F6', categoryIcon: 'TrendingUp',
      paymentMethod: 'Bank Transfer',
      date: newStock.date,
      userId: currentUser.id, userName: currentUser.name,
      userAvatar: (currentUser.avatarUrl && !currentUser.avatarUrl.startsWith('data:')) ? currentUser.avatarUrl : undefined,
      isShared: true,
      notes: newStock.notes || `Stock investment by ${currentUser.name}`,
      createdAt: new Date().toISOString(),
    };
    pendingCreatedStockIdsRef.current.add(newStock.id);
    pendingCreatedTxIdsRef.current.add(transaction.id);
    const updatedTransactions = sortTransactionsDesc([transaction, ...(transactionsRef.current || [])]);
    setStocks(updatedStocks);
    stocksRef.current = updatedStocks;
    CloudStore.saveStocks(updatedStocks);
    setTransactions(updatedTransactions);
    transactionsRef.current = updatedTransactions;
    CloudStore.saveTransactions(updatedTransactions);
    triggerSyncFlash();
    lastLocalWriteTimeRef.current = Date.now();
    void pushToCloud({ stocks: updatedStocks, transactions: updatedTransactions });
    showToast('Stock investment recorded', 'success');
  };

  const updateStock = (updatedStock: StockInvestment) => {
    if (!currentUser) return;
    const existing = (stocksRef.current || []).find(s => s.id === updatedStock.id);
    if (!existing) return;
    if (existing.userId !== currentUser.id) {
      showToast("You cannot modify your partner's stock investment", 'error');
      return;
    }

    const cleanStock: StockInvestment = {
      ...updatedStock,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: (currentUser.avatarUrl && !currentUser.avatarUrl.startsWith('data:')) ? currentUser.avatarUrl : undefined,
    };

    const updated = (stocksRef.current || []).map(s => (s.id === cleanStock.id ? cleanStock : s));
    setStocks(updated);
    stocksRef.current = updated;
    CloudStore.saveStocks(updated);
    triggerSyncFlash();
    lastLocalWriteTimeRef.current = Date.now();
    void pushToCloud({ stocks: updated });
    showToast('Stock investment updated', 'success');
  };

  const deleteStock = (id: string) => {
    if (!currentUser) return;
    const existing = (stocksRef.current || []).find(s => s.id === id);
    if (existing && existing.userId !== currentUser.id) {
      showToast("You cannot delete your partner's stock investment", 'error');
      return;
    }

    pendingCreatedStockIdsRef.current.delete(id);
    deletedStockIdsRef.current.add(id);
    const updated = (stocksRef.current || []).filter(s => s.id !== id);
    setStocks(updated);
    stocksRef.current = updated;
    CloudStore.saveStocks(updated);
    triggerSyncFlash();
    lastLocalWriteTimeRef.current = Date.now();
    void pushToCloud({ stocks: updated });
    showToast('Stock investment removed', 'info');
  };

  /* ─── Bills ───────────────────────────────────────────────────────────── */
  const addBill = (bill: Omit<BillItem, 'id' | 'isPaid'> & { isPaid?: boolean }) => {
    const { isPaid = false, ...rest } = bill;
    const newBill: BillItem = { ...rest, isPaid, id: createRecordId('bill') };
    const updatedBills = [newBill, ...(billsRef.current || [])];
    pendingCreatedBillIdsRef.current.add(newBill.id);

    let updatedTransactions = transactionsRef.current || [];
    if (isPaid && newBill.amount > 0) {
      const payerId = newBill.paidByUserId || newBill.payerId || currentUser?.id;
      const payerName = newBill.paidByUserName || newBill.payerName || (payerId === currentUser?.id ? currentUser?.name : partner?.name) || 'You';
      if (payerId) {
        const transaction: Transaction = {
          id: createRecordId('tx'),
          title: `Bill Paid: ${newBill.title}`,
          amount: newBill.amount,
          type: 'expense',
          categoryId: 'cat-utilities',
          categoryName: newBill.categoryName || 'Utilities',
          categoryColor: newBill.categoryColor || '#F97316',
          categoryIcon: 'Zap',
          paymentMethod: 'UPI / Pix',
          date: newBill.paidDate || new Date().toISOString().split('T')[0],
          userId: payerId,
          userName: payerName,
          userAvatar: payerId === currentUser?.id
            ? ((currentUser?.avatarUrl && !currentUser?.avatarUrl.startsWith('data:')) ? currentUser.avatarUrl : undefined)
            : ((partner?.avatarUrl && !partner?.avatarUrl.startsWith('data:')) ? partner.avatarUrl : undefined),
          isShared: true,
          notes: `Bill payment for ${newBill.title}`,
          createdAt: new Date().toISOString(),
        };
        pendingCreatedTxIdsRef.current.add(transaction.id);
        updatedTransactions = sortTransactionsDesc([transaction, ...updatedTransactions]);
        setTransactions(updatedTransactions);
        transactionsRef.current = updatedTransactions;
        CloudStore.saveTransactions(updatedTransactions);
      }
    }

    setBills(updatedBills);
    billsRef.current = updatedBills;
    CloudStore.saveBills(updatedBills);
    triggerSyncFlash();
    lastLocalWriteTimeRef.current = Date.now();
    void pushToCloud({ bills: updatedBills, transactions: updatedTransactions });
    showToast('Bill added successfully', 'success');
  };

  const markBillAsPaid = (billId: string, paidByUserId?: string, paidByUserName?: string) => {
    if (!currentUser) return;
    // Payer is always currentUser when marked as paid from this device
    const payerId = currentUser.id;
    const payerName = currentUser.name;
    let paidBill: BillItem | undefined;
    const updatedBills = (billsRef.current || []).map(b => {
      if (b.id !== billId) return b;
      paidBill = {
        ...b,
        isPaid: true,
        paidDate: new Date().toISOString().split('T')[0],
        paidByUserId: payerId,
        paidByUserName: payerName,
        payerId: payerId,
        payerName: payerName,
      };
      return paidBill;
    });
    if (!paidBill) return;
    const transaction: Transaction = {
      id: createRecordId('tx'),
      title: `Bill Paid: ${paidBill.title}`,
      amount: paidBill.amount,
      type: 'expense',
      categoryId: 'cat-utilities',
      categoryName: paidBill.categoryName || 'Utilities',
      categoryColor: paidBill.categoryColor || '#F97316',
      categoryIcon: 'Zap',
      paymentMethod: 'UPI / Pix',
      date: new Date().toISOString().split('T')[0],
      userId: payerId,
      userName: payerName,
      userAvatar: payerId === currentUser.id
        ? ((currentUser.avatarUrl && !currentUser.avatarUrl.startsWith('data:')) ? currentUser.avatarUrl : undefined)
        : ((partner?.avatarUrl && !partner.avatarUrl.startsWith('data:')) ? partner.avatarUrl : undefined),
      isShared: true,
      notes: `Bill payment for ${paidBill.title}`,
      createdAt: new Date().toISOString(),
    };
    pendingCreatedTxIdsRef.current.add(transaction.id);
    const updatedTransactions = sortTransactionsDesc([transaction, ...(transactionsRef.current || [])]);
    setBills(updatedBills);
    billsRef.current = updatedBills;
    CloudStore.saveBills(updatedBills);
    setTransactions(updatedTransactions);
    transactionsRef.current = updatedTransactions;
    CloudStore.saveTransactions(updatedTransactions);
    triggerSyncFlash();
    lastLocalWriteTimeRef.current = Date.now();
    void pushToCloud({ bills: updatedBills, transactions: updatedTransactions });
    showToast(`Bill marked as paid by ${payerName}`, 'success');
  };

  const settleBill = (billId: string, recordTx: boolean = true) => {
    if (!currentUser) return;
    const nowIso = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    const targetBill = (billsRef.current || []).find(b => b.id === billId);
    if (!targetBill) return;

    const updatedBills = (billsRef.current || []).map(b => {
      if (b.id === billId) {
        return {
          ...b,
          isSettled: true,
          settledDate: nowIso,
        };
      }
      return b;
    });

    let updatedTransactions = transactionsRef.current || [];
    let payerName = 'Payer';
    let receiverName = 'Receiver';
    let settledAmount = 0;

    if (recordTx && partner) {
      const splitInfo = getBillSplitInfo(targetBill, currentUser.id, partner.id, partner.name);
      if (splitInfo.amountOwed > 0) {
        settledAmount = splitInfo.amountOwed;
        const partnerOwesMe = splitInfo.status === 'partner_owes_you';
        const payer = partnerOwesMe ? partner : currentUser;
        const receiver = partnerOwesMe ? currentUser : partner;
        payerName = payer.name;
        receiverName = receiver.name;

        // 1. Deduct from payer's account (Expense)
        const payerExpenseTx: Transaction = {
          id: createRecordId('tx'),
          title: `Settlement: Paid to ${receiver.name} (${targetBill.title})`,
          amount: settledAmount,
          type: 'expense',
          categoryId: 'cat-settlement',
          categoryName: 'Bill Settlement',
          categoryColor: '#10B981',
          categoryIcon: 'ArrowRightLeft',
          paymentMethod: 'UPI / Pix',
          date: nowIso,
          userId: payer.id,
          userName: payer.name,
          userAvatar: (payer.avatarUrl && !payer.avatarUrl.startsWith('data:')) ? payer.avatarUrl : undefined,
          isShared: true,
          notes: `Splitwise settlement payment for "${targetBill.title}" to ${receiver.name}`,
          createdAt: now,
        };

        // 2. Add to receiver's account (Income)
        const receiverIncomeTx: Transaction = {
          id: createRecordId('tx'),
          title: `Settlement: Received from ${payer.name} (${targetBill.title})`,
          amount: settledAmount,
          type: 'income',
          categoryId: 'cat-settlement',
          categoryName: 'Bill Settlement',
          categoryColor: '#10B981',
          categoryIcon: 'ArrowRightLeft',
          paymentMethod: 'UPI / Pix',
          date: nowIso,
          userId: receiver.id,
          userName: receiver.name,
          userAvatar: (receiver.avatarUrl && !receiver.avatarUrl.startsWith('data:')) ? receiver.avatarUrl : undefined,
          isShared: true,
          notes: `Splitwise settlement received for "${targetBill.title}" from ${payer.name}`,
          createdAt: now,
        };

        pendingCreatedTxIdsRef.current.add(payerExpenseTx.id);
        pendingCreatedTxIdsRef.current.add(receiverIncomeTx.id);
        updatedTransactions = sortTransactionsDesc([payerExpenseTx, receiverIncomeTx, ...updatedTransactions]);
      }
    }

    setBills(updatedBills);
    billsRef.current = updatedBills;
    CloudStore.saveBills(updatedBills);

    if (updatedTransactions !== transactionsRef.current) {
      setTransactions(updatedTransactions);
      transactionsRef.current = updatedTransactions;
      CloudStore.saveTransactions(updatedTransactions);
    }

    triggerSyncFlash();
    lastLocalWriteTimeRef.current = Date.now();
    void pushToCloud({ bills: updatedBills, transactions: updatedTransactions });

    if (settledAmount > 0) {
      showToast(`Settled "${targetBill.title}": Deducted from ${payerName} & added to ${receiverName}`, 'success');
    } else {
      showToast('Debt marked as settled', 'success');
    }
  };

  const settleAllBills = (recordTx: boolean = true) => {
    if (!currentUser) return;
    const nowIso = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    const debtSummary = calculateSplitwiseBalance(billsRef.current || [], currentUser.id, partner?.id);
    const absAmount = Math.abs(debtSummary.netAmount);

    const updatedBills = (billsRef.current || []).map(b => {
      if (debtSummary.unsettledBills.some(ub => ub.id === b.id) || (!b.isSettled && (b.paidByUserId || b.payerId))) {
        return {
          ...b,
          isSettled: true,
          settledDate: nowIso,
        };
      }
      return b;
    });

    let updatedTransactions = transactionsRef.current || [];
    let toastMsg = 'All debts settled up successfully! 🎉';

    if (recordTx && absAmount > 0 && partner) {
      const partnerOwesMe = debtSummary.netAmount > 0;
      const payer = partnerOwesMe ? partner : currentUser;
      const receiver = partnerOwesMe ? currentUser : partner;

      // 1. Deduct from payer's account (Expense)
      const payerExpenseTx: Transaction = {
        id: createRecordId('tx'),
        title: `Settlement: Paid to ${receiver.name}`,
        amount: absAmount,
        type: 'expense',
        categoryId: 'cat-settlement',
        categoryName: 'Bill Settlement',
        categoryColor: '#10B981',
        categoryIcon: 'ArrowRightLeft',
        paymentMethod: 'UPI / Pix',
        date: nowIso,
        userId: payer.id,
        userName: payer.name,
        userAvatar: (payer.avatarUrl && !payer.avatarUrl.startsWith('data:')) ? payer.avatarUrl : undefined,
        isShared: true,
        notes: `Splitwise settlement payment to ${receiver.name} for ${debtSummary.unsettledBillsCount} bill(s)`,
        createdAt: now,
      };

      // 2. Add to receiver's account (Income)
      const receiverIncomeTx: Transaction = {
        id: createRecordId('tx'),
        title: `Settlement: Received from ${payer.name}`,
        amount: absAmount,
        type: 'income',
        categoryId: 'cat-settlement',
        categoryName: 'Bill Settlement',
        categoryColor: '#10B981',
        categoryIcon: 'ArrowRightLeft',
        paymentMethod: 'UPI / Pix',
        date: nowIso,
        userId: receiver.id,
        userName: receiver.name,
        userAvatar: (receiver.avatarUrl && !receiver.avatarUrl.startsWith('data:')) ? receiver.avatarUrl : undefined,
        isShared: true,
        notes: `Splitwise settlement received from ${payer.name} for ${debtSummary.unsettledBillsCount} bill(s)`,
        createdAt: now,
      };

      pendingCreatedTxIdsRef.current.add(payerExpenseTx.id);
      pendingCreatedTxIdsRef.current.add(receiverIncomeTx.id);
      updatedTransactions = sortTransactionsDesc([payerExpenseTx, receiverIncomeTx, ...updatedTransactions]);
      toastMsg = `Settled up: Deducted from ${payer.name} & added to ${receiver.name} 🎉`;
    }

    setBills(updatedBills);
    billsRef.current = updatedBills;
    CloudStore.saveBills(updatedBills);

    if (updatedTransactions !== transactionsRef.current) {
      setTransactions(updatedTransactions);
      transactionsRef.current = updatedTransactions;
      CloudStore.saveTransactions(updatedTransactions);
    }

    triggerSyncFlash();
    lastLocalWriteTimeRef.current = Date.now();
    void pushToCloud({ bills: updatedBills, transactions: updatedTransactions });
    showToast(toastMsg, 'success');
  };

  const deleteBill = (id: string) => {
    pendingCreatedBillIdsRef.current.delete(id);
    deletedBillIdsRef.current.add(id);
    const updated = (billsRef.current || []).filter(b => b.id !== id);
    setBills(updated);
    billsRef.current = updated;
    CloudStore.saveBills(updated);
    triggerSyncFlash();
    lastLocalWriteTimeRef.current = Date.now();
    void pushToCloud({ bills: updated });
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
        budgets, updateBudgets, getBudgetForMonth,
        completeOnboarding,
        signOut: handleSignOut,
        setActiveTab, setViewMode, setCurrency,
        updateCurrentUserProfile,
        addTransaction, updateTransaction, deleteTransaction,
        toggleFlagTransaction, addTransactionComment,
        addCategory,
        addGoal, updateGoal, contributeToGoal, deleteGoal, flagGoal, addGoalComment,
        requestGoalChange, approveGoalChange, rejectGoalChange, cancelGoalChange,
        addStock, updateStock, deleteStock,
        addBill, markBillAsPaid, deleteBill,
        settleBill, settleAllBills,
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

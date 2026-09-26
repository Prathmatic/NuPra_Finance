import type { RealtimeChannel, User as AuthUser } from '@supabase/supabase-js';
import type {
  BillItem,
  Category,
  CoupleVault,
  CurrencyCode,
  FinanceGoal,
  StockInvestment,
  Transaction,
  UserProfile,
  BudgetsConfig,
} from '../types/finance';
import { DEFAULT_CATEGORIES } from '../constants/defaultCategories';
import { getSupabase } from './supabaseClient';
import { compressAvatarImage } from '../utils/imageCompressor';

export interface FinanceSnapshot {
  transactions: Transaction[];
  goals: FinanceGoal[];
  stocks: StockInvestment[];
  bills: BillItem[];
  categories: Category[];
  currency: CurrencyCode;
  budgets?: BudgetsConfig;
}

export interface UserWorkspace {
  currentUser: UserProfile | null;
  vault: CoupleVault | null;
  partner?: UserProfile;
  snapshot: FinanceSnapshot | null;
}

export interface PendingPartnerInvite {
  inviteId: string;
  vaultId: string;
  vaultName: string;
  inviterId: string;
  inviterName: string;
  inviterEmail: string;
  inviterAvatarUrl: string;
  createdAt: string;
}

const emptySnapshot = (): FinanceSnapshot => ({
  transactions: [],
  goals: [],
  stocks: [],
  bills: [],
  categories: DEFAULT_CATEGORIES,
  currency: 'INR',
  budgets: { couple: 0, me: 0, partner: 0 },
});

const toProfile = (row: any, vaultId = ''): UserProfile => {
  const avatarUrl = row.avatar_url || '';
  // If legacy profile in Supabase contains an uncompressed massive base64 (> 25KB),
  // schedule an asynchronous compression so the DB is permanently fixed without blocking UI.
  if (avatarUrl.startsWith('data:') && avatarUrl.length > 25000) {
    void compressAvatarImage(avatarUrl, 128, 0.75).then(async (compressed) => {
      if (compressed && compressed.length < avatarUrl.length) {
        try {
          await getSupabase().from('profiles').update({ avatar_url: compressed }).eq('id', row.id);
        } catch {}
      }
    });
  }
  return {
    id: row.id,
    name: row.display_name,
    email: row.email,
    avatarUrl,
    partnerCode: '',
    vaultId,
    createdAt: row.created_at,
  };
};

export async function requestEmailCode(email: string): Promise<void> {
  const { error } = await getSupabase().auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
}

export async function verifyEmailCode(email: string, token: string): Promise<AuthUser> {
  const normalizedEmail = email.trim().toLowerCase();
  const trimmedToken = token.trim();
  const client = getSupabase();

  let { data, error } = await client.auth.verifyOtp({
    email: normalizedEmail,
    token: trimmedToken,
    type: 'email',
  });

  if (error) {
    const fallback = await client.auth.verifyOtp({
      email: normalizedEmail,
      token: trimmedToken,
      type: 'signup',
    });
    if (!fallback.error && fallback.data.user) {
      return fallback.data.user;
    }
    throw error;
  }

  if (!data.user) throw new Error('Email verification did not return a user.');
  return data.user;
}

export async function getSignedInUser(): Promise<AuthUser | null> {
  const client = getSupabase();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError || !sessionData?.session) return null;
  if (sessionData.session.user) {
    return sessionData.session.user;
  }
  try {
    const { data, error } = await client.auth.getUser();
    if (error) return null;
    return data.user;
  } catch {
    return null;
  }
}

export async function signOut(): Promise<void> {
  const { error } = await getSupabase().auth.signOut({ scope: 'local' });
  if (error) throw error;
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  const user = await getSignedInUser();
  if (!user || user.id !== profile.id) throw new Error('Your Supabase session has expired. Sign in again.');

  let avatarToSave = profile.avatarUrl;
  if (avatarToSave && avatarToSave.startsWith('data:') && avatarToSave.length > 25000) {
    try {
      avatarToSave = await compressAvatarImage(avatarToSave, 128, 0.75);
    } catch {}
  }

  const { error } = await getSupabase().from('profiles').upsert({
    id: profile.id,
    email: profile.email.trim().toLowerCase(),
    display_name: profile.name.trim(),
    avatar_url: avatarToSave,
  });
  if (error) throw error;
  await loadWorkspace();
}

export async function createCoupleVault(
  name: string,
  currency: CurrencyCode,
  monthlyBudget: number,
): Promise<string> {
  const { data, error } = await getSupabase().rpc('create_couple_vault', {
    p_name: name,
    p_currency: currency,
    p_monthly_budget: monthlyBudget,
  });
  if (error) throw error;
  if (typeof data !== 'string') throw new Error('Supabase did not return the new vault ID.');
  return data;
}

export async function invitePartner(vaultId: string, email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  const { error: inviteError } = await getSupabase().rpc('create_partner_invite', {
    p_vault_id: vaultId,
    p_email: normalizedEmail,
  });
  if (inviteError) throw inviteError;

  const { error: mailError } = await getSupabase().auth.signInWithOtp({
    email: normalizedEmail,
    options: { shouldCreateUser: true },
  });
  if (mailError) throw mailError;
}

export async function getMyOwnedVaultId(): Promise<string | null> {
  const { data, error } = await getSupabase()
    .from('vault_members')
    .select('vault_id')
    .eq('role', 'owner')
    .maybeSingle();
  if (error) throw error;
  return data?.vault_id ?? null;
}

export async function getPendingPartnerInvites(): Promise<PendingPartnerInvite[]> {
  const { data, error } = await getSupabase().rpc('get_my_pending_invites');
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    inviteId: row.invite_id,
    vaultId: row.vault_id,
    vaultName: row.vault_name,
    inviterId: row.inviter_id,
    inviterName: row.inviter_name,
    inviterEmail: row.inviter_email,
    inviterAvatarUrl: row.inviter_avatar_url || '',
    createdAt: row.created_at,
  }));
}

export async function acceptPartnerInvite(inviteId: string): Promise<string> {
  const { data, error } = await getSupabase().rpc('accept_partner_invite', {
    p_invite_id: inviteId,
  });
  if (error) throw error;
  if (typeof data !== 'string') throw new Error('Supabase did not return the linked vault ID.');
  return data;
}

export async function loadWorkspace(): Promise<UserWorkspace> {
  const authUser = await getSignedInUser();
  if (!authUser?.email) return { currentUser: null, vault: null, snapshot: null };

  const client = getSupabase();
  const { data: profileRow, error: profileError } = await client
    .from('profiles')
    .select('id, email, display_name, avatar_url, created_at')
    .eq('id', authUser.id)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!profileRow) {
    return {
      currentUser: {
        id: authUser.id,
        name: authUser.user_metadata?.display_name ?? '',
        email: authUser.email.toLowerCase(),
        avatarUrl: authUser.user_metadata?.avatar_url ?? '',
        partnerCode: '',
        vaultId: '',
        createdAt: authUser.created_at,
      },
      vault: null,
      snapshot: null,
    };
  }

  const profile = toProfile(profileRow);
  const { data: membership, error: membershipError } = await client
    .from('vault_members')
    .select('vault_id, role, created_at')
    .eq('user_id', authUser.id)
    .maybeSingle();
  if (membershipError) throw membershipError;
  if (!membership) return { currentUser: profile, vault: null, snapshot: null };

  const { data: vaultRow, error: vaultError } = await client
    .from('couple_vaults')
    .select('id, name, currency, monthly_budget, created_at')
    .eq('id', membership.vault_id)
    .single();
  if (vaultError) throw vaultError;

  const { data: memberRows, error: membersError } = await client
    .from('vault_members')
    .select('user_id, role, created_at')
    .eq('vault_id', membership.vault_id)
    .order('created_at');
  if (membersError) throw membersError;

  const memberIds = (memberRows ?? []).map((row: any) => row.user_id);
  const { data: profileRows, error: profilesError } = await client
    .from('profiles')
    .select('id, email, display_name, avatar_url, created_at')
    .in('id', memberIds);
  if (profilesError) throw profilesError;

  const profilesById = new Map((profileRows ?? []).map((row: any) => [row.id, row]));
  const ownerId = (memberRows ?? []).find((row: any) => row.role === 'owner')?.user_id;
  const partnerId = (memberRows ?? []).find((row: any) => row.role === 'partner')?.user_id;
  const ownerRow = profilesById.get(ownerId) ?? profileRow;
  const partnerRow = partnerId ? profilesById.get(partnerId) : null;
  const vaultId = vaultRow.id;
  const ownerProfile = toProfile(ownerRow, vaultId);
  const partnerProfile = partnerRow ? toProfile(partnerRow, vaultId) : undefined;
  const vault: CoupleVault = {
    id: vaultId,
    inviteCode: '',
    name: vaultRow.name,
    partner1: ownerProfile,
    partner2: partnerProfile,
    currency: vaultRow.currency as CurrencyCode,
    monthlyBudget: Number(vaultRow.monthly_budget) || 0,
    myBudget: 0,
    partnerBudget: 0,
    createdAt: vaultRow.created_at,
  };

  const { data: stateRow, error: stateError } = await client
    .from('vault_finance_state')
    .select('transactions, goals, stocks, bills, categories, currency')
    .eq('vault_id', vaultId)
    .maybeSingle();
  if (stateError) throw stateError;

  let snapshot: FinanceSnapshot;
  if (stateRow) {
    const rawCategories = (stateRow.categories as Category[]) || [];
    const budgetMeta = rawCategories.find(c => c.id === '__budgets_config__');
    const cleanCategories = rawCategories.filter(c => c.id !== '__budgets_config__');
    let parsedBudgets: BudgetsConfig = { couple: Number(vaultRow.monthly_budget) || 0, me: 0, partner: 0 };
    if (budgetMeta) {
      try {
        const parsed = JSON.parse(budgetMeta.name);
        if (typeof parsed === 'object' && parsed !== null) {
          parsedBudgets = {
            couple: Number(parsed.couple) || Number(vaultRow.monthly_budget) || 0,
            me: Number(parsed.me) || 0,
            partner: Number(parsed.partner) || 0,
          };
        }
      } catch {}
    }
    const rawTxs = (stateRow.transactions as Transaction[]) || [];
    let hadBloat = false;
    const cleanTxs = rawTxs.map(tx => {
      if (tx?.userAvatar && (tx.userAvatar.startsWith('data:') || tx.userAvatar.length > 500)) {
        hadBloat = true;
        const { userAvatar, ...rest } = tx;
        return rest as Transaction;
      }
      return tx;
    });

    const rawStocks = (stateRow.stocks as StockInvestment[]) || [];
    const cleanStocks = rawStocks.map(stock => {
      if (stock?.userAvatar && (stock.userAvatar.startsWith('data:') || stock.userAvatar.length > 500)) {
        hadBloat = true;
        const { userAvatar, ...rest } = stock;
        return rest as StockInvestment;
      }
      return stock;
    });

    if (hadBloat) {
      void getSupabase()
        .from('vault_finance_state')
        .update({ transactions: cleanTxs, stocks: cleanStocks })
        .eq('vault_id', vaultId);
    }

    snapshot = {
      transactions: cleanTxs,
      goals: (stateRow.goals as FinanceGoal[]) || [],
      stocks: cleanStocks,
      bills: (stateRow.bills as BillItem[]) || [],
      categories: cleanCategories.length ? cleanCategories : DEFAULT_CATEGORIES,
      currency: (stateRow.currency as CurrencyCode) || 'INR',
      budgets: parsedBudgets,
    };
  } else {
    snapshot = emptySnapshot();
  }

  const currentUser = toProfile(profileRow, vaultId);
  const partner = ownerId === authUser.id ? partnerProfile : ownerProfile;
  return { currentUser, vault, partner, snapshot };
}

export async function saveFinanceSnapshot(vaultId: string, snapshot: FinanceSnapshot): Promise<void> {
  const user = await getSignedInUser();
  if (!user) {
    console.warn('saveFinanceSnapshot: User is not authenticated in Supabase.');
    return;
  }

  const budgetsToPersist = snapshot.budgets || { couple: 0, me: 0, partner: 0 };
  const categoriesToPersist = [
    ...(snapshot.categories || []).filter(c => c.id !== '__budgets_config__'),
    {
      id: '__budgets_config__',
      name: JSON.stringify(budgetsToPersist),
      icon: '',
      color: '',
    },
  ];

  const cleanTxs = (snapshot.transactions || []).map(tx => {
    if (tx?.userAvatar && (tx.userAvatar.startsWith('data:') || tx.userAvatar.length > 500)) {
      const { userAvatar, ...rest } = tx;
      return rest as Transaction;
    }
    return tx;
  });

  const cleanStocks = (snapshot.stocks || []).map(stock => {
    if (stock?.userAvatar && (stock.userAvatar.startsWith('data:') || stock.userAvatar.length > 500)) {
      const { userAvatar, ...rest } = stock;
      return rest as StockInvestment;
    }
    return stock;
  });

  const { error } = await getSupabase().from('vault_finance_state').upsert({
    vault_id: vaultId,
    transactions: cleanTxs,
    goals: snapshot.goals || [],
    stocks: cleanStocks,
    bills: snapshot.bills || [],
    categories: categoriesToPersist,
    currency: snapshot.currency || 'INR',
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'vault_id' });

  if (error) {
    console.error('Supabase saveFinanceSnapshot error:', error);
    throw error;
  }

  // Also update couple_vaults.monthly_budget if permissions allow
  try {
    await getSupabase()
      .from('couple_vaults')
      .update({ monthly_budget: budgetsToPersist.couple })
      .eq('id', vaultId);
  } catch {
    // Non-fatal if RLS restricts direct table update on couple_vaults
  }
}

export async function loadFinanceSnapshot(vaultId: string): Promise<FinanceSnapshot | null> {
  const { data, error } = await getSupabase()
    .from('vault_finance_state')
    .select('transactions, goals, stocks, bills, categories, currency')
    .eq('vault_id', vaultId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const rawCategories = (data.categories as Category[]) || [];
  const budgetMeta = rawCategories.find(c => c.id === '__budgets_config__');
  const cleanCategories = rawCategories.filter(c => c.id !== '__budgets_config__');
  let parsedBudgets: BudgetsConfig = { couple: 0, me: 0, partner: 0 };
  if (budgetMeta) {
    try {
      const parsed = JSON.parse(budgetMeta.name);
      if (typeof parsed === 'object' && parsed !== null) {
        parsedBudgets = {
          couple: Number(parsed.couple) || 0,
          me: Number(parsed.me) || 0,
          partner: Number(parsed.partner) || 0,
        };
      }
    } catch {}
  }

  const rawTxs = (data.transactions as Transaction[]) || [];
  const cleanTxs = rawTxs.map(tx => {
    if (tx?.userAvatar && (tx.userAvatar.startsWith('data:') || tx.userAvatar.length > 500)) {
      const { userAvatar, ...rest } = tx;
      return rest as Transaction;
    }
    return tx;
  });

  const rawStocks = (data.stocks as StockInvestment[]) || [];
  const cleanStocks = rawStocks.map(stock => {
    if (stock?.userAvatar && (stock.userAvatar.startsWith('data:') || stock.userAvatar.length > 500)) {
      const { userAvatar, ...rest } = stock;
      return rest as StockInvestment;
    }
    return stock;
  });

  return {
    transactions: cleanTxs,
    goals: (data.goals as FinanceGoal[]) || [],
    stocks: cleanStocks,
    bills: (data.bills as BillItem[]) || [],
    categories: cleanCategories.length ? cleanCategories : DEFAULT_CATEGORIES,
    currency: (data.currency as CurrencyCode) || 'INR',
    budgets: parsedBudgets,
  };
}

export function subscribeToVaultState(vaultId: string, onChange: () => void): RealtimeChannel {
  return getSupabase()
    .channel(`vault-state:${vaultId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'vault_finance_state',
      filter: `vault_id=eq.${vaultId}`,
    }, onChange)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'profiles',
    }, onChange)
    .subscribe();
}

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
} from '../types/finance';
import { getSupabase } from './supabaseClient';

export interface FinanceSnapshot {
  transactions: Transaction[];
  goals: FinanceGoal[];
  stocks: StockInvestment[];
  bills: BillItem[];
  categories: Category[];
  currency: CurrencyCode;
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
  categories: [],
  currency: 'INR',
});

const toProfile = (row: any, vaultId = ''): UserProfile => ({
  id: row.id,
  name: row.display_name,
  email: row.email,
  avatarUrl: row.avatar_url || '',
  partnerCode: '',
  vaultId,
  createdAt: row.created_at,
});

export async function requestEmailCode(email: string): Promise<void> {
  const { error } = await getSupabase().auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
}

export async function verifyEmailCode(email: string, token: string): Promise<AuthUser> {
  const { data, error } = await getSupabase().auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: token.trim(),
    type: 'email',
  });
  if (error) throw error;
  if (!data.user) throw new Error('Email verification did not return a user.');
  return data.user;
}

export async function getSignedInUser(): Promise<AuthUser | null> {
  const client = getSupabase();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) return null;
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  return data.user;
}

export async function signOut(): Promise<void> {
  const { error } = await getSupabase().auth.signOut({ scope: 'local' });
  if (error) throw error;
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  const user = await getSignedInUser();
  if (!user || user.id !== profile.id) throw new Error('Your Supabase session has expired. Sign in again.');
  const { error } = await getSupabase().from('profiles').upsert({
    id: profile.id,
    email: profile.email.trim().toLowerCase(),
    display_name: profile.name.trim(),
    avatar_url: profile.avatarUrl,
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
    monthlyBudget: Number(vaultRow.monthly_budget),
    createdAt: vaultRow.created_at,
  };

  const { data: stateRow, error: stateError } = await client
    .from('vault_finance_state')
    .select('transactions, goals, stocks, bills, categories, currency')
    .eq('vault_id', vaultId)
    .maybeSingle();
  if (stateError) throw stateError;
  const snapshot = stateRow ? {
    transactions: stateRow.transactions as Transaction[],
    goals: stateRow.goals as FinanceGoal[],
    stocks: stateRow.stocks as StockInvestment[],
    bills: stateRow.bills as BillItem[],
    categories: stateRow.categories as Category[],
    currency: stateRow.currency as CurrencyCode,
  } : emptySnapshot();

  const currentUser = toProfile(profileRow, vaultId);
  const partner = ownerId === authUser.id ? partnerProfile : ownerProfile;
  return { currentUser, vault, partner, snapshot };
}

export async function saveFinanceSnapshot(vaultId: string, snapshot: FinanceSnapshot): Promise<void> {
  const user = await getSignedInUser();
  if (!user) throw new Error('Your Supabase session has expired. Sign in again.');
  const { error } = await getSupabase().from('vault_finance_state').upsert({
    vault_id: vaultId,
    transactions: snapshot.transactions,
    goals: snapshot.goals,
    stocks: snapshot.stocks,
    bills: snapshot.bills,
    categories: snapshot.categories,
    currency: snapshot.currency,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function loadFinanceSnapshot(vaultId: string): Promise<FinanceSnapshot | null> {
  const { data, error } = await getSupabase()
    .from('vault_finance_state')
    .select('transactions, goals, stocks, bills, categories, currency')
    .eq('vault_id', vaultId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    transactions: data.transactions as Transaction[],
    goals: data.goals as FinanceGoal[],
    stocks: data.stocks as StockInvestment[],
    bills: data.bills as BillItem[],
    categories: data.categories as Category[],
    currency: data.currency as CurrencyCode,
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

import { BillItem } from '../types/finance';

export interface SplitwiseDebtSummary {
  netAmount: number; // positive: partner owes me, negative: I owe partner, 0: settled
  partnerOwesMe: number;
  iOwePartner: number;
  unsettledBillsCount: number;
  unsettledBills: BillItem[];
}

export interface BillSplitInfo {
  status: 'partner_owes_you' | 'you_owe_partner' | 'shared_unpaid' | 'settled' | 'personal';
  amountOwed: number;
  payerName: string;
  borrowerName?: string;
  badgeLabel: string;
  badgeType: 'emerald' | 'amber' | 'slate' | 'blue';
  description: string;
}

/**
 * Calculates net debt and totals between current user and partner across all bills.
 */
export function calculateSplitwiseBalance(
  bills: BillItem[],
  currentUserId?: string,
  partnerId?: string
): SplitwiseDebtSummary {
  if (!currentUserId || !partnerId) {
    return {
      netAmount: 0,
      partnerOwesMe: 0,
      iOwePartner: 0,
      unsettledBillsCount: 0,
      unsettledBills: [],
    };
  }

  let partnerOwesMe = 0;
  let iOwePartner = 0;
  const unsettledBills: BillItem[] = [];

  bills.forEach((bill) => {
    // Settled bills do not contribute to current debt
    if (bill.isSettled) return;

    const split = bill.splitType || 'equal';
    if (split === 'personal') return;

    // Payer is whoever paid it or is designated as the payer
    const payer = bill.paidByUserId || bill.payerId;
    if (!payer) return;

    if (split === 'equal') {
      const half = bill.amount / 2;
      if (payer === currentUserId) {
        partnerOwesMe += half;
        unsettledBills.push(bill);
      } else if (payer === partnerId) {
        iOwePartner += half;
        unsettledBills.push(bill);
      }
    } else if (split === 'full_debt') {
      const borrower = bill.borrowerId;
      if (payer === currentUserId && (borrower === partnerId || !borrower)) {
        partnerOwesMe += bill.amount;
        unsettledBills.push(bill);
      } else if (payer === partnerId && (borrower === currentUserId || !borrower)) {
        iOwePartner += bill.amount;
        unsettledBills.push(bill);
      }
    }
  });

  return {
    netAmount: partnerOwesMe - iOwePartner,
    partnerOwesMe,
    iOwePartner,
    unsettledBillsCount: unsettledBills.length,
    unsettledBills,
  };
}

/**
 * Determines exact split description, badge styling, and debt for a specific bill relative to current user.
 */
export function getBillSplitInfo(
  bill: BillItem,
  currentUserId?: string,
  partnerId?: string,
  partnerName: string = 'Partner'
): BillSplitInfo {
  const split = bill.splitType || 'equal';
  const payer = bill.paidByUserId || bill.payerId;
  const payerName = bill.paidByUserName || bill.payerName || (payer === currentUserId ? 'You' : partnerName);

  if (bill.isSettled) {
    return {
      status: 'settled',
      amountOwed: 0,
      payerName,
      badgeLabel: 'Settled',
      badgeType: 'slate',
      description: 'Debt has been settled between partners',
    };
  }

  if (split === 'personal') {
    return {
      status: 'personal',
      amountOwed: 0,
      payerName,
      badgeLabel: 'Personal',
      badgeType: 'slate',
      description: 'Solo bill (no partner split)',
    };
  }

  // If unpaid and no designated payer
  if (!bill.isPaid && !payer) {
    return {
      status: 'shared_unpaid',
      amountOwed: bill.amount / 2,
      payerName: 'Upcoming',
      badgeLabel: 'Split 50/50',
      badgeType: 'blue',
      description: `Each pays half`,
    };
  }

  if (split === 'equal') {
    const half = bill.amount / 2;
    if (payer === currentUserId) {
      return {
        status: 'partner_owes_you',
        amountOwed: half,
        payerName: 'You',
        borrowerName: partnerName,
        badgeLabel: `${partnerName} owes you`,
        badgeType: 'emerald',
        description: `Split 50/50 · You paid full, ${partnerName} owes 50%`,
      };
    } else if (payer === partnerId) {
      return {
        status: 'you_owe_partner',
        amountOwed: half,
        payerName: partnerName,
        borrowerName: 'You',
        badgeLabel: `You owe ${partnerName}`,
        badgeType: 'amber',
        description: `Split 50/50 · ${partnerName} paid full, you owe 50%`,
      };
    }
  }

  if (split === 'full_debt') {
    const borrower = bill.borrowerId;
    if (payer === currentUserId && (borrower === partnerId || !borrower)) {
      return {
        status: 'partner_owes_you',
        amountOwed: bill.amount,
        payerName: 'You',
        borrowerName: partnerName,
        badgeLabel: `${partnerName} owes 100%`,
        badgeType: 'emerald',
        description: `You paid for ${partnerName} · ${partnerName} owes full amount`,
      };
    } else if (payer === partnerId && (borrower === currentUserId || !borrower)) {
      return {
        status: 'you_owe_partner',
        amountOwed: bill.amount,
        payerName: partnerName,
        borrowerName: 'You',
        badgeLabel: `You owe 100%`,
        badgeType: 'amber',
        description: `${partnerName} paid for you · You owe full amount`,
      };
    }
  }

  return {
    status: 'personal',
    amountOwed: 0,
    payerName,
    badgeLabel: 'Bill',
    badgeType: 'slate',
    description: '',
  };
}

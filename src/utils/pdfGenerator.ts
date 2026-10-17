export interface StatementTransactionItem {
  date: string;
  title: string;
  categoryName: string;
  userName: string;
  paymentMethod?: string;
  type: 'income' | 'expense';
  amount: number;
  isGoalExpense?: boolean;
}

export interface StatementGoalItem {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  isCompleted: boolean;
  category?: string;
}

export interface StatementBreakdownItem {
  name: string;
  amount: number;
  percentage: number;
  /** PDF fill color as [r,g,b] in 0-1 range */
  color: [number, number, number];
  type: 'savings' | 'expense' | 'goal' | 'stock';
}

export interface StatementData {
  scopeLabel: string;
  periodLabel: string;
  statementDate: string;
  vaultName: string;
  vaultId: string;
  accountHolders: string;
  currency: string;
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  savingsRate?: number;
  goalCapital?: number;
  stocksInvested?: number;
  breakdown?: StatementBreakdownItem[];
  transactions: StatementTransactionItem[];
  goals?: StatementGoalItem[];
}

function stringToUint8Array(str: string): Uint8Array {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i) & 0xff;
  }
  return bytes;
}

function escapePdf(text: string | undefined): string {
  if (!text) return '';
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

/**
 * Builds a high-definition standard PDF 1.4 binary for financial statements.
 * Features:
 * - NP Brand Lettermark Icon
 * - Executive Statistics KPI cards for the selected timeframe
 * - Dedicated Financial Goals & Milestones section
 * - Wide-column transaction ledger with un-truncated text
 * - Clean multi-page pagination with verified footer
 */
export function generateStatementPdfBlob(statement: StatementData): Blob {
  const pageWidth = 595.28; // Standard A4 width in points
  const pageHeight = 841.89; // Standard A4 height in points
  const margin = 32;
  const contentWidth = pageWidth - margin * 2; // 531.28pt

  const goalsList = (statement.goals || []).slice(0, 4); // Show up to 4 primary goals on page 1
  const hasGoalsSection = goalsList.length > 0;

  // With goals section, page 1 fits ~15 transactions; without goals ~22. Subsequent pages fit 34.
  const rowsPerPageFirst = hasGoalsSection ? 15 : 22;
  const rowsPerPageSubsequent = 34;

  const pagesData: StatementTransactionItem[][] = [];
  const remainingTxs = [...statement.transactions];

  if (remainingTxs.length === 0) {
    pagesData.push([]);
  } else {
    pagesData.push(remainingTxs.splice(0, rowsPerPageFirst));
    while (remainingTxs.length > 0) {
      pagesData.push(remainingTxs.splice(0, rowsPerPageSubsequent));
    }
  }

  const totalPages = pagesData.length;
  const pageStreams: string[] = [];

  pagesData.forEach((pageTxs, pageIdx) => {
    const isFirstPage = pageIdx === 0;
    const ops: string[] = [];

    const setColor = (r: number, g: number, b: number, isStroke = false) => {
      ops.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} ${isStroke ? 'RG' : 'rg'}`);
    };

    const drawRect = (x: number, y: number, w: number, h: number, fill = true, stroke = false) => {
      ops.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re`);
      if (fill && stroke) ops.push('B');
      else if (fill) ops.push('f');
      else if (stroke) ops.push('S');
    };

    const drawText = (text: string, x: number, y: number, font = '/F1', size = 10) => {
      const cleanText = escapePdf(text);
      ops.push('BT');
      ops.push(`${font} ${size} Tf`);
      ops.push(`${x.toFixed(2)} ${y.toFixed(2)} Td`);
      ops.push(`(${cleanText}) Tj`);
      ops.push('ET');
    };

    if (isFirstPage) {
      // ─────────────────────────────────────────────────────────────────────────
      // 1. TOP BRAND BANNER WITH NP ICON
      // ─────────────────────────────────────────────────────────────────────────
      const bannerTop = pageHeight - margin;
      const bannerH = 54;
      setColor(0.06, 0.09, 0.16); // slate-900 background
      drawRect(margin, bannerTop - bannerH, contentWidth, bannerH, true, false);

      // Emerald accent stripe
      setColor(0.06, 0.72, 0.51); // emerald-500
      drawRect(margin, bannerTop - bannerH - 3, contentWidth, 3, true, false);

      // --- NP LOGO ICON BADGE ---
      const iconX = margin + 10;
      const iconY = bannerTop - bannerH + 10;
      const iconSize = 34;
      // Indigo rounded box
      setColor(0.26, 0.22, 0.79); // indigo-600
      setColor(0.06, 0.72, 0.51, true); // emerald border
      drawRect(iconX, iconY, iconSize, iconSize, true, true);
      // NP Lettermark text
      setColor(1, 1, 1);
      drawText('NP', iconX + 6.5, iconY + 9, '/F2', 15);

      // Brand Title & Tagline
      setColor(1, 1, 1);
      drawText('NUPRA FINANCE', iconX + iconSize + 10, bannerTop - 24, '/F2', 15);
      setColor(0.75, 0.82, 0.95);
      drawText('OFFICIAL FINANCIAL STATEMENT & AUDIT LEDGER', iconX + iconSize + 10, bannerTop - 38, '/F1', 7.5);

      // Date & Vault right-aligned
      setColor(1, 1, 1);
      drawText(`Statement Date: ${statement.statementDate}`, margin + contentWidth - 180, bannerTop - 23, '/F2', 8.5);
      setColor(0.70, 0.76, 0.88);
      drawText(`Vault ID: ${statement.vaultId}`, margin + contentWidth - 180, bannerTop - 36, '/F1', 8);

      // ─────────────────────────────────────────────────────────────────────────
      // 2. ACCOUNT & PERIOD DETAIL BOXES
      // ─────────────────────────────────────────────────────────────────────────
      const boxY = bannerTop - bannerH - 3 - 68;
      const boxW = (contentWidth - 10) / 2;
      const boxH = 62;

      // Box 1: Account Info
      setColor(0.97, 0.98, 0.99); // #f8fafc
      setColor(0.88, 0.90, 0.94, true);
      drawRect(margin, boxY, boxW, boxH, true, true);

      setColor(0.06, 0.09, 0.16);
      drawText('ACCOUNT INFORMATION', margin + 10, boxY + boxH - 14, '/F2', 8);
      setColor(0.3, 0.35, 0.45);
      drawText(`Vault Name: ${statement.vaultName}`, margin + 10, boxY + boxH - 27, '/F1', 8);
      drawText(`Account Scope: ${statement.scopeLabel}`, margin + 10, boxY + boxH - 39, '/F1', 8);
      drawText(`Account Holders: ${statement.accountHolders}`, margin + 10, boxY + boxH - 51, '/F1', 8);

      // Box 2: Statement Period
      setColor(0.97, 0.98, 0.99);
      setColor(0.88, 0.90, 0.94, true);
      drawRect(margin + boxW + 10, boxY, boxW, boxH, true, true);

      setColor(0.06, 0.09, 0.16);
      drawText('STATEMENT PERIOD DETAILS', margin + boxW + 20, boxY + boxH - 14, '/F2', 8);
      setColor(0.3, 0.35, 0.45);
      drawText(`Period: ${statement.periodLabel}`, margin + boxW + 20, boxY + boxH - 27, '/F1', 8);
      drawText(`Base Currency: ${statement.currency}`, margin + boxW + 20, boxY + boxH - 39, '/F1', 8);
      drawText(`Total Ledger Entries: ${statement.transactions.length} records`, margin + boxW + 20, boxY + boxH - 51, '/F1', 8);

      // ─────────────────────────────────────────────────────────────────────────
      // 3. EXECUTIVE FINANCIAL STATISTICS (4 CARDS)
      // ─────────────────────────────────────────────────────────────────────────
      const statY = boxY - 50;
      const statW = (contentWidth - 18) / 4;
      const statH = 44;

      // Card 1: Total Income
      setColor(0.94, 0.98, 0.95);
      setColor(0.72, 0.92, 0.80, true);
      drawRect(margin, statY, statW, statH, true, true);
      setColor(0.15, 0.45, 0.30);
      drawText('TOTAL CREDITS (INCOME)', margin + 6, statY + statH - 12, '/F2', 6.5);
      setColor(0.02, 0.58, 0.38);
      drawText(`+${statement.currency} ${statement.totalIncome.toFixed(2)}`, margin + 6, statY + 10, '/F2', 10);

      // Card 2: Total Expenses
      const card2X = margin + statW + 6;
      setColor(0.99, 0.94, 0.94);
      setColor(0.96, 0.75, 0.75, true);
      drawRect(card2X, statY, statW, statH, true, true);
      setColor(0.60, 0.18, 0.18);
      drawText('TOTAL DEBITS (EXPENSES)', card2X + 6, statY + statH - 12, '/F2', 6.5);
      setColor(0.85, 0.15, 0.15);
      drawText(`-${statement.currency} ${statement.totalExpense.toFixed(2)}`, card2X + 6, statY + 10, '/F2', 10);

      // Card 3: Net Savings
      const card3X = margin + (statW + 6) * 2;
      setColor(0.95, 0.96, 0.99);
      setColor(0.78, 0.82, 0.95, true);
      drawRect(card3X, statY, statW, statH, true, true);
      setColor(0.20, 0.25, 0.50);
      const rateStr = statement.savingsRate !== undefined ? ` (${statement.savingsRate}%)` : '';
      drawText(`NET SAVINGS${rateStr}`, card3X + 6, statY + statH - 12, '/F2', 6.5);
      const isPositive = statement.netSavings >= 0;
      if (isPositive) setColor(0.06, 0.09, 0.16);
      else setColor(0.85, 0.15, 0.15);
      drawText(`${isPositive ? '+' : '-'}${statement.currency} ${Math.abs(statement.netSavings).toFixed(2)}`, card3X + 6, statY + 10, '/F2', 10);

      // Card 4: Goal Capital / Allocations
      const card4X = margin + (statW + 6) * 3;
      setColor(0.97, 0.95, 0.99);
      setColor(0.88, 0.78, 0.96, true);
      drawRect(card4X, statY, statW, statH, true, true);
      setColor(0.40, 0.15, 0.55);
      drawText('GOALS CAPITAL ALLOCATED', card4X + 6, statY + statH - 12, '/F2', 6.5);
      setColor(0.45, 0.12, 0.65);
      drawText(`${statement.currency} ${(statement.goalCapital || 0).toFixed(2)}`, card4X + 6, statY + 10, '/F2', 10);

      // ─────────────────────────────────────────────────────────────────────────
      // 4. FINANCIAL ALLOCATION PIE CHART
      // ─────────────────────────────────────────────────────────────────────────
      const pieItems = (statement.breakdown || []).filter(b => b.amount > 0);
      const hasPie = pieItems.length > 0;
      let currentSectionY = statY - 14;

      if (hasPie) {
        currentSectionY -= 12;
        setColor(0.06, 0.09, 0.16);
        drawText('FINANCIAL ALLOCATION & EXPENSE BREAKDOWN', margin, currentSectionY, '/F2', 9);
        currentSectionY -= 6;

        // Section background
        const pieSectionH = 110;
        setColor(0.97, 0.98, 0.99);
        setColor(0.88, 0.90, 0.94, true);
        drawRect(margin, currentSectionY - pieSectionH, contentWidth, pieSectionH, true, true);

        // -- Draw pie chart (vector wedges) --
        const cx = margin + 58;  // pie center x
        const cy = currentSectionY - pieSectionH / 2; // pie center y
        const R = 42;  // radius

        const total = pieItems.reduce((s, b) => s + b.amount, 0);
        let startAngle = -Math.PI / 2; // start at top

        pieItems.forEach(item => {
          const sweep = (item.amount / total) * 2 * Math.PI;
          const endAngle = startAngle + sweep;

          // Build wedge: center -> arc (approx with many segments) -> close
          const [r, g, b] = item.color;
          setColor(r, g, b);

          // Draw wedge as polyline path
          const steps = Math.max(8, Math.ceil(sweep * 8));
          const pts: string[] = [];
          pts.push(`${cx.toFixed(2)} ${cy.toFixed(2)} m`);
          for (let s = 0; s <= steps; s++) {
            const a = startAngle + (sweep * s) / steps;
            const px = cx + R * Math.cos(a);
            const py = cy + R * Math.sin(a);
            pts.push(`${px.toFixed(2)} ${py.toFixed(2)} l`);
          }
          pts.push('h f'); // close & fill
          ops.push(pts.join(' '));

          startAngle = endAngle;
        });

        // White center circle (donut effect)
        setColor(0.97, 0.98, 0.99);
        const innerR = R * 0.42;
        const innerSteps = 24;
        const innerPts: string[] = [];
        for (let s = 0; s <= innerSteps; s++) {
          const a = (2 * Math.PI * s) / innerSteps;
          const px = cx + innerR * Math.cos(a);
          const py = cy + innerR * Math.sin(a);
          innerPts.push(s === 0 ? `${px.toFixed(2)} ${py.toFixed(2)} m` : `${px.toFixed(2)} ${py.toFixed(2)} l`);
        }
        innerPts.push('h f');
        ops.push(innerPts.join(' '));

        // Total label in center
        setColor(0.06, 0.09, 0.16);
        drawText('TOTAL', cx - 11, cy + 5, '/F2', 5.5);
        setColor(0.20, 0.50, 0.35);
        const totalStr = total >= 10000 ? `${(total / 1000).toFixed(1)}k` : total.toFixed(0);
        drawText(totalStr, cx - 10, cy - 3, '/F2', 6.5);

        // -- Legend (right side, 2-column grid) --
        const legendX = margin + 124;
        const legendRowH = 14;
        const legendColW = (contentWidth - 130) / 2;
        const legendStartY = currentSectionY - 14;

        pieItems.forEach((item, idx) => {
          const col = idx % 2;
          const row = Math.floor(idx / 2);
          const lx = legendX + col * legendColW;
          const ly = legendStartY - row * legendRowH;

          if (ly < currentSectionY - pieSectionH + 8) return; // out of bounds guard

          // Colored swatch
          const [r, g, b] = item.color;
          setColor(r, g, b);
          drawRect(lx, ly - 5, 7, 7, true, false);

          // Name
          setColor(0.06, 0.09, 0.16);
          const truncName = item.name.length > 18 ? item.name.slice(0, 16) + '..' : item.name;
          drawText(truncName, lx + 10, ly - 4, '/F2', 6.5);

          // Amount + pct
          setColor(0.35, 0.40, 0.50);
          drawText(`${statement.currency} ${item.amount.toFixed(0)} (${item.percentage}%)`, lx + 10, ly - 10.5, '/F1', 5.5);
        });

        currentSectionY -= (pieSectionH + 8);
      }

      // ─────────────────────────────────────────────────────────────────────────
      // 5. FINANCIAL GOALS & MILESTONES SECTION (SEPARATE)
      // ─────────────────────────────────────────────────────────────────────────

      // Goals section follows directly (section label removed - printed in block above)
      if (hasGoalsSection) {
        currentSectionY -= 14;
        setColor(0.06, 0.09, 0.16);
        drawText('FINANCIAL GOALS & MILESTONES', margin, currentSectionY, '/F2', 9);

        currentSectionY -= 16;
        // Goals Header Table
        const goalHeaderH = 16;
        setColor(0.93, 0.95, 0.98);
        setColor(0.82, 0.86, 0.90, true);
        drawRect(margin, currentSectionY - goalHeaderH, contentWidth, goalHeaderH, true, true);

        const gCol1 = margin + 6;
        const gCol2 = gCol1 + 170;
        const gCol3 = gCol2 + 90;
        const gCol4 = gCol3 + 90;
        const gCol5 = margin + contentWidth - 75;

        setColor(0.3, 0.35, 0.45);
        drawText('GOAL NAME', gCol1, currentSectionY - 11, '/F2', 7);
        drawText('TARGET AMOUNT', gCol2, currentSectionY - 11, '/F2', 7);
        drawText('CURRENT SAVED', gCol3, currentSectionY - 11, '/F2', 7);
        drawText('PROGRESS', gCol4, currentSectionY - 11, '/F2', 7);
        drawText('STATUS', gCol5, currentSectionY - 11, '/F2', 7);

        currentSectionY -= goalHeaderH;
        const goalRowH = 15;

        goalsList.forEach((g, gIdx) => {
          currentSectionY -= goalRowH;
          if (gIdx % 2 === 1) {
            setColor(0.98, 0.985, 0.995);
            drawRect(margin, currentSectionY, contentWidth, goalRowH, true, false);
          }
          setColor(0.90, 0.92, 0.95, true);
          ops.push(`${margin} ${currentSectionY.toFixed(2)} m ${(margin + contentWidth).toFixed(2)} ${currentSectionY.toFixed(2)} l S`);

          const pct = g.targetAmount > 0 ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) : 0;
          const cleanGoalTitle = g.title.length > 28 ? g.title.slice(0, 26) + '..' : g.title;

          setColor(0.06, 0.09, 0.16);
          drawText(cleanGoalTitle, gCol1, currentSectionY + 4.5, '/F2', 7.5);

          setColor(0.3, 0.35, 0.45);
          drawText(`${statement.currency} ${g.targetAmount.toFixed(2)}`, gCol2, currentSectionY + 4.5, '/F1', 7.5);

          setColor(0.02, 0.58, 0.38);
          drawText(`${statement.currency} ${g.currentAmount.toFixed(2)}`, gCol3, currentSectionY + 4.5, '/F2', 7.5);

          setColor(0.2, 0.25, 0.45);
          drawText(`${pct}% Completed`, gCol4, currentSectionY + 4.5, '/F1', 7.5);

          if (g.isCompleted || pct >= 100) {
            setColor(0.02, 0.58, 0.38);
            drawText('COMPLETED', gCol5, currentSectionY + 4.5, '/F2', 7);
          } else {
            setColor(0.3, 0.4, 0.6);
            drawText('IN PROGRESS', gCol5, currentSectionY + 4.5, '/F1', 7);
          }
        });

        currentSectionY -= 12;
      }

      // ─────────────────────────────────────────────────────────────────────────
      // 5. TRANSACTION LEDGER TABLE (PAGE 1)
      // ─────────────────────────────────────────────────────────────────────────
      currentSectionY -= 10;
      setColor(0.06, 0.09, 0.16);
      drawText('TRANSACTION LEDGER & AUDIT TRAIL', margin, currentSectionY, '/F2', 9);

      currentSectionY -= 14;
      const headerH = 18;
      setColor(0.93, 0.95, 0.98);
      setColor(0.80, 0.84, 0.88, true);
      drawRect(margin, currentSectionY - headerH, contentWidth, headerH, true, true);

      // Ledger Columns (Generous width to prevent text omission)
      const c1 = margin + 6;        // Date: 55pt
      const c2 = c1 + 58;           // Description: 185pt
      const c3 = c2 + 185;          // Category: 95pt
      const c4 = c3 + 95;           // Paid By: 70pt
      const c5 = c4 + 70;           // Type: 35pt
      const c6 = margin + contentWidth - 8; // Amount right-aligned

      setColor(0.3, 0.35, 0.45);
      drawText('DATE', c1, currentSectionY - 12, '/F2', 7.5);
      drawText('DESCRIPTION', c2, currentSectionY - 12, '/F2', 7.5);
      drawText('CATEGORY', c3, currentSectionY - 12, '/F2', 7.5);
      drawText('PAID BY', c4, currentSectionY - 12, '/F2', 7.5);
      drawText('TYPE', c5, currentSectionY - 12, '/F2', 7.5);
      drawText('AMOUNT', c6 - 45, currentSectionY - 12, '/F2', 7.5);

      let rowY = currentSectionY - headerH;
      const rowH = 17;

      pageTxs.forEach((t, idx) => {
        rowY -= rowH;
        if (idx % 2 === 1) {
          setColor(0.985, 0.99, 0.998);
          drawRect(margin, rowY, contentWidth, rowH, true, false);
        }
        setColor(0.91, 0.93, 0.96, true);
        ops.push(`${margin} ${rowY.toFixed(2)} m ${(margin + contentWidth).toFixed(2)} ${rowY.toFixed(2)} l S`);

        // Date
        setColor(0.35, 0.4, 0.5);
        drawText(t.date || '', c1, rowY + 5, '/F1', 7.5);

        // Description (Full width, up to 38 characters without cutting words)
        const desc = (t.title || 'Transaction').length > 38 ? (t.title || 'Transaction').slice(0, 36) + '..' : (t.title || 'Transaction');
        setColor(0.06, 0.09, 0.16);
        drawText(desc, c2, rowY + 5, '/F2', 7.5);

        // Category
        setColor(0.4, 0.45, 0.55);
        const cat = (t.categoryName || 'General').length > 20 ? (t.categoryName || 'General').slice(0, 18) + '..' : (t.categoryName || 'General');
        drawText(cat, c3, rowY + 5, '/F1', 7.5);

        // Paid By
        const user = (t.userName || 'Joint').length > 14 ? (t.userName || 'Joint').slice(0, 12) + '..' : (t.userName || 'Joint');
        drawText(user, c4, rowY + 5, '/F1', 7.5);

        // Type Badge (CR / DR)
        if (t.type === 'income') {
          setColor(0.02, 0.58, 0.38);
          drawText('CR', c5, rowY + 5, '/F2', 7.5);
        } else {
          setColor(0.85, 0.18, 0.18);
          drawText('DR', c5, rowY + 5, '/F2', 7.5);
        }

        // Amount (Formatted with currency)
        const amtStr = `${t.type === 'income' ? '+' : '-'}${statement.currency} ${Number(t.amount).toFixed(2)}`;
        if (t.type === 'income') setColor(0.02, 0.58, 0.38);
        else setColor(0.85, 0.18, 0.18);
        drawText(amtStr, c6 - 65, rowY + 5, '/F2', 7.5);
      });

      if (pageTxs.length === 0) {
        rowY -= rowH * 2;
        setColor(0.5, 0.55, 0.65);
        drawText('No transactions found in this period.', margin + contentWidth / 2 - 80, rowY + 5, '/F1', 9);
      }
    } else {
      // ─────────────────────────────────────────────────────────────────────────
      // SUBSEQUENT PAGES: STREAMLINED HEADER + FULL LEDGER
      // ─────────────────────────────────────────────────────────────────────────
      const subTop = pageHeight - margin;
      setColor(0.06, 0.09, 0.16);
      drawText('NUPRA FINANCE — TRANSACTION AUDIT LEDGER', margin, subTop - 12, '/F2', 10);
      setColor(0.4, 0.45, 0.55);
      drawText(`${statement.scopeLabel} · ${statement.periodLabel} · Vault ID: ${statement.vaultId}`, margin, subTop - 24, '/F1', 8);

      setColor(0.85, 0.88, 0.92, true);
      ops.push(`${margin} ${(subTop - 29).toFixed(2)} m ${(margin + contentWidth).toFixed(2)} ${(subTop - 29).toFixed(2)} l S`);

      const tableTop = subTop - 36;
      const headerH = 18;
      setColor(0.93, 0.95, 0.98);
      setColor(0.80, 0.84, 0.88, true);
      drawRect(margin, tableTop - headerH, contentWidth, headerH, true, true);

      const c1 = margin + 6;
      const c2 = c1 + 58;
      const c3 = c2 + 185;
      const c4 = c3 + 95;
      const c5 = c4 + 70;
      const c6 = margin + contentWidth - 8;

      setColor(0.3, 0.35, 0.45);
      drawText('DATE', c1, tableTop - 12, '/F2', 7.5);
      drawText('DESCRIPTION', c2, tableTop - 12, '/F2', 7.5);
      drawText('CATEGORY', c3, tableTop - 12, '/F2', 7.5);
      drawText('PAID BY', c4, tableTop - 12, '/F2', 7.5);
      drawText('TYPE', c5, tableTop - 12, '/F2', 7.5);
      drawText('AMOUNT', c6 - 45, tableTop - 12, '/F2', 7.5);

      let rowY = tableTop - headerH;
      const rowH = 17;

      pageTxs.forEach((t, idx) => {
        rowY -= rowH;
        if (idx % 2 === 1) {
          setColor(0.985, 0.99, 0.998);
          drawRect(margin, rowY, contentWidth, rowH, true, false);
        }
        setColor(0.91, 0.93, 0.96, true);
        ops.push(`${margin} ${rowY.toFixed(2)} m ${(margin + contentWidth).toFixed(2)} ${rowY.toFixed(2)} l S`);

        setColor(0.35, 0.4, 0.5);
        drawText(t.date || '', c1, rowY + 5, '/F1', 7.5);

        const desc = (t.title || 'Transaction').length > 38 ? (t.title || 'Transaction').slice(0, 36) + '..' : (t.title || 'Transaction');
        setColor(0.06, 0.09, 0.16);
        drawText(desc, c2, rowY + 5, '/F2', 7.5);

        setColor(0.4, 0.45, 0.55);
        const cat = (t.categoryName || 'General').length > 20 ? (t.categoryName || 'General').slice(0, 18) + '..' : (t.categoryName || 'General');
        drawText(cat, c3, rowY + 5, '/F1', 7.5);

        const user = (t.userName || 'Joint').length > 14 ? (t.userName || 'Joint').slice(0, 12) + '..' : (t.userName || 'Joint');
        drawText(user, c4, rowY + 5, '/F1', 7.5);

        if (t.type === 'income') {
          setColor(0.02, 0.58, 0.38);
          drawText('CR', c5, rowY + 5, '/F2', 7.5);
        } else {
          setColor(0.85, 0.18, 0.18);
          drawText('DR', c5, rowY + 5, '/F2', 7.5);
        }

        const amtStr = `${t.type === 'income' ? '+' : '-'}${statement.currency} ${Number(t.amount).toFixed(2)}`;
        if (t.type === 'income') setColor(0.02, 0.58, 0.38);
        else setColor(0.85, 0.18, 0.18);
        drawText(amtStr, c6 - 65, rowY + 5, '/F2', 7.5);
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PAGE FOOTER (ON ALL PAGES)
    // ─────────────────────────────────────────────────────────────────────────
    const footerY = margin + 12;
    setColor(0.88, 0.90, 0.93, true);
    ops.push(`${margin} ${footerY + 12} m ${(margin + contentWidth).toFixed(2)} ${footerY + 12} l S`);

    setColor(0.45, 0.50, 0.60);
    drawText(`NuPra Finance Official Verified Ledger • Page ${pageIdx + 1} of ${totalPages}`, margin, footerY + 2, '/F1', 7.5);
    drawText('Confidential • Generated securely for account holders', margin + contentWidth - 210, footerY + 2, '/F1', 7.5);

    pageStreams.push(ops.join('\n'));
  });

  // Construct PDF Objects
  const objects: string[] = [];
  const addObj = (str: string) => {
    objects.push(str);
    return objects.length;
  };

  addObj('<< /Type /Catalog /Pages 2 0 R >>');

  const pageObjIds: string[] = [];
  for (let i = 0; i < totalPages; i++) {
    pageObjIds.push(`${5 + i * 2} 0 R`);
  }
  addObj(`<< /Type /Pages /Kids [${pageObjIds.join(' ')}] /Count ${totalPages} >>`);
  addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');

  pageStreams.forEach((streamContent, idx) => {
    const streamObjId = 6 + idx * 2;
    addObj(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${streamObjId} 0 R >>`
    );
    const byteLen = streamContent.length;
    addObj(`<< /Length ${byteLen} >>\nstream\n${streamContent}\nendstream`);
  });

  let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets: number[] = [];

  objects.forEach((objContent, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${objContent}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  offsets.forEach((off) => {
    pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  });

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  const uint8 = stringToUint8Array(pdf);
  return new Blob([uint8.buffer as ArrayBuffer], { type: 'application/pdf' });
}


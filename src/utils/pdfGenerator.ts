export interface StatementTransactionItem {
  date: string;
  title: string;
  categoryName: string;
  userName: string;
  paymentMethod?: string;
  type: 'income' | 'expense';
  amount: number;
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
  transactions: StatementTransactionItem[];
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
 * Builds a pure standard PDF 1.4 binary for financial statements.
 * Zero external libraries needed, runs in any browser and mobile environment.
 */
export function generateStatementPdfBlob(statement: StatementData): Blob {
  const pageWidth = 595.28; // Standard A4 width in points
  const pageHeight = 841.89; // Standard A4 height in points
  const margin = 36;
  const contentWidth = pageWidth - margin * 2; // 523.28pt

  const rowsPerPageFirst = 24;
  const rowsPerPageSubsequent = 32;

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
      // 1. Top Brand Banner
      setColor(0.06, 0.09, 0.16); // #0f172a slate-900
      drawRect(margin, pageHeight - margin - 50, contentWidth, 50, true, false);

      // Accent gradient/indigo line
      setColor(0.39, 0.40, 0.95); // indigo
      drawRect(margin, pageHeight - margin - 53, contentWidth, 3, true, false);

      // Brand Title & Tagline
      setColor(1, 1, 1);
      drawText('NUPRA FINANCE', margin + 14, pageHeight - margin - 26, '/F2', 15);
      setColor(0.8, 0.85, 0.95);
      drawText('OFFICIAL ACCOUNT STATEMENT', margin + 14, pageHeight - margin - 40, '/F1', 8);

      // Date & Vault right-aligned
      setColor(1, 1, 1);
      drawText(`Statement Date: ${statement.statementDate}`, margin + contentWidth - 175, pageHeight - margin - 25, '/F2', 8.5);
      setColor(0.7, 0.75, 0.85);
      drawText(`Vault ID: ${statement.vaultId}`, margin + contentWidth - 175, pageHeight - margin - 38, '/F1', 8);

      // 2. Info Boxes: Left (Account Info), Right (Statement Period Details)
      const boxY = pageHeight - margin - 130;
      const boxW = (contentWidth - 12) / 2;
      const boxH = 68;

      // Box 1
      setColor(0.97, 0.98, 0.99); // #f8fafc
      setColor(0.89, 0.91, 0.94, true); // stroke #e2e8f0
      drawRect(margin, boxY, boxW, boxH, true, true);

      setColor(0.06, 0.09, 0.16);
      drawText('ACCOUNT INFORMATION', margin + 10, boxY + boxH - 15, '/F2', 8);
      setColor(0.3, 0.35, 0.45);
      drawText(`Vault Name: ${statement.vaultName}`, margin + 10, boxY + boxH - 28, '/F1', 8);
      drawText(`Account Scope: ${statement.scopeLabel}`, margin + 10, boxY + boxH - 41, '/F1', 8);
      drawText(`Holders: ${statement.accountHolders}`, margin + 10, boxY + boxH - 54, '/F1', 8);

      // Box 2
      setColor(0.97, 0.98, 0.99);
      setColor(0.89, 0.91, 0.94, true);
      drawRect(margin + boxW + 12, boxY, boxW, boxH, true, true);

      setColor(0.06, 0.09, 0.16);
      drawText('STATEMENT PERIOD DETAILS', margin + boxW + 22, boxY + boxH - 15, '/F2', 8);
      setColor(0.3, 0.35, 0.45);
      drawText(`Period: ${statement.periodLabel}`, margin + boxW + 22, boxY + boxH - 28, '/F1', 8);
      drawText(`Currency: ${statement.currency}`, margin + boxW + 22, boxY + boxH - 41, '/F1', 8);
      drawText(`Total Transactions: ${statement.transactions.length} entries`, margin + boxW + 22, boxY + boxH - 54, '/F1', 8);

      // 3. Financial Summary 3 Cards
      const cardY = boxY - 55;
      const cardW = (contentWidth - 16) / 3;
      const cardH = 46;

      // Card 1: Total Income (Credits)
      setColor(0.94, 0.98, 0.95);
      setColor(0.75, 0.92, 0.82, true);
      drawRect(margin, cardY, cardW, cardH, true, true);
      setColor(0.2, 0.5, 0.35);
      drawText('TOTAL CREDITS (INCOME)', margin + 8, cardY + cardH - 14, '/F2', 7);
      setColor(0.02, 0.60, 0.40);
      drawText(`+${statement.currency} ${statement.totalIncome.toFixed(2)}`, margin + 8, cardY + 11, '/F2', 11.5);

      // Card 2: Total Expenses (Debits)
      setColor(0.99, 0.94, 0.94);
      setColor(0.98, 0.78, 0.78, true);
      drawRect(margin + cardW + 8, cardY, cardW, cardH, true, true);
      setColor(0.65, 0.2, 0.2);
      drawText('TOTAL DEBITS (EXPENSES)', margin + cardW + 16, cardY + cardH - 14, '/F2', 7);
      setColor(0.85, 0.15, 0.15);
      drawText(`-${statement.currency} ${statement.totalExpense.toFixed(2)}`, margin + cardW + 16, cardY + 11, '/F2', 11.5);

      // Card 3: Net Savings
      setColor(0.95, 0.96, 0.99);
      setColor(0.80, 0.84, 0.95, true);
      drawRect(margin + (cardW + 8) * 2, cardY, cardW, cardH, true, true);
      setColor(0.25, 0.3, 0.55);
      drawText('NET FINANCIAL SAVINGS', margin + (cardW + 8) * 2 + 8, cardY + cardH - 14, '/F2', 7);
      const isPositive = statement.netSavings >= 0;
      if (isPositive) setColor(0.06, 0.09, 0.16);
      else setColor(0.85, 0.15, 0.15);
      drawText(`${isPositive ? '+' : '-'}${statement.currency} ${Math.abs(statement.netSavings).toFixed(2)}`, margin + (cardW + 8) * 2 + 8, cardY + 11, '/F2', 11.5);
    } else {
      // Sub-page minimal header
      setColor(0.06, 0.09, 0.16);
      drawText('NUPRA FINANCE STATEMENT', margin, pageHeight - margin - 15, '/F2', 10);
      setColor(0.4, 0.45, 0.55);
      drawText(`${statement.scopeLabel} · ${statement.periodLabel}`, margin, pageHeight - margin - 27, '/F1', 8);
      setColor(0.85, 0.88, 0.92, true);
      ops.push(`${margin} ${(pageHeight - margin - 33).toFixed(2)} m ${(margin + contentWidth).toFixed(2)} ${(pageHeight - margin - 33).toFixed(2)} l S`);
    }

    // 4. Ledger Table Header
    const tableTop = isFirstPage ? pageHeight - margin - 200 : pageHeight - margin - 45;
    const headerH = 20;

    setColor(0.94, 0.96, 0.98); // #f1f5f9
    setColor(0.80, 0.84, 0.88, true);
    drawRect(margin, tableTop - headerH, contentWidth, headerH, true, true);

    const c1 = margin + 6;
    const c2 = c1 + 65;
    const c3 = c2 + 155;
    const c4 = c3 + 95;
    const c5 = c4 + 80;
    const c6 = margin + contentWidth - 8;

    setColor(0.3, 0.35, 0.45);
    drawText('DATE', c1, tableTop - 13, '/F2', 7.5);
    drawText('DESCRIPTION', c2, tableTop - 13, '/F2', 7.5);
    drawText('CATEGORY', c3, tableTop - 13, '/F2', 7.5);
    drawText('PAID BY', c4, tableTop - 13, '/F2', 7.5);
    drawText('TYPE', c5, tableTop - 13, '/F2', 7.5);
    drawText('AMOUNT', c6 - 45, tableTop - 13, '/F2', 7.5);

    // 5. Ledger Table Rows
    let currentY = tableTop - headerH;
    const rowH = 19;

    pageTxs.forEach((t, idx) => {
      currentY -= rowH;
      // Alternating row background
      if (idx % 2 === 1) {
        setColor(0.98, 0.985, 0.995);
        drawRect(margin, currentY, contentWidth, rowH, true, false);
      }
      setColor(0.90, 0.92, 0.95, true);
      ops.push(`${margin} ${currentY.toFixed(2)} m ${(margin + contentWidth).toFixed(2)} ${currentY.toFixed(2)} l S`);

      // Date
      setColor(0.3, 0.35, 0.45);
      drawText(t.date || '', c1, currentY + 6, '/F1', 8);

      // Description (truncate nicely if long)
      const desc = (t.title || 'Transaction').length > 28 ? (t.title || 'Transaction').slice(0, 26) + '..' : (t.title || 'Transaction');
      setColor(0.06, 0.09, 0.16);
      drawText(desc, c2, currentY + 6, '/F2', 8);

      // Category
      setColor(0.4, 0.45, 0.55);
      const cat = (t.categoryName || 'General').length > 18 ? (t.categoryName || 'General').slice(0, 16) + '..' : (t.categoryName || 'General');
      drawText(cat, c3, currentY + 6, '/F1', 8);

      // Paid By User
      const user = (t.userName || '').length > 14 ? (t.userName || '').slice(0, 12) + '..' : (t.userName || '');
      drawText(user, c4, currentY + 6, '/F1', 8);

      // Type Badge (CR / DR)
      if (t.type === 'income') {
        setColor(0.02, 0.60, 0.40);
        drawText('CR', c5, currentY + 6, '/F2', 8);
      } else {
        setColor(0.85, 0.2, 0.2);
        drawText('DR', c5, currentY + 6, '/F2', 8);
      }

      // Amount
      const amtStr = `${t.type === 'income' ? '+' : '-'}${statement.currency} ${Number(t.amount).toFixed(2)}`;
      drawText(amtStr, c6 - 65, currentY + 6, '/F2', 8);
    });

    if (pageTxs.length === 0 && isFirstPage) {
      currentY -= rowH * 2;
      setColor(0.5, 0.55, 0.65);
      drawText('No transactions found for this period.', margin + contentWidth / 2 - 80, currentY + 6, '/F1', 9);
    }

    // 6. Footer on each page
    setColor(0.85, 0.88, 0.92, true);
    ops.push(`${margin} ${30} m ${(margin + contentWidth).toFixed(2)} ${30} l S`);

    setColor(0.55, 0.6, 0.7);
    drawText('Confidential Statement · Generated by NuPra Finance Account Verification System', margin, 18, '/F1', 7);
    drawText(`Page ${pageIdx + 1} of ${totalPages}`, margin + contentWidth - 55, 18, '/F1', 7);

    pageStreams.push(ops.join('\n'));
  });

  // Assemble full PDF objects
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

/**
 * Triggers a download or mobile share of the generated PDF file.
 * Automatically utilizes Web Share API with File support on mobile devices (Android/iOS)
 * to open the native system Save / Open with PDF Viewer / Share sheet,
 * falling back to standard browser downloads.
 */
export async function downloadStatementPdf(statement: StatementData, fileName: string): Promise<boolean> {
  const cleanFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  const blob = generateStatementPdfBlob(statement);

  // 1. Mobile (Android/iOS): Web Share API with File support
  // In Capacitor / Android WebViews, <a download> does not trigger file download for blob URLs.
  // navigator.share({ files: [file] }) natively triggers Android's System Share & Save Dialog!
  try {
    const nav = typeof navigator !== 'undefined' ? (navigator as any) : null;
    if (nav && typeof nav.canShare === 'function' && typeof nav.share === 'function') {
      const file = new File([blob], cleanFileName, { type: 'application/pdf' });
      if (nav.canShare({ files: [file] })) {
        await nav.share({
          files: [file],
          title: cleanFileName,
          text: `NuPra Finance Statement: ${statement.scopeLabel} (${statement.periodLabel})`,
        });
        return true;
      }
    }
  } catch (shareErr: any) {
    if (shareErr?.name === 'AbortError') {
      // User dismissed the native share sheet
      return true;
    }
    console.warn('Web Share API failed, trying direct browser download:', shareErr);
  }

  // 2. Standard Browser direct download link (Desktop / Chrome / Firefox)
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', cleanFileName);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    return true;
  } catch (downloadErr) {
    console.warn('Blob URL download failed, trying data URI fallback:', downloadErr);
  }

  // 3. Fallback: Base64 Data URI for mobile browsers / WebViews that block blob: downloads
  try {
    return new Promise<boolean>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          const base64Url = reader.result as string;
          const link = document.createElement('a');
          link.href = base64Url;
          link.setAttribute('download', cleanFileName);
          link.target = '_blank';
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          resolve(true);
        } catch (innerErr) {
          console.error('Data URI download failed:', innerErr);
          resolve(false);
        }
      };
      reader.onerror = () => resolve(false);
      reader.readAsDataURL(blob);
    });
  } catch (dataErr) {
    console.error('All PDF download strategies failed:', dataErr);
    return false;
  }
}

/**
 * Opens print view via a hidden iframe or new window, triggering native print/save dialogs.
 */
export function printStatementHtml(html: string): void {
  // 1. Try hidden iframe first
  try {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.error('Print iframe error:', e);
        } finally {
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 2000);
        }
      }, 300);
      return;
    }
  } catch (iframeErr) {
    console.warn('Hidden iframe print failed, trying window fallback:', iframeErr);
  }

  // 2. Fallback to window.open (especially for mobile WebViews)
  try {
    const win = window.open('', '_blank');
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => {
        try {
          win.print();
        } catch (e) {
          console.warn('Window print failed:', e);
        }
      }, 300);
    }
  } catch (winErr) {
    console.error('Print window error:', winErr);
  }
}

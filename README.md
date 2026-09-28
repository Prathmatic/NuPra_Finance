# NuPra Finance
> **Collaborative & Individual Finance Tracking for Couples and Partners**  
> *Mobile App & APK (`NuPra Finance.apk`) with Real-Time Decoupled Cloud Synchronization*

---

## Technical Documentation
For complete database schemas, entity relationship diagrams, backend synchronization engines, UI component architecture, and functional specifications, refer to:
- **[Technical Implementation & Architecture Guide](TECHNICAL_IMPLEMENTATION.md)**

---

## Overview

NuPra Finance is a collaborative personal and couple finance mobile application designed to manage joint and personal ledgers with complete transparency, real-time live synchronization, stock portfolio tracking, financial goal deficit analysis, Splitwise-style bill management, and automated Android APK generation.

### Key Capabilities

1. **Collaborative and Personal Modes**:
   - Toggle between **Together (Combined)**, **Nu (Personal)**, and **Pra (Personal)** views.
   - Distinct partner avatars and attribution indicators on every entry.
2. **Mutual Read-Only Protection with Active Review**:
   - Partner transactions are strictly read-only: neither partner can modify or delete the other's entries.
   - 1-tap flagging for review and discussion (`Flagged for Discussion`).
   - Integrated inline activity drawer with real-time comment threads.
3. **On-The-Fly Category Creation**:
   - Create and assign custom categories directly from the transaction recording screen.
   - Automatic keyword-based icon mapping and color assignment.
   - Persistent union synchronization ensuring custom labels are never lost across devices.
4. **Supabase Real-Time Cloud Sync**:
   - Sub-30ms WebSocket broadcast synchronizes entries between partner devices instantly.
   - PostgreSQL Row Level Security (RLS) ensures ledger data is isolated strictly to the two vault members.
5. **Email OTP and Partner Linking**:
   - Supabase Auth verifies each partner's email using a 6-digit one-time code.
   - Invites are bound to the invited email; vaults strictly enforce a two-member limit.
6. **Income and Expense Tracking**:
   - Fast logging with quick amount presets.
   - Color-coded default categories (Salary, Rent, Food, Leisure, Travel, Health, Hobby, Groceries, Utilities, Investment) plus on-the-fly custom labels.
   - Payment method logging: Credit Card, UPI / Pix, Bank Transfer, Cash, Debit Card, Crypto.
7. **Financial Goals with Deficit Analytics**:
   - Milestone tracking with live calculation of remaining deficit to target.
   - One-tap deposits with celebration confetti upon goal completion.
   - Goal assignment to Me, Partner, or Both.
8. **Stock Market Portfolio Tracking**:
   - Monthly equity purchase logs (asset name, ticker, shares, amount, purchaser).
   - Monthly and all-time capital contribution breakdowns by partner.
9. **Splitwise Bill Management**:
   - Track upcoming, unpaid, and paid bills with due date countdowns.
   - Four split modes: Equal (50/50), Partner Owes Me, I Owe Partner, and Personal.
   - One-tap "Pay" action that transitions status and posts the expense directly to the ledger.
10. **Visual Analytics and Reporting**:
    - Individual savings vs joint savings comparison.
    - Monthly and yearly expense trends.
    - Interactive category spending breakdown donut chart.
    - Deficit analytics and stock market capital distribution.
11. **Multi-Currency Support**:
    - Toggle between Indian Rupee (**INR - ₹**) and Euro (**EUR - €**).

---

## Android APK and CI/CD Setup

### Automated Cloud APK Build via GitHub Actions
Whenever changes are pushed to `main` or `NuPra_nupur_version`, the `.github/workflows/build-apk.yml` workflow automatically compiles and publishes `NuPra Finance.apk`.

Install on Android devices via:
1. **GitHub Releases**: Download directly from [GitHub Releases](https://github.com/Prathmatic/NuPra_Finance/releases).
2. **Workflow Artifacts**: Download the `NuPra-Finance-APK` zip file from [GitHub Actions](https://github.com/Prathmatic/NuPra_Finance/actions).

### Local Development
```bash
# Install dependencies
npm install

# Configure Supabase
Copy-Item .env.example .env.local

# Start local dev server
npm run dev

# Build production bundle and sync Capacitor Android
npm run cap:build
```

### Supabase Setup
1. Create a Supabase project.
2. In the **SQL Editor**, execute [`supabase/migrations/20260925000100_couple_finance.sql`](supabase/migrations/20260925000100_couple_finance.sql).
3. In **Authentication -> Providers -> Email**, enable email login.
   - **Magic Link Template**: Set body to include `{{ .Token }}` for 6-digit OTP delivery.
   - **Custom SMTP**: Configure custom SMTP (e.g. Resend, Brevo, AWS SES) under **SMTP Settings** to bypass default rate limits.
4. Copy `Project URL` and `anon public key` from **Project Settings -> API** into `.env.local` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

---

## Design System Tokens
- **Velvet Rose**: `#E11D48` & `#F43F5E` (Focus, Highlights)
- **Midnight Slate**: `#0B0F19` & `#0F172A` (Background, Contrast)
- **Emerald**: `#10B981` (Income, Positive Cash Flow)
- **Indigo / Sapphire**: `#6366F1` & `#3B82F6` (Investments, Primary Actions)
- **Amber**: `#F59E0B` (Goals, Flagged Expenses)

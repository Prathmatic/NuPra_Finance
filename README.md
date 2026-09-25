# NuPra Finance 💑💰
> **Simple, Smart, and Transparent Finance Tracking for Couples & Individuals**  
> *Mobile App & APK (`NuPra Finance.apk`) with Decoupled Cloud Synchronization*

---

## ✨ Overview

**NuPra Finance** is a modern collaborative finance mobile application tailored for couples to manage joint and personal finances with complete transparency, real-time live synchronization, stock portfolio tracking, financial goal deficit tracking, bill management, and automated Android APK generation.

### 🌟 Key Highlights

1. **Collaborative & Personal Modes**:
   - Seamlessly toggle between **Together (Combined)**, **Nu (Personal)**, and **Pra (Personal)** views.
   - See who logged each transaction with personalized partner avatars and attribution chips.
2. **Supabase Cloud Sync**:
   - Financial transactions, stock market contributions, goals, and bills are decoupled from Git code.
   - Supabase Realtime plus polling synchronizes the couple vault across devices.
   - Postgres Row Level Security restricts profiles and finance data to the two vault members.
3. **Email OTP & Partner Linking**:
   - Supabase Auth verifies each partner's email with a one-time code.
   - Invitations are bound to the invited email; a vault accepts at most two accounts.
   - Both partner profiles and photos are stored in the protected vault workspace.
4. **Income & Expense Tracking**:
   - Quick logging with instant amount chips.
   - Default color-coded labels: **Salary, Rent, Food, Leisure, Travel, Health, Hobby** + custom label builder with color picker and icons.
   - Payment methods: **Credit Card, UPI / Pix, Bank Transfer, Cash, Debit Card, Crypto**.
5. **Finance Goals with Deficit Analytics**:
   - Set targets for dream vacations, home down payments, and weddings.
   - Live calculation of **"Amount needed more to achieve goal"**.
   - One-tap deposit with confetti celebration upon milestone achievement!
6. **Stock Market Investment Section**:
   - Log monthly equity purchases (Asset name, ticker, shares, amount, purchaser).
   - Shows **how much investment was done that month by both partners** (Nu vs Pra vs Combined).
   - Shows **all-time individual stock market capital** invested.
7. **Bill & Payment Tracking**:
   - Manage upcoming, unpaid, and paid bills with due date countdowns.
   - One-tap **"Pay"** button that automatically logs the expense to your ledger!
8. **Interactive Visual Statistics**:
   - **Individual saving vs Together saving** comparison plots.
   - **Individual vs Together expenses** on monthly and yearly basis.
   - **Goal Deficit chart** comparing saved vs amount needed more.
   - **Stock market individual capital distribution** pie/split charts.
   - **Category spending breakdown** interactive donut chart.
9. **Multi-Currency**:
   - Instant toggle between Indian Rupee (**₹ INR**) and Euro (**€ EUR**).

---

## 📱 Android APK & Git Setup

### Automated Cloud APK Build via GitHub Actions
Whenever you push changes to your GitHub repository, the `.github/workflows/build-apk.yml` workflow will automatically build `NuPra Finance.apk`.

You can install it on your mobile phone in two ways:
1. **Direct Mobile Release Download**: Go to [GitHub Releases](https://github.com/Prathmatic/NuPra_Finance/releases) and tap **`NuPra Finance.apk`** to download & install directly.
2. **Workflow Artifacts**: Go to [GitHub Actions](https://github.com/Prathmatic/NuPra_Finance/actions), tap the latest run of **Build NuPra Finance APK**, and download the **`NuPra-Finance-APK`** artifact zip file.

### Local Development
```bash
# Install dependencies
npm install

# Configure Supabase (see below)
Copy-Item .env.example .env.local

# Start local mobile dev server
npm run dev

# Build production assets and sync Android
npm run cap:build
```

### Supabase Setup
1. Create a Supabase project.
2. Open **SQL Editor** and run [`supabase/migrations/20260925000100_couple_finance.sql`](supabase/migrations/20260925000100_couple_finance.sql). It creates the tables, two-member limits, invite RPCs, RLS policies, and Realtime publication.
3. In **Authentication → Email**, enable email sign-in. Edit the Magic Link email template to use `{{ .Token }}` instead of `{{ .ConfirmationURL }}` so Supabase sends a numeric OTP. Configure custom SMTP for real users; Supabase's default mail sender is rate-limited for testing.
4. Copy the Project URL and anon/publishable key from **Project Settings → API** into `.env.local` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
5. Restart Vite after changing environment variables. For GitHub Actions/APK builds, add the same two `VITE_` values as repository Actions variables.

The browser uses only the publishable anon key. **Never put a Supabase `service_role` or secret key in `.env.local` or the app.** Database RLS enforces access; do not disable it on the migration's tables.

### Git Workflow
```bash
# 1. Add your changes
git add .

# 2. Commit
git commit -m "Update NuPra Finance app"

# 3. Push to trigger automated Cloud APK build
git push origin main
```
*Financial records start empty and sync only after a verified account has joined or created a Supabase couple vault.*

---

## 🎨 Theme & Palette
- **Velvet Rose**: `#E11D48` & `#F43F5E` (Romance, Warmth, Focus)
- **Midnight Slate**: `#0B0F19` & `#0F172A` (Luxury, Contrast)
- **Warm Emerald**: `#10B981` (Growth, Positive Cash Flow)
- **Indigo / Sapphire**: `#6366F1` & `#3B82F6` (Trust, Investments)
- **Champagne Gold**: `#F59E0B` (Goals & Achievements)

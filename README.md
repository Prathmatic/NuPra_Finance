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
2. **Cloud Sync & Decoupled State**:
   - Financial transactions, stock market contributions, goals, and bills are decoupled from Git code.
   - **Pushes to Git will NEVER overwrite or erase user records**.
   - Real-time live synchronization across devices and tabs.
3. **Email Verification & Partner Linking**:
   - Verify each email with a one-time code before creating a local profile.
   - Invite one partner by email; their one-time code is bound to that recipient address.
   - Partner names and photos are shared through the couple vault.
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

# Configure email delivery and the shared vault bucket (see below)
Copy-Item .env.example .env.local

# Start local mobile dev server
npm run dev

# Build production assets and sync Android
npm run cap:build
```

### Email and Sync Configuration
Create an EmailJS service and template with the variables `to_email`, `to_name`, `from_name`, and `otp_code`. Set its service ID, template ID, and public key in `.env.local`, and set `VITE_KVDB_BUCKET` to a bucket used only by this deployment. The app will not show or accept an invitation unless the code is stored and the email send succeeds.

**Security limitation:** the current KVDB transport is anonymous and is not suitable for private financial records. Vite environment values are included in the client app, so a bucket name is not a secret or an access-control mechanism. Treat this implementation as a prototype; before using real financial data, move email verification, partner membership checks, and vault data to a backend such as Firebase Auth/Firestore with restrictive security rules or Supabase Auth/Postgres with row-level security.

### Git Workflow
```bash
# 1. Add your changes
git add .

# 2. Commit
git commit -m "Update NuPra Finance app"

# 3. Push to trigger automated Cloud APK build
git push origin main
```
*Local transactions and goals persist on the device; shared sync requires the configured service above.*

---

## 🎨 Theme & Palette
- **Velvet Rose**: `#E11D48` & `#F43F5E` (Romance, Warmth, Focus)
- **Midnight Slate**: `#0B0F19` & `#0F172A` (Luxury, Contrast)
- **Warm Emerald**: `#10B981` (Growth, Positive Cash Flow)
- **Indigo / Sapphire**: `#6366F1` & `#3B82F6` (Trust, Investments)
- **Champagne Gold**: `#F59E0B` (Goals & Achievements)

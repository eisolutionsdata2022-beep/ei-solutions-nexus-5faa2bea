---
name: Finance Subsite
description: Standalone /finance portal with isolated auth, admin-only user provisioning, fresh per-user workspace, full Customers/Loans/Payments/CashBook/Settings tabs in dark studio theme
type: feature
---
Finance is a standalone subsite at `/finance` with its OWN Firebase Auth
instance (named app `finance-portal`) so admin can be logged into both portals
simultaneously without session conflicts.

- **Users**: stored in Firestore `financeUsers/{uid}` — `{ username, displayName, active, createdAt, createdBy, lastLoginAt, notes }`. Auth uses synthetic email `{username}@finance.eisolutions.local`.
- **Provisioning**: Admin-only via `/admin/finance-users`. No public signup. Username pattern: `[a-z0-9_.-]{3,32}`. Password min 8 chars.
- **Activation control**: Admin toggles `active` flag — enforced on login AND on every auth state change (revoked users are signed out instantly).
- **Data isolation**: Finance dashboard uses `financeUser.uid` as the `retailerId` field on all `finance*` Firestore collections — fresh empty workspace per user.
- **Routes**: `/finance` (dashboard), `/finance/login` (dark studio aesthetic). Auto-redirects between login ↔ dashboard based on auth state.
- **Tabs (`src/components/finance-portal/`)**: Dashboard (stats + recent loans), Customers (KYC + camera-less quick-add), Loans (gold items + EMI calc + disburse), Payments (record + receipt list), Cash Book (Income/Expense/BankDeposit ledger), Settings (branch info + default loan parameters). Built from scratch in dark theme — does NOT reuse the gov-themed retailer page.
- **Shared primitives**: `src/components/finance-portal/StudioShell.tsx` — `StudioCard`, `StudioInput`, `StudioSelect`, `StudioButton`, `StudioBadge`, `StudioModal`, `StudioEmpty`. Dark slate/cyan/violet aesthetic. Hardcoded color classes by design (mirrors Digital Classroom intentional bypass of gov tokens).
- **Data layer reuse**: All tabs use the existing `src/lib/finance-firebase.ts` and `src/lib/finance-calculations.ts` — no parallel data layer, atomic `recordPayment` transaction preserved.
- **Retailer portal**: Finance link removed from retailer sidebar. Old `/retailer/finance` route still exists with the original gov-themed UI (admin direct-URL access).
- **Admin sidebar**: New "Finance Users" link added.

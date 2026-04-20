---
name: Finance Subsite
description: Standalone /finance portal with isolated auth (separate Firebase Auth instance), admin-only user provisioning, fresh per-user workspace
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
- **Retailer portal**: Finance link removed from retailer sidebar. Old `/retailer/finance` route still exists (admin direct-URL access).
- **Admin sidebar**: New "Finance Users" link added.

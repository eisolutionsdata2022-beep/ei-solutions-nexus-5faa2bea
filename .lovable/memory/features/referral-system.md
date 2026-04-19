---
name: Referral System
description: Auto-code per retailer + ?ref= signup capture + atomic ₹150 activation paying ₹100 to new user and ₹50 to referrer
type: feature
---

Retailers earn ₹50 each time a referred new user activates (configurable).

**Flow:**
1. Retailer opens `/retailer/referrals` → auto-generated code `REF-XXXXXX` + share link `/register?ref=CODE`.
2. New user signs up via link → `users/{uid}.referredBy` set + `referralPending: true`.
3. New user opens `/retailer/activate` → pays ₹150 from wallet (must recharge if low).
4. `atomicReferralActivation` (single Firestore transaction):
   - debits ₹150 from new user wallet
   - credits ₹100 (new user reward) back to new user
   - credits ₹50 (referrer reward) to referrer wallet (if any)
   - sets `users/{uid}.activated = true`
   - writes `referralPayouts/{newUserUid}` (idempotency lock — one payout per referee, ever)

**Collections:**
- `config/referral`: { enabled, activationFee, newUserReward, referrerReward }
- `referralCodes/{code}`: { uid }
- `referralPayouts/{newUserUid}`: full audit row, doc-id = newUserUid (prevents duplicate payouts)
- `users/{uid}.referralCode`, `referredBy`, `activated`, `activatedAt`

**Key files:**
- `src/lib/referral-firebase.ts` — config CRUD, code gen, atomicReferralActivation, subscriptions
- `src/routes/retailer.activate.tsx` — one-time activation page
- `src/routes/retailer.referrals.tsx` — code, link, share, referrals list, earnings
- `src/routes/admin.referrals.tsx` — fee/reward config + global payout log
- `src/routes/register.tsx` — accepts `?ref=` query, validates code, attaches on signup

All amounts admin-configurable. Activation page redirects to `/retailer` after success.

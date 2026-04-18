---
name: Service Activation System
description: Pay-per-service activation with admin-set fees, validity, history log
type: feature
---

Retailers must "Activate Now" each business service before use. Admin sets fee + validity (lifetime/monthly/yearly) per service in `/admin/service-activations-config`. Activation deducts wallet via `atomicDebit` ("Insufficient balance" if low). Activation gate is the **4th and highest-priority layer**, on top of: User Override > Plan > Global Toggle.

**Collections:**
- `serviceActivationConfig/{serviceKey}`: { fee, validity, enabled }
- `serviceActivations/{uid__serviceKey}`: current active record
- `activationHistory`: append-only event log (one row per activation)

**Key files:**
- `src/lib/service-activation.ts` — config CRUD, `activateServiceForUser`, subscriptions
- `src/routes/retailer.my-services.tsx` — Activate Now UI + history
- `src/routes/admin.service-activations-config.tsx` — admin fee/validity table
- `src/routes/admin.service-activations.tsx` — full audit log + revenue stats
- `src/routes/retailer.tsx` — gates non-activated services, redirects to /retailer/my-services

Non-activatable services (excluded): wallet, kyc, transactions, my-services itself.

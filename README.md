# EI Solutions Nexus

A unified e-Governance & retail services platform for VLEs (Village Level Entrepreneurs) across India — built on TanStack Start, React 19, and Firebase, deployed on Lovable Cloud.

🌐 **Live:** [eisoluions.xyz](https://www.eisoluions.xyz) · [ei-solutions-nexus.lovable.app](https://ei-solutions-nexus.lovable.app)

---

## ✨ Features

### Citizen Services
- **e-Governance Portal (E-dis)** — 26+ certificates with multi-step forms, sequential document uploads, and refund handling
- **PAN Portal (UTI)** — PSA registration + coupon purchase via mallikacyberzone.com
- **EI SOLUTIONS PAY** — CSC services via VPS scraper bridge with AES-GCM encrypted credentials
- **BBPS & Recharge** — Ambika API integration with duplicate-check and auto-refund
- **IPPB Banking** — India Post Payments Bank biometric onboarding
- **Money Transfer (DMT)** — Domestic money transfer simulator
- **Finance Subsite** — Loans, deposits, gold loan risk calculator

### Retailer Tools
- **Wallet System** — Paytm QR Add Money, atomic Firestore transactions, full history
- **Service Activation** — Pay-per-service activation with admin-set fees and validity
- **Referral System** — Auto-generated codes, ₹150 activation split (₹100 new user + ₹50 referrer)
- **Job Marketplace** — Inter-retailer work exchange with bidding, ratings, disputes
- **CV Builder** — Europass CV generator with monetization
- **Horoscope** — Premium PDF generation engine
- **Matrimony** — Profile listings and match-making

### Training & Education
- **Digital Classroom v2** — Multi-trainer live grid, WebRTC, 2D + Ready Player Me avatars
- **Virtual Trainer** — Malayalam-only AI avatar with PDF session export
- **Training Guide** — Interactive learning content with PDF booklet export
- **Trainer Earnings** — Dynamic pricing, per-session payouts

### Admin & Governance
- **KYC System** — Retailer registration, document verification, Franchise Certificate generation
- **Commission Center** — Unified payout management (5 tabs, multi-type payouts)
- **CRM & Bulk Communication** — Email/WhatsApp campaigns
- **Service Plans, Activations, Buttons** — Full RBAC with admin overrides
- **Landing CMS** — Content-managed homepage

### Native & Bridges
- **PC Agent (WPF)** — Windows desktop biometric capture relay
- **Android APK** — Field operator companion app
- **Android Interceptor** — Capture-relay for paired retailers
- **VPS Bridges** — CSC, BBPS, WhatsApp Web (HMAC-protected REST APIs)
- **Cloud Functions** — Firestore triggers (Mumbai region)

---

## 🛠️ Tech Stack

- **Framework:** [TanStack Start v1](https://tanstack.com/start) (React 19, SSR, server functions)
- **Build:** Vite 7
- **Styling:** Tailwind CSS v4 (native CSS theme variables, oklch tokens)
- **UI:** shadcn/ui + Radix primitives + Framer Motion
- **Backend:** Firebase (Auth, Firestore, Storage, Cloud Functions)
- **Hosting:** Lovable Cloud (Cloudflare Workers Edge runtime)
- **AI:** Lovable AI Gateway (Gemini)
- **Payments:** Paytm QR
- **Native:** WPF (.NET), Android (Kotlin), Node.js bridges

---

## 🚀 Getting Started

### Prerequisites
- [Bun](https://bun.sh/) (package manager)
- A Firebase project with Auth + Firestore enabled

### Install

```bash
bun install
```

### Develop

```bash
bun run dev
```

The app runs at `http://localhost:5173`.

### Build

```bash
bun run build
```

---

## 🏗️ Project Structure

```
src/
├── routes/              # File-based routing (TanStack Router)
│   ├── __root.tsx       # Root layout
│   ├── index.tsx        # Landing page
│   ├── admin.*.tsx      # Admin panel routes
│   ├── retailer.*.tsx   # Retailer dashboard routes
│   ├── trainer.*.tsx    # Trainer routes
│   ├── staff.*.tsx      # Staff routes
│   └── api/             # HTTP API routes (webhooks, callbacks)
├── lib/                 # Business logic, Firebase helpers, server functions
│   ├── *.functions.ts   # createServerFn wrappers
│   ├── *.server.ts      # Server-only modules
│   └── *-firebase.ts    # Firestore helpers
├── components/          # Reusable UI components
├── hooks/               # Custom React hooks
└── styles.css           # Tailwind v4 theme tokens

native/
├── pc-agent-wpf/            # Windows biometric capture agent
├── android-apk/             # Field operator app
├── android-interceptor/     # Capture-relay app
├── csc-bridge-vps/          # CSC scraper bridge
├── bbps-bridge-vps/         # BBPS provider bridge
├── whatsapp-bridge-vps/     # WhatsApp Web bridge
└── cloud-functions/         # Firebase Cloud Functions
```

---

## 🔐 Security

- **Roles** stored in a separate `user_roles` collection (never on profile)
- **Firebase Auth tokens** validated server-side via `firebase-auth.middleware.ts`
- **Wallet transactions** are atomic via Firestore `runTransaction`
- **API credentials** encrypted with AES-GCM (key from `LOVABLE_API_KEY`)
- **VPS bridges** protected by HMAC-SHA256 signed requests
- **Public APIs** under `/api/public/*` always verify signatures

---

## 👥 User Roles

| Role | Purpose |
|------|---------|
| **Admin** | Full system access, configuration, payouts |
| **Distributor** | Sub-admin with regional retailer oversight |
| **Retailer (VLE)** | Primary service operator |
| **Trainer** | Conducts live training sessions |
| **Staff/Operator** | Sub-user under a retailer |

Default Admin: `admin@eisolutions.com` / `123456` (manual Firestore role assignment required).

---

## 🎨 Design System

- **Branding:** Digital India theme — Navy headers, Saffron/White/Green accent strips
- **Tokens:** Defined in `src/styles.css` using `oklch()`
- **Components:** Use semantic tokens (`bg-primary`, `text-foreground`) — never hardcoded colors
- **Service pages:** Wrapped in `ServicePageShell` with gradient hero + stat chips

---

## 📦 Deployment

The project is developed in [Lovable](https://lovable.dev/) with bidirectional GitHub sync. Pushes to GitHub auto-deploy via Lovable Cloud.

---

## 📄 License

Proprietary — © EI Solutions. All rights reserved.

---

## 🤝 Contributing

This is a private commercial project. For partnership inquiries: [eisoluions.xyz](https://www.eisoluions.xyz)

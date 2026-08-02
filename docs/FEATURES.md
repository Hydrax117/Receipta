# Receipta — Features Overview

> **Docs:** [Overview](README.md) · [Architecture](ARCHITECTURE.md) · [API Reference](API.md) · [Quick Start](../QUICKSTART.md) · [Deployment](../DEPLOYMENT.md) · [Contributing](../CONTRIBUTING.md)

This document describes every implemented feature across the smart contract, backend API, and frontend, along with the current status of planned features.

---

## Table of Contents

1. [Core Value Proposition](#core-value-proposition)
2. [Smart Contract Features](#smart-contract-features)
3. [Backend API Features](#backend-api-features)
4. [Frontend Features](#frontend-features)
5. [Security Features](#security-features)
6. [Known Limitations](#known-limitations)
7. [Roadmap](#roadmap)

---

## Core Value Proposition

Receipta solves payment fraud by replacing screenshots and SMS alerts — which can be faked or edited — with on-chain receipts that anyone can verify independently. The key properties are:

| Property | How it's achieved |
|----------|-------------------|
| **Tamper-proof** | Receipt data lives in Soroban persistent storage; it cannot be edited once written |
| **Publicly verifiable** | Anyone with a receipt ID can query the contract directly or via the public API — no account needed |
| **Deterministic IDs** | Receipt IDs are SHA-256 hashes of `(sender, receiver, amount, timestamp)`, so the ID can be independently computed by any party |
| **Permissionless verification** | The `/verify` page and `GET /api/receipts/:id` endpoint require no authentication |

---

## Smart Contract Features

The Soroban contract (`contract/src/lib.rs`) is the canonical source of truth. All receipt state lives on-chain.

### Receipt Lifecycle Management

**Create receipt** (`create_receipt`)
- Accepts `sender`, `receiver`, `amount` (in stroops), and `token` (SAC address)
- Validates: amount > 0, sender ≠ receiver, no duplicate receipt ID
- Requires authorization from the `sender` address
- Stores the receipt in persistent storage with `status: Pending`
- Appends the receipt ID to the receiver's index for reverse lookup
- Returns the deterministic 32-byte receipt ID

**Confirm receipt** (`confirm_receipt`)
- Transitions `Pending → Confirmed`
- Requires authorization from the `receiver`
- Calculates the platform fee: `max((amount × fee_bps) / 10_000, min_fee)`
- Stores the calculated `fee_amount` on the receipt
- ⚠️ Token transfer is not yet implemented (tracked in [C-03](../GITHUB_ISSUES.md))

**Fail receipt** (`fail_receipt`)
- Transitions `Pending → Failed`
- Intended to be callable by either the sender or receiver
- ⚠️ Authorization check has a bug (tracked in [C-02](../GITHUB_ISSUES.md))

### Querying

**Get single receipt** (`get_receipt`)
- Public read — no authorization required
- Returns the full `Receipt` struct or `None` if not found

**Get receipts by receiver** (`get_receipts_by_receiver`)
- Public read — no authorization required
- Returns a `Vec<BytesN<32>>` of all receipt IDs where the address is the receiver

**Get fee configuration** (`get_fee_config`)
- Public read
- Returns the current `FeeConfig` or `None` if uninitialized

### Platform Administration

**Initialize** (`initialize`)
- Called once to set the `fee_address`, `fee_bps`, and `min_fee`
- Panics if called a second time (see [C-05](../GITHUB_ISSUES.md) for the planned typed-error fix)

**Update fee config** (`update_fee_config`)
- Only callable by the current `fee_address`
- Updates all three fee parameters atomically

### Fee Model

```
calculated_fee = (amount × fee_bps) / 10_000
fee_amount     = max(calculated_fee, min_fee)
```

Current testnet deployment: `fee_bps = 75` (0.75%), `min_fee = 10_000 stroops`.

---

## Backend API Features

The Express/TypeScript backend (`backend/src/`) acts as a gateway between the frontend and the Soroban contract. It does not store canonical receipt data — it reads from the chain.

### Merchant Authentication

- **Registration** (`POST /api/auth/register`): creates a merchant account with bcrypt-hashed password and a Stellar public key. Returns a signed JWT.
- **Login** (`POST /api/auth/login`): validates credentials, returns a fresh JWT.
- JWTs are signed with `JWT_SECRET` (env var), expire after **7 days**, and carry `merchantId`, `email`, and `publicKey` as claims.
- The `authenticateToken` middleware validates the JWT on all protected routes and attaches the decoded merchant to `req.merchant`.

> Data store: currently in-memory `Map`. A PostgreSQL migration path is planned (the `pg` package is already a dependency).

### Receipt Verification

- **Public receipt lookup** (`GET /api/receipts/:id`): proxies to the Soroban contract via `StellarClient.getReceipt()`. No authentication required.
- Validates that the ID is exactly 64 hex characters before querying.
- ⚠️ The `parseReceipt` XDR deserializer in `StellarClient` is a stub — it currently returns placeholder data. Real on-chain values are not yet surfaced (tracked in [B-01](../GITHUB_ISSUES.md)).

### Payment Links

- **Create link** (`POST /api/payment-links`): authenticated merchants generate a shareable payment URL of the form `/pay/:linkId`.
- Links include `amount`, `currency`, `description`, `receiverAddress`, and expire after **24 hours**.
- **Get link** (`GET /api/payment-links/:id`): public endpoint used by the `/pay/:id` frontend page. Returns `410 Gone` for expired links.

> The `/pay/:id` frontend page does not yet exist (tracked in [F-04](../GITHUB_ISSUES.md)).

### Merchant Dashboard Data

- **Receipts list** (`GET /api/merchant/receipts`): returns all receipts associated with the authenticated merchant.
- **Stats** (`GET /api/merchant/stats`): returns aggregate counts and total confirmed volume.

> ⚠️ The `merchantReceipts` map is never written to in the current implementation, so both endpoints always return empty data (tracked in [B-04](../GITHUB_ISSUES.md)).

### Infrastructure

| Feature | Implementation |
|---------|---------------|
| Security headers | `helmet` middleware on all responses |
| CORS | `cors()` — currently open (wildcard); restriction planned per [B-03](../GITHUB_ISSUES.md) |
| JSON parsing | `express.json()` |
| Global error handler | Catches unhandled errors, returns `500` with a consistent JSON envelope |
| Health check | `GET /health` → `{ status: "ok" }` |
| Stellar SDK | `@stellar/stellar-sdk ^12.0.0` for contract interaction |

---

## Frontend Features

The Next.js 14 frontend (`frontend/src/app/`) uses the App Router and Tailwind CSS.

### Pages

| Route | Page | Auth required |
|-------|------|---------------|
| `/` | Landing page | No |
| `/register` | Merchant registration form | No |
| `/login` | Merchant login form | No |
| `/dashboard` | Merchant stats + receipt table | Yes (JWT in localStorage) |
| `/verify` | Public receipt verification | No |

### Landing Page (`/`)

- Hero section with tagline and two CTAs: "Verify a Receipt" and "Merchant Sign Up"
- Three feature cards: Tamper-Proof, Instant Verification, Low Fees
- Navigation links to `/login` and `/dashboard`

### Register Page (`/register`)

- Form fields: email, password, Stellar public key
- Calls `POST /api/auth/register`
- On success: stores JWT in `localStorage`, redirects to `/dashboard`
- Inline error display for API failures

### Login Page (`/login`)

- Form fields: email, password
- Calls `POST /api/auth/login`
- On success: stores JWT in `localStorage`, redirects to `/dashboard`
- Inline error display for invalid credentials

### Dashboard Page (`/dashboard`)

- Reads JWT from `localStorage`; redirects to `/login` if absent
- Fetches stats and receipts in parallel via `Promise.all`
- Stats cards: Total Receipts, Confirmed, Pending, Total Volume (converted to XLM)
- Receipt table: truncated ID, amount, colour-coded status badge, date

### Verify Page (`/verify`)

- Input: 64-character hex receipt ID with client-side length validation
- Calls `GET /api/receipts/:id`
- On success: displays status badge, amount in stroops, sender/receiver addresses, timestamp, and platform fee (if > 0)
- ⚠️ Shows "✓ Receipt Verified" heading regardless of status (tracked in [F-02](../GITHUB_ISSUES.md))

### UI Conventions

- Status badges use consistent colour coding: green = Confirmed, yellow = Pending, red = Failed
- Timestamps are converted from Unix seconds to locale string
- All forms use `required` HTML validation
- Loading states disable submit buttons and show inline text feedback

---

## Security Features

| Feature | Status | Notes |
|---------|--------|-------|
| Password hashing | ✅ Implemented | `bcrypt` with cost factor 10 |
| JWT authentication | ✅ Implemented | 7-day expiry, Bearer scheme |
| HTTP security headers | ✅ Implemented | `helmet` on all responses |
| Input validation (API) | ✅ Partial | Required-field checks on all endpoints |
| Input validation (contract) | ✅ Implemented | Amount, self-payment, duplicate ID checks |
| Typed contract errors | ✅ Implemented | `ReceiptError` enum with 8 codes |
| CORS restriction | ⚠️ Not yet | Currently allows all origins — tracked [B-03](../GITHUB_ISSUES.md) |
| Rate limiting | ⚠️ Not yet | No brute-force protection — tracked [B-02](../GITHUB_ISSUES.md) |
| HttpOnly cookie auth | ⚠️ Not yet | JWT in localStorage is XSS-vulnerable — tracked [F-01](../GITHUB_ISSUES.md) |
| JWT secret validation | ⚠️ Not yet | Falls back to hardcoded default — tracked [B-05](../GITHUB_ISSUES.md) |
| Persistent storage TTL | ⚠️ Not yet | Receipts will expire without `extend_ttl` — tracked [C-04](../GITHUB_ISSUES.md) |

---

## Known Limitations

These are current gaps in the MVP that are tracked as issues:

| Issue | Area | Summary |
|-------|------|---------|
| [C-01](../GITHUB_ISSUES.md) | Contract | `generate_receipt_id` uses address string lengths, not bytes — hash collision risk |
| [C-02](../GITHUB_ISSUES.md) | Contract | `fail_receipt` authorization check always fails; `sender.require_auth()` is called unconditionally |
| [C-03](../GITHUB_ISSUES.md) | Contract | `confirm_receipt` calculates fee but never executes token transfers |
| [C-04](../GITHUB_ISSUES.md) | Contract | No `extend_ttl` calls — persistent entries will expire |
| [C-05](../GITHUB_ISSUES.md) | Contract | `initialize` uses `panic!` instead of returning a typed error; `fee_bps` is uncapped |
| [B-01](../GITHUB_ISSUES.md) | Backend | `parseReceipt` is a stub — all receipt lookups return placeholder data |
| [B-02](../GITHUB_ISSUES.md) | Backend | No rate limiting on auth endpoints |
| [B-03](../GITHUB_ISSUES.md) | Backend | CORS allows all origins |
| [B-04](../GITHUB_ISSUES.md) | Backend | `merchantReceipts` map is never written — dashboard always shows empty |
| [B-05](../GITHUB_ISSUES.md) | Backend | JWT secret falls back to a hardcoded insecure default |
| [F-01](../GITHUB_ISSUES.md) | Frontend | JWT stored in `localStorage` (XSS-vulnerable) |
| [F-02](../GITHUB_ISSUES.md) | Frontend | Verify page shows "✓ Receipt Verified" for Pending/Failed receipts |
| [F-03](../GITHUB_ISSUES.md) | Frontend | Dashboard silently fails on API errors — user sees blank page |
| [F-04](../GITHUB_ISSUES.md) | Frontend | `/pay/:id` page is missing — payment links lead to 404 |
| [F-05](../GITHUB_ISSUES.md) | Frontend | Form labels not associated with inputs — accessibility violation |

---

## Roadmap

### Near-term (fixes to existing MVP)

- [ ] Fix `generate_receipt_id` to hash actual address bytes (C-01)
- [ ] Fix `fail_receipt` authorization (C-02)
- [ ] Implement token transfers in `confirm_receipt` (C-03)
- [ ] Add `extend_ttl` to all persistent storage writes (C-04)
- [ ] Implement real XDR parsing in `parseReceipt` (B-01)
- [ ] Build the `/pay/:id` frontend page (F-04)
- [ ] Fix verify page status rendering (F-02)
- [ ] Add dashboard error state (F-03)
- [ ] Fix form accessibility (F-05)

### Short-term (production hardening)

- [ ] Replace in-memory stores with PostgreSQL
- [ ] Freighter wallet integration on the `/pay/:id` page
- [ ] HttpOnly cookie authentication (F-01 fix)
- [ ] Rate limiting on auth endpoints (B-02)
- [ ] CORS origin allowlist (B-03)
- [ ] Startup validation for required env vars (B-05)
- [ ] Remove JWT `localStorage` usage (F-01)

### Medium-term (feature expansion)

- [ ] WhatsApp / SMS receipt notifications
- [ ] Webhook support for payment events
- [ ] WebSocket real-time payment status updates
- [ ] Fiat price oracle integration (XLM ↔ USD/KES/NGN)
- [ ] Freighter wallet direct payment flow
- [ ] Mainnet deployment
- [ ] Merchant onboarding flow improvements

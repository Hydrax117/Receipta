# Receipta — Architecture

This document describes the system architecture, component responsibilities, data flow, and storage design.

---

## Table of Contents

1. [High-Level Overview](#high-level-overview)
2. [Component Responsibilities](#component-responsibilities)
3. [Technology Stack](#technology-stack)
4. [Data Flow](#data-flow)
5. [Storage Design](#storage-design)
6. [Authentication Flow](#authentication-flow)
7. [Receipt ID Generation](#receipt-id-generation)
8. [Directory Structure](#directory-structure)

---

## High-Level Overview

Receipta is a three-layer application:

```
┌────────────────────────────────────────────────────────────┐
│                       Client Layer                         │
│         Next.js 14 frontend  (localhost:3000)              │
└─────────────────────────┬──────────────────────────────────┘
                          │ HTTP (REST)
┌─────────────────────────▼──────────────────────────────────┐
│                      Backend Layer                         │
│         Express / TypeScript API  (localhost:3001)         │
│                                                            │
│   ┌──────────┐  ┌───────────┐  ┌──────────────────────┐   │
│   │   Auth   │  │  Merchant │  │    StellarClient      │   │
│   │  routes  │  │  routes   │  │  (Soroban SDK proxy)  │   │
│   └──────────┘  └───────────┘  └──────────┬───────────┘   │
└──────────────────────────────────────────┬─────────────────┘
                                           │ Soroban RPC
┌──────────────────────────────────────────▼─────────────────┐
│                    Blockchain Layer                         │
│       Soroban Smart Contract on Stellar Testnet            │
│                                                            │
│   Contract ID:                                             │
│   CDLYITDQBWS7YWD5SGVXED4S4PCZEJJAOODOQ3OFSKJV5HX4ZLKKFWGC │
└────────────────────────────────────────────────────────────┘
```

The **smart contract is the source of truth**. All receipt data lives in Soroban persistent storage on-chain. The backend is stateless with respect to receipt data — it reads from the chain and does not maintain its own receipt database. Merchant account data (email, hashed password) is currently stored in an in-memory map in the backend, with a PostgreSQL migration planned.

---

## Component Responsibilities

### Smart Contract (`contract/`)

- Stores and owns all receipt state on-chain
- Enforces business rules: duplicate prevention, status transitions, authorization
- Calculates and records platform fees on confirmation
- Maintains a reverse index of receipts per receiver address
- Written in Rust using the Soroban SDK v22

### Backend API (`backend/`)

- Provides a REST interface for the frontend
- Handles merchant registration and login (bcrypt + JWT)
- Proxies receipt lookups to the Soroban contract via `StellarClient`
- Manages payment link creation and expiry (in-memory, 24h TTL)
- Applies security middleware: `helmet`, JWT auth, CORS
- Written in TypeScript with Express

### Frontend (`frontend/`)

- Serves five pages: landing, register, login, dashboard, verify
- Calls the backend REST API; does not interact with the Stellar network directly
- Built with Next.js 14 App Router, React 18, and Tailwind CSS

---

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Smart contract | Rust + Soroban SDK | soroban-sdk 22.0.0 |
| Contract build target | wasm32-unknown-unknown | — |
| Backend runtime | Node.js | ≥ 18 |
| Backend framework | Express | ^4.18 |
| Backend language | TypeScript | ^5.3 |
| Stellar SDK | @stellar/stellar-sdk | ^12.0.0 |
| Password hashing | bcrypt | ^5.1 |
| JWT | jsonwebtoken | ^9.0 |
| Security headers | helmet | ^7.1 |
| Frontend framework | Next.js | ^14.1 |
| Frontend language | TypeScript + React | 18 / 5.3 |
| Styling | Tailwind CSS | ^3.4 |
| Backend tests | Jest + ts-jest | 29 |
| Frontend tests | Vitest | ^1.2 |
| Contract tests | cargo test (soroban testutils) | — |

---

## Data Flow

### Public Receipt Verification

```
User enters receipt ID on /verify
        │
        ▼
Frontend: GET /api/receipts/:id
        │
        ▼
Backend: validates ID is 64-char hex
        │
        ▼
StellarClient.getReceipt(id)
  → getContractData(contractId, receiptIdScVal, Persistent)
        │
        ▼
Soroban RPC: reads persistent storage entry
        │
        ▼
Backend: parses XDR ScVal → Receipt struct
  ⚠️  Currently a stub (see Issue B-01)
        │
        ▼
Frontend: renders receipt details
```

### Payment Link Creation

```
Merchant submits form on /dashboard or via API
        │
        ▼
Frontend: POST /api/payment-links (Bearer token)
        │
        ▼
Backend: authenticateToken middleware validates JWT
        │
        ▼
Backend: generates link_<timestamp>_<random> ID
         stores in paymentLinks Map (in-memory)
         sets expiresAt = now + 24h
        │
        ▼
Returns URL: http://localhost:3000/pay/:linkId
```

### Receipt Creation (intended full flow)

```
Customer lands on /pay/:linkId
        │
        ▼
Frontend: GET /api/payment-links/:id
  validates not expired
        │
        ▼
Customer signs payment via Freighter wallet
  (wallet integration not yet implemented)
        │
        ▼
Contract: create_receipt(sender, receiver, amount, token)
  requires sender.require_auth()
  generates deterministic receipt_id
  stores Receipt { status: Pending }
        │
        ▼
Contract: confirm_receipt(receipt_id)
  requires receiver.require_auth()
  calculates fee
  sets status: Confirmed
        │
        ▼
Customer is shown receipt_id → links to /verify
```

---

## Storage Design

### On-chain (Soroban contract)

The contract uses two storage tiers:

**Persistent storage** — survives ledger expiry (with TTL extension, see Issue C-04):

| Key | Value type | Description |
|-----|-----------|-------------|
| `DataKey::Receipt(BytesN<32>)` | `Receipt` | Full receipt struct keyed by receipt ID |
| `DataKey::ReceiverIndex(Address)` | `Vec<BytesN<32>>` | Ordered list of receipt IDs per receiver |

**Instance storage** — tied to the contract instance ledger entry:

| Key | Value type | Description |
|-----|-----------|-------------|
| `DataKey::FeeConfig` | `FeeConfig` | Platform fee configuration (singleton) |

### Off-chain (backend, in-memory)

The backend maintains two in-memory `Map` stores — these reset on server restart and are intended to be replaced by PostgreSQL:

| Store | Key | Value | Purpose |
|-------|-----|-------|---------|
| `merchants` | email | `{ id, email, passwordHash, publicKey }` | Merchant accounts |
| `paymentLinks` | linkId | `{ id, merchantId, amount, currency, ... }` | Payment links with expiry |
| `merchantReceipts` | merchantId | `Array<{ id, amount, status, timestamp }>` | Merchant receipt cache ⚠️ never written |

---

## Authentication Flow

```
POST /api/auth/register
  body: { email, password, publicKey }
        │
        ▼
  bcrypt.hash(password, 10) → passwordHash
  Store in merchants Map
  jwt.sign({ merchantId, email, publicKey }, JWT_SECRET, { expiresIn: '7d' })
        │
        ▼
  Response: { merchant, token }

────────────────────────────────

POST /api/auth/login
  body: { email, password }
        │
        ▼
  merchants.get(email)
  bcrypt.compare(password, merchant.passwordHash)
  jwt.sign(...)
        │
        ▼
  Response: { merchant, token }

────────────────────────────────

Protected routes (e.g. POST /api/payment-links):
  Authorization: Bearer <token>
        │
        ▼
  authenticateToken middleware
  jwt.verify(token, JWT_SECRET)
  req.merchant = decoded payload
        │
        ▼
  Route handler has access to req.merchant.merchantId
```

JWT payload shape:
```json
{
  "merchantId": "merchant_1748000000000",
  "email": "merchant@example.com",
  "publicKey": "GABC...XYZ",
  "iat": 1748000000,
  "exp": 1748604800
}
```

---

## Receipt ID Generation

Receipt IDs are deterministic SHA-256 hashes computed on-chain by the contract:

```rust
env.crypto().sha256(&Bytes::from_array(env, &[
    sender.to_string().len() as u8,    // 1 byte
    receiver.to_string().len() as u8,  // 1 byte
    (amount >> 56) as u8,              // \
    (amount >> 48) as u8,              //  |
    (amount >> 40) as u8,              //  | low 8 bytes
    (amount >> 32) as u8,              //  | of i128
    (amount >> 24) as u8,              //  |
    (amount >> 16) as u8,              //  |
    (amount >>  8) as u8,              //  |
    amount         as u8,              // /
    (timestamp >> 56) as u8,           // \
    (timestamp >> 48) as u8,           //  |
    (timestamp >> 40) as u8,           //  | u64
    (timestamp >> 32) as u8,           //  | timestamp
    (timestamp >> 24) as u8,           //  |
    (timestamp >> 16) as u8,           //  |
    (timestamp >>  8) as u8,           //  |
    timestamp         as u8,           // /
]))
```

⚠️ The address bytes are currently represented as their string lengths (always `56` for G-addresses) rather than the actual address content. This creates a hash collision risk when only the amount or timestamp differs. See [Issue C-01](../GITHUB_ISSUES.md) for the fix.

The ID is returned as `BytesN<32>` from the contract and represented as a **64-character lowercase hex string** in the REST API.

---

## Directory Structure

```
receipta/
├── contract/                    # Rust / Soroban smart contract
│   ├── Cargo.toml               # soroban-sdk = "22.0.0"
│   └── src/
│       ├── lib.rs               # Contract impl + 13 unit tests
│       └── types.rs             # Receipt, ReceiptStatus, FeeConfig, DataKey, ReceiptError
│
├── backend/                     # Express / TypeScript REST API
│   ├── package.json
│   ├── tsconfig.json
│   ├── jest.config.js
│   └── src/
│       ├── app.ts               # Express app, middleware, route mounting
│       ├── middleware/
│       │   └── auth.ts          # JWT authenticateToken middleware
│       ├── routes/
│       │   ├── auth.ts          # POST /register, POST /login
│       │   ├── receipts.ts      # GET /receipts/:id
│       │   ├── payment-links.ts # POST /, GET /:id
│       │   └── merchant.ts      # GET /receipts, GET /stats
│       └── stellar/
│           └── client.ts        # StellarClient — Soroban RPC wrapper
│
├── frontend/                    # Next.js 14 App Router frontend
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   └── src/app/
│       ├── page.tsx             # / — landing page
│       ├── layout.tsx           # root layout
│       ├── globals.css          # Tailwind base styles
│       ├── register/page.tsx    # /register — merchant sign-up
│       ├── login/page.tsx       # /login — merchant login
│       ├── dashboard/page.tsx   # /dashboard — merchant stats + receipts
│       └── verify/page.tsx      # /verify — public receipt verification
│
└── docs/
    ├── API.md                   # REST API + contract function reference
    ├── ARCHITECTURE.md          # This file
    └── FEATURES.md              # Feature inventory and roadmap
```

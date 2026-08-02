# Receipta API Documentation

> **Docs:** [Overview](README.md) · [Architecture](ARCHITECTURE.md) · [Features & Roadmap](FEATURES.md) · [Quick Start](../QUICKSTART.md) · [Deployment](../DEPLOYMENT.md) · [Contributing](../CONTRIBUTING.md)

Complete reference for the Receipta REST API, Soroban smart contract interface, and on-chain data types.

---

## Table of Contents

1. [Overview](#overview)
2. [Base URL & Versioning](#base-url--versioning)
3. [Authentication](#authentication)
4. [Error Format](#error-format)
5. [REST API Endpoints](#rest-api-endpoints)
   - [Health](#health)
   - [Auth](#auth)
   - [Receipts](#receipts)
   - [Payment Links](#payment-links)
   - [Merchant](#merchant)
6. [Smart Contract Interface](#smart-contract-interface)
   - [Data Types](#data-types)
   - [Contract Functions](#contract-functions)
   - [Error Codes](#error-codes)
7. [Amount Conventions](#amount-conventions)
8. [Receipt ID Format](#receipt-id-format)

---

## Overview

Receipta is a blockchain-powered payment verification platform built on Stellar using Soroban smart contracts. It provides:

- **On-chain receipts**: tamper-proof payment records stored in Soroban persistent storage.
- **Public verification**: anyone can look up and verify a receipt by its ID — no account required.
- **Merchant dashboard**: authenticated merchants can create payment links and view their receipt history.

The system has two main interfaces:

| Interface | Purpose |
|-----------|---------|
| REST API (Express) | Merchant auth, receipt lookup via backend, payment link management |
| Soroban Contract | Canonical on-chain receipt creation, confirmation, and querying |

---

## Base URL & Versioning

```
Development:  http://localhost:3001
```

All REST endpoints are prefixed with `/api`. The contract is deployed on Stellar Testnet:

```
Contract ID:  CDLYITDQBWS7YWD5SGVXED4S4PCZEJJAOODOQ3OFSKJV5HX4ZLKKFWGC
Network:      Stellar Testnet
RPC URL:      https://soroban-testnet.stellar.org
```

---

## Authentication

Protected endpoints require a JSON Web Token (JWT) passed in the `Authorization` header:

```
Authorization: Bearer <token>
```

Tokens are issued by `POST /api/auth/register` and `POST /api/auth/login`. They expire after **7 days**.

Endpoints that do **not** require authentication:
- `GET /health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/receipts/:id`
- `GET /api/payment-links/:id`

---

## Error Format

All error responses use a consistent JSON envelope:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description of what went wrong.",
    "status": 400
  }
}
```

| HTTP Status | Meaning |
|-------------|---------|
| `400` | Bad request — missing or invalid fields |
| `401` | Unauthenticated — missing or invalid token |
| `403` | Forbidden — token present but rejected |
| `404` | Resource not found |
| `409` | Conflict — resource already exists |
| `410` | Gone — resource existed but has expired |
| `500` | Internal server error |

---

## REST API Endpoints

### Health

#### `GET /health`

Returns server status. Useful for uptime monitoring and load-balancer health checks.

**Authentication:** None

**Response `200`**

```json
{
  "status": "ok"
}
```

---

### Auth

#### `POST /api/auth/register`

Register a new merchant account.

**Authentication:** None

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | Merchant email address (used as login identifier) |
| `password` | string | Yes | Minimum 8 characters |
| `publicKey` | string | Yes | Stellar account public key (`G...`) for receiving payments |

```json
{
  "email": "merchant@example.com",
  "password": "securepassword123",
  "publicKey": "GABC...XYZ"
}
```

**Response `201`**

```json
{
  "merchant": {
    "id": "merchant_1748000000000",
    "email": "merchant@example.com",
    "publicKey": "GABC...XYZ"
  },
  "token": "<jwt>"
}
```

**Error Codes**

| Code | Status | Description |
|------|--------|-------------|
| `MISSING_FIELDS` | 400 | One or more required fields not provided |
| `EMAIL_EXISTS` | 409 | Email is already registered |
| `REGISTRATION_FAILED` | 500 | Unexpected server error |

---

#### `POST /api/auth/login`

Authenticate an existing merchant.

**Authentication:** None

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | Registered merchant email |
| `password` | string | Yes | Merchant password |

```json
{
  "email": "merchant@example.com",
  "password": "securepassword123"
}
```

**Response `200`**

```json
{
  "merchant": {
    "id": "merchant_1748000000000",
    "email": "merchant@example.com",
    "publicKey": "GABC...XYZ"
  },
  "token": "<jwt>"
}
```

**Error Codes**

| Code | Status | Description |
|------|--------|-------------|
| `MISSING_FIELDS` | 400 | Email or password not provided |
| `INVALID_CREDENTIALS` | 401 | Email not found or password incorrect |
| `LOGIN_FAILED` | 500 | Unexpected server error |

---

### Receipts

#### `GET /api/receipts/:id`

Look up a receipt by its ID. Fetches data directly from the Soroban contract via the `StellarClient`. This endpoint is public — no authentication required.

**Authentication:** None

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | 64-character hex-encoded receipt ID (SHA-256 hash) |

**Response `200`**

```json
{
  "receipt": {
    "receipt_id": "a3f1...c9e2",
    "sender": "GABC...SENDER",
    "receiver": "GXYZ...RECEIVER",
    "amount": "5000000",
    "token": "GDMX...TOKEN_CONTRACT",
    "timestamp": 1748000000,
    "status": "Confirmed",
    "fee_amount": "3750"
  }
}
```

**Receipt Fields**

| Field | Type | Description |
|-------|------|-------------|
| `receipt_id` | string | 64-char hex receipt ID |
| `sender` | string | Stellar address of payment sender |
| `receiver` | string | Stellar address of payment receiver |
| `amount` | string | Payment amount in stroops (1 XLM = 10,000,000 stroops) |
| `token` | string | Stellar asset contract address (SAC) |
| `timestamp` | number | Unix ledger timestamp at receipt creation |
| `status` | string | `"Pending"` \| `"Confirmed"` \| `"Failed"` |
| `fee_amount` | string | Platform fee collected in stroops (0 until confirmed) |

**Error Codes**

| Code | Status | Description |
|------|--------|-------------|
| `INVALID_RECEIPT_ID` | 400 | ID is not a 64-character hex string |
| `RECEIPT_NOT_FOUND` | 404 | No receipt found on-chain for this ID |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

### Payment Links

#### `POST /api/payment-links`

Create a shareable payment link. The generated URL points to `/pay/:id` on the frontend where customers can complete the payment.

**Authentication:** Required (JWT)

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | string | Yes | Payment amount (in the specified currency) |
| `currency` | string | Yes | Currency code, e.g. `"XLM"` or `"USDC"` |
| `receiverAddress` | string | Yes | Stellar address to receive the payment |
| `description` | string | No | Optional description shown to the payer |

```json
{
  "amount": "50",
  "currency": "XLM",
  "receiverAddress": "GXYZ...RECEIVER",
  "description": "Invoice #1042 - Web design services"
}
```

**Response `201`**

```json
{
  "paymentLink": {
    "id": "link_1748000000000_x7k9a2b",
    "merchantId": "merchant_1748000000000",
    "amount": "50",
    "currency": "XLM",
    "description": "Invoice #1042 - Web design services",
    "receiverAddress": "GXYZ...RECEIVER",
    "createdAt": 1748000000000,
    "expiresAt": 1748086400000,
    "url": "http://localhost:3000/pay/link_1748000000000_x7k9a2b"
  }
}
```

Payment links expire **24 hours** after creation.

**Error Codes**

| Code | Status | Description |
|------|--------|-------------|
| `MISSING_FIELDS` | 400 | `amount`, `currency`, or `receiverAddress` not provided |
| `MISSING_TOKEN` | 401 | No JWT provided |
| `INVALID_TOKEN` | 403 | JWT is invalid or expired |
| `LINK_CREATION_FAILED` | 500 | Unexpected server error |

---

#### `GET /api/payment-links/:id`

Retrieve payment link details. Used by the `/pay/:id` frontend page to display payment information to the payer.

**Authentication:** None

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Payment link ID (returned by `POST /api/payment-links`) |

**Response `200`**

```json
{
  "paymentLink": {
    "id": "link_1748000000000_x7k9a2b",
    "merchantId": "merchant_1748000000000",
    "amount": "50",
    "currency": "XLM",
    "description": "Invoice #1042 - Web design services",
    "receiverAddress": "GXYZ...RECEIVER",
    "createdAt": 1748000000000,
    "expiresAt": 1748086400000
  }
}
```

**Error Codes**

| Code | Status | Description |
|------|--------|-------------|
| `LINK_NOT_FOUND` | 404 | No link found for this ID |
| `LINK_EXPIRED` | 410 | Link was found but has passed its expiry time |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

### Merchant

All merchant endpoints require a valid JWT.

#### `GET /api/merchant/receipts`

Get all receipts associated with the authenticated merchant.

**Authentication:** Required (JWT)

**Response `200`**

```json
{
  "receipts": [
    {
      "id": "a3f1...c9e2",
      "amount": "5000000",
      "status": "Confirmed",
      "timestamp": 1748000000
    },
    {
      "id": "b7d2...e1f4",
      "amount": "1000000",
      "status": "Pending",
      "timestamp": 1748001000
    }
  ]
}
```

**Error Codes**

| Code | Status | Description |
|------|--------|-------------|
| `MISSING_TOKEN` | 401 | No JWT provided |
| `INVALID_TOKEN` | 403 | JWT is invalid or expired |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

#### `GET /api/merchant/stats`

Get aggregate statistics for the authenticated merchant.

**Authentication:** Required (JWT)

**Response `200`**

```json
{
  "stats": {
    "totalReceipts": 24,
    "confirmedReceipts": 20,
    "pendingReceipts": 3,
    "failedReceipts": 1,
    "totalVolume": "98750000"
  }
}
```

**Stats Fields**

| Field | Type | Description |
|-------|------|-------------|
| `totalReceipts` | number | All receipts ever created by this merchant |
| `confirmedReceipts` | number | Receipts with `status = "Confirmed"` |
| `pendingReceipts` | number | Receipts with `status = "Pending"` |
| `failedReceipts` | number | Receipts with `status = "Failed"` |
| `totalVolume` | string | Sum of confirmed receipt amounts in stroops |

**Error Codes**

| Code | Status | Description |
|------|--------|-------------|
| `MISSING_TOKEN` | 401 | No JWT provided |
| `INVALID_TOKEN` | 403 | JWT is invalid or expired |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Smart Contract Interface

The Receipta Soroban contract is the canonical source of truth for all receipt data. The REST API reads from the contract — it does not maintain its own copy of on-chain receipt state.

**Contract ID:** `CDLYITDQBWS7YWD5SGVXED4S4PCZEJJAOODOQ3OFSKJV5HX4ZLKKFWGC`  
**Network:** Stellar Testnet  
**Language:** Rust / Soroban SDK

---

### Data Types

#### `Receipt`

Stored in **persistent storage** keyed by `DataKey::Receipt(receipt_id)`.

| Field | Soroban Type | Description |
|-------|-------------|-------------|
| `receipt_id` | `BytesN<32>` | SHA-256 hash of `(sender, receiver, amount, timestamp)` |
| `sender` | `Address` | Stellar address initiating the payment |
| `receiver` | `Address` | Stellar address receiving the payment |
| `amount` | `i128` | Payment amount in stroops |
| `token` | `Address` | Stellar Asset Contract (SAC) address for the payment token |
| `timestamp` | `u64` | Ledger timestamp at the time of receipt creation |
| `status` | `ReceiptStatus` | Current lifecycle state of the receipt |
| `fee_amount` | `i128` | Platform fee in stroops (0 until confirmed) |

---

#### `ReceiptStatus`

```rust
pub enum ReceiptStatus {
    Pending,    // Receipt created, payment not yet confirmed
    Confirmed,  // Payment confirmed, fee calculated
    Failed,     // Payment marked as failed
}
```

Valid status transitions:

```
Pending → Confirmed  (via confirm_receipt)
Pending → Failed     (via fail_receipt)
```

Any other transition returns `InvalidStatusTransition`.

---

#### `FeeConfig`

Stored in **instance storage** keyed by `DataKey::FeeConfig`. Set once during `initialize` and updatable by the current `fee_address`.

| Field | Soroban Type | Description |
|-------|-------------|-------------|
| `fee_address` | `Address` | Platform wallet that receives collected fees |
| `fee_bps` | `u32` | Fee in basis points (e.g. `75` = 0.75%) |
| `min_fee` | `i128` | Minimum fee in stroops regardless of `fee_bps` calculation |

**Fee calculation:**

```
calculated_fee = (amount × fee_bps) / 10_000
fee_amount = max(calculated_fee, min_fee)
```

---

#### `DataKey`

Storage key enum used for both persistent and instance storage lookups.

| Variant | Storage | Maps to |
|---------|---------|---------|
| `Receipt(BytesN<32>)` | Persistent | A single `Receipt` struct |
| `ReceiverIndex(Address)` | Persistent | `Vec<BytesN<32>>` — list of receipt IDs for a receiver |
| `FeeConfig` | Instance | The `FeeConfig` singleton |

---

### Contract Functions

#### `initialize`

```rust
pub fn initialize(env: Env, fee_address: Address, fee_bps: u32, min_fee: i128)
```

Sets up the fee configuration. Must be called exactly once before any receipts can be created. Panics with `"Contract already initialized"` if called a second time. (A typed `AlreadyInitialized` error code is planned — see [C-05](../GITHUB_ISSUES.md).)

| Parameter | Type | Description |
|-----------|------|-------------|
| `fee_address` | `Address` | Platform wallet for fee collection |
| `fee_bps` | `u32` | Fee rate in basis points |
| `min_fee` | `i128` | Minimum fee floor in stroops |

**Example (Stellar CLI)**
```bash
stellar contract invoke \
  --id CDLYITDQBWS7YWD5SGVXED4S4PCZEJJAOODOQ3OFSKJV5HX4ZLKKFWGC \
  --network testnet \
  --source <YOUR_SECRET_KEY> \
  -- initialize \
  --fee_address <YOUR_PUBLIC_KEY> \
  --fee_bps 75 \
  --min_fee 10000
```

---

#### `create_receipt`

```rust
pub fn create_receipt(
    env: Env,
    sender: Address,
    receiver: Address,
    amount: i128,
    token: Address,
) -> Result<BytesN<32>, ReceiptError>
```

Creates a new receipt in `Pending` state. Requires authorization from `sender`. Returns the deterministic 32-byte receipt ID.

| Parameter | Type | Description |
|-----------|------|-------------|
| `sender` | `Address` | Address initiating the payment (must authorize) |
| `receiver` | `Address` | Address receiving the payment |
| `amount` | `i128` | Payment amount in stroops (must be > 0) |
| `token` | `Address` | SAC address of the payment token |

**Validations:**
- `amount` must be greater than 0 → `InvalidAmount`
- `sender` must not equal `receiver` → `SelfPayment`
- Receipt ID must not already exist → `DuplicateReceiptId`

**Returns:** `BytesN<32>` — the receipt ID on success.

**Side effects:** Appends the receipt ID to the `ReceiverIndex` for `receiver`.

---

#### `confirm_receipt`

```rust
pub fn confirm_receipt(env: Env, receipt_id: BytesN<32>) -> Result<(), ReceiptError>
```

Transitions a receipt from `Pending` to `Confirmed`. Requires authorization from the `receiver`. Calculates and stores the platform fee.

| Parameter | Type | Description |
|-----------|------|-------------|
| `receipt_id` | `BytesN<32>` | ID of the receipt to confirm |

**Validations:**
- Receipt must exist → `ReceiptNotFound`
- Receipt status must be `Pending` → `InvalidStatusTransition`
- Must be authorized by `receipt.receiver`

**Note (C-03):** Token transfers are not yet implemented. Fee amount is calculated and stored on the receipt but no funds are moved on-chain. See [GITHUB_ISSUES.md — C-03](../GITHUB_ISSUES.md) for the tracked issue.

---

#### `fail_receipt`

```rust
pub fn fail_receipt(env: Env, receipt_id: BytesN<32>) -> Result<(), ReceiptError>
```

Transitions a receipt from `Pending` to `Failed`. Either the sender or receiver can call this.

| Parameter | Type | Description |
|-----------|------|-------------|
| `receipt_id` | `BytesN<32>` | ID of the receipt to fail |

**Validations:**
- Receipt must exist → `ReceiptNotFound`
- Receipt status must be `Pending` → `InvalidStatusTransition`

**Note (C-02):** The current authorization check compares against `env.current_contract_address()` which will never match a user wallet. In practice, `receipt.sender.require_auth()` is always called, meaning the sender's signature is required. See [GITHUB_ISSUES.md — C-02](../GITHUB_ISSUES.md) for the tracked fix.

---

#### `get_receipt`

```rust
pub fn get_receipt(env: Env, receipt_id: BytesN<32>) -> Option<Receipt>
```

Returns the full `Receipt` struct for a given ID, or `None` if not found. Read-only, no authorization required.

---

#### `get_receipts_by_receiver`

```rust
pub fn get_receipts_by_receiver(env: Env, receiver: Address) -> Vec<BytesN<32>>
```

Returns all receipt IDs where the given address is the receiver. Returns an empty vector if none exist. Read-only, no authorization required.

---

#### `get_fee_config`

```rust
pub fn get_fee_config(env: Env) -> Option<FeeConfig>
```

Returns the current `FeeConfig`, or `None` if the contract has not been initialized yet. Read-only.

---

#### `update_fee_config`

```rust
pub fn update_fee_config(
    env: Env,
    new_fee_address: Address,
    new_fee_bps: u32,
    new_min_fee: i128,
) -> Result<(), ReceiptError>
```

Updates the fee configuration. Only the current `fee_address` can call this (requires authorization).

| Parameter | Type | Description |
|-----------|------|-------------|
| `new_fee_address` | `Address` | New platform wallet for fee collection |
| `new_fee_bps` | `u32` | New fee rate in basis points |
| `new_min_fee` | `i128` | New minimum fee in stroops |

**Validations:**
- Contract must be initialized → `Unauthorized`
- Must be authorized by the current `config.fee_address`

---

### Error Codes

Soroban contract errors are returned as typed `ReceiptError` values with the following numeric codes. Callers can match on these codes programmatically.

| Variant | Code | Trigger |
|---------|------|---------|
| `InvalidAmount` | 1 | `amount <= 0` passed to `create_receipt` |
| `InvalidAddress` | 2 | Reserved for address validation (not yet used) |
| `SelfPayment` | 3 | `sender == receiver` in `create_receipt` |
| `DuplicateReceiptId` | 4 | Generated receipt ID already exists in storage |
| `ReceiptNotFound` | 5 | `receipt_id` not found in persistent storage |
| `InvalidStatusTransition` | 6 | Attempting to confirm or fail a non-`Pending` receipt |
| `Unauthorized` | 7 | Caller is not authorized to perform the action |
| `FeeTransferFailed` | 8 | Token transfer for fees failed (reserved for token transfer implementation) |

---

## Amount Conventions

All amounts in the smart contract and API use **stroops**, the smallest unit of a Stellar asset.

```
1 XLM = 10,000,000 stroops
```

| Value | Stroops |
|-------|---------|
| 0.01 XLM | 100,000 |
| 1 XLM | 10,000,000 |
| 50 XLM | 500,000,000 |

When displaying amounts to users, divide stroops by `10_000_000` to get XLM. The `fee_amount` field on a `Receipt` also uses stroops.

---

## Receipt ID Format

Receipt IDs are deterministic 32-byte SHA-256 hashes of the transaction parameters, represented as **64-character lowercase hex strings** when passed to the REST API.

**Hash inputs (current implementation — 18 bytes total):**

| Byte(s) | Source |
|---------|--------|
| 1 | `sender.to_string().len() as u8` — always `56` for any G-address |
| 1 | `receiver.to_string().len() as u8` — always `56` for any G-address |
| 8 | Low 8 bytes of `amount` (`i128`, byte-shifted), big-endian |
| 8 | `timestamp` (`u64`), big-endian |

> ⚠️ **Known issue (C-01):** Because all Stellar G-addresses are 56 characters long, the sender and receiver bytes in the preimage are always `0x38, 0x38`. Two transactions with the same amount and timestamp but completely different sender/receiver pairs will produce the same receipt ID. Additionally, only the low 8 bytes of the `i128` amount are captured. See [GITHUB_ISSUES.md — C-01](../GITHUB_ISSUES.md) for the tracked fix. The intended fix will include the actual address bytes and all 16 bytes of the amount.

Because the ID is deterministic, any party who knows the sender, receiver, amount, and ledger timestamp can independently compute and verify the receipt ID without trusting the backend.

**Example receipt ID:**
```
a3f1c9e2b7d204f58a1e3c6d9b2f0e4a7c5d8f1b3e6a9c2d5f8b1e4a7d0c3f6
```

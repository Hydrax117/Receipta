# Receipta Documentation

Receipta is a blockchain-powered payment verification platform built on Stellar using Soroban smart contracts. It eliminates payment fraud by generating tamper-proof, cryptographically verifiable receipts for every transaction.

**Live contract:** [`CDLYITDQB...FWGC`](https://stellar.expert/explorer/testnet/contract/CDLYITDQBWS7YWD5SGVXED4S4PCZEJJAOODOQ3OFSKJV5HX4ZLKKFWGC) on Stellar Testnet

---

## Navigation

| Document | What's inside |
|----------|--------------|
| [Quick Start](../QUICKSTART.md) | Get the full stack running locally in 5 minutes |
| [Architecture](ARCHITECTURE.md) | System design, component responsibilities, data flow, and storage layout |
| [API Reference](API.md) | REST endpoints, request/response shapes, contract functions, and error codes |
| [Features & Roadmap](FEATURES.md) | Implemented features, known limitations, and planned work |
| [Deployment Guide](../DEPLOYMENT.md) | Deploy the contract and app to Stellar testnet or mainnet |
| [Contributing](../CONTRIBUTING.md) | Branch workflow, code style, commit conventions, and PR process |

---

## How It Works

```
Customer pays → Soroban contract stores a tamper-proof receipt on-chain
                         │
             Anyone can verify by receipt ID
                         │
              No account or trust required
```

The smart contract is the single source of truth. The backend is stateless with respect to receipt data — it reads from the chain. The frontend never touches the Stellar network directly (wallet integration is on the roadmap).

---

## Project Structure

```
receipta/
├── contract/        Rust / Soroban smart contract
├── backend/         Express / TypeScript REST API
├── frontend/        Next.js 14 web app
├── docs/            ← you are here
└── scripts/         Deployment and utility scripts
```

---

## Current Status

| Layer | Status |
|-------|--------|
| Smart contract | ✅ Deployed on Stellar Testnet |
| Backend API | ✅ All core routes implemented |
| Frontend | ✅ 5 pages live (landing, register, login, dashboard, verify) |
| Token transfers | ⚠️ Fee calculated but transfer not yet wired up |
| Wallet integration | 🔄 Planned — Freighter support coming |
| Production database | 🔄 In-memory stores, PostgreSQL migration planned |

See [Features & Roadmap](FEATURES.md) for the full list of known limitations and what's being worked on.

---

## Useful Links

- [Stellar Developer Docs](https://developers.stellar.org)
- [Soroban Documentation](https://soroban.stellar.org)
- [Contract on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CDLYITDQBWS7YWD5SGVXED4S4PCZEJJAOODOQ3OFSKJV5HX4ZLKKFWGC)
- [Stellar Testnet Friendbot](https://friendbot.stellar.org)
- [GitHub Repository](https://github.com/Receiptaa/Receipta)

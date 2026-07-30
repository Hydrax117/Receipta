# Receipta Quick Start Guide

Get Receipta running locally in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- Rust toolchain (for contract development)
- Git

## Quick Setup

### 1. Clone and Install

```bash
git clone https://github.com/your-org/receipta-platform.git
cd receipta-platform
npm install
```

### 2. Set Up Environment

```bash
cp .env.example .env
```

Edit `.env` with these minimal settings:
```env
# Backend
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
CONTRACT_ID=CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
JWT_SECRET=your-secret-key-min-32-chars
PORT=3001

# Frontend (create frontend/.env.local)
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. Start Backend

```bash
cd backend
npm install
npm run dev
```

Backend will start on http://localhost:3001

### 4. Start Frontend (New Terminal)

```bash
cd frontend
npm install
npm run dev
```

Frontend will start on http://localhost:3000

## Try It Out

### 1. Register a Merchant

1. Go to http://localhost:3000/register
2. Enter email, password, and a Stellar public key
3. Click "Register"

### 2. View Dashboard

After registration, you'll be redirected to the dashboard at http://localhost:3000/dashboard

### 3. Verify a Receipt

1. Go to http://localhost:3000/verify
2. Enter a 64-character receipt ID
3. View the verified receipt details

## Next Steps

### Deploy Smart Contract

To deploy your own contract to testnet:

```bash
cd contract

# Build
cargo build --target wasm32-unknown-unknown --release

# Deploy
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/receipta_contract.wasm \
  --network testnet \
  --source <YOUR_SECRET_KEY>

# Initialize
stellar contract invoke \
  --id <CONTRACT_ID> \
  --network testnet \
  --source <YOUR_SECRET_KEY> \
  -- initialize \
  --fee_address <YOUR_PUBLIC_KEY> \
  --fee_bps 75 \
  --min_fee 10000
```

Update your `.env` with the new CONTRACT_ID.

### Get Testnet XLM

1. Visit https://laboratory.stellar.org/#account-creator?network=test
2. Generate a keypair
3. Fund it with testnet XLM
4. Use the secret key for contract deployment

### Run Tests

```bash
# Contract tests
cd contract
cargo test

# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# All tests
npm test
```

## Common Issues

### "Contract not found"
- Ensure CONTRACT_ID in .env is correct
- Verify contract is deployed to testnet
- Check STELLAR_RPC_URL is accessible

### "Port already in use"
- Change PORT in .env to a different port
- Kill existing processes on ports 3000/3001

### "Module not found"
- Run `npm install` in root, backend, and frontend directories
- Delete node_modules and reinstall if issues persist

### Backend can't start
- Verify all environment variables are set
- Check Node.js version (must be 18+)
- Review error logs for specific issues

## Development Tips

### Hot Reload
Both backend and frontend support hot reload:
- Backend: Changes to .ts files auto-restart server
- Frontend: Changes to .tsx files auto-refresh browser

### Database
Current setup uses in-memory storage. For persistence:
1. Install PostgreSQL
2. Create database
3. Run migrations in `backend/migrations/`
4. Update DATABASE_URL in .env

### Debugging
- Backend logs: Check terminal running `npm run dev`
- Frontend logs: Check browser console
- Contract logs: Use `stellar contract invoke` with `--verbose`

## Resources

- [Full Documentation](README.md)
- [API Reference](docs/API.md)
- [Deployment Guide](DEPLOYMENT.md)
- [Stellar Documentation](https://developers.stellar.org)
- [Soroban Documentation](https://soroban.stellar.org)

## Getting Help

- Check [existing issues](https://github.com/your-org/receipta-platform/issues)
- Read [Contributing Guide](CONTRIBUTING.md)
- Join Stellar Discord for community support

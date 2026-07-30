# Receipta Deployment Guide

This guide walks you through deploying Receipta to Stellar testnet.

## Prerequisites

- Stellar CLI installed: `cargo install --locked stellar-cli --features opt`
- Funded Stellar testnet account (get XLM from [Stellar Laboratory](https://laboratory.stellar.org/#account-creator?network=test))
- Node.js 18+ and npm installed

## Step 1: Deploy Smart Contract

```bash
cd contract

# Build the contract
cargo build --target wasm32-unknown-unknown --release

# Deploy to testnet
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/receipta_contract.wasm \
  --network testnet \
  --source <YOUR_SECRET_KEY>
```

Save the contract ID that's returned - you'll need it for the backend.

## Step 2: Initialize Contract

```bash
# Initialize with fee configuration
stellar contract invoke \
  --id <CONTRACT_ID> \
  --network testnet \
  --source <YOUR_SECRET_KEY> \
  -- initialize \
  --fee_address <YOUR_PUBLIC_KEY> \
  --fee_bps 75 \
  --min_fee 10000
```

## Step 3: Configure Backend

```bash
cd ../backend

# Create .env file
cat > .env << EOF
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
CONTRACT_ID=<YOUR_CONTRACT_ID>
JWT_SECRET=$(openssl rand -hex 32)
PORT=3001
NODE_ENV=production
EOF

# Install dependencies
npm install

# Build
npm run build

# Start server
npm start
```

## Step 4: Configure Frontend

```bash
cd ../frontend

# Create .env.local file
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:3001
EOF

# Install dependencies
npm install

# Build
npm run build

# Start production server
npm start
```

## Step 5: Test the Deployment

1. Open http://localhost:3000
2. Register a merchant account
3. Create a payment link
4. Verify a receipt

## Testnet Resources

- **Stellar Laboratory**: https://laboratory.stellar.org
- **Testnet Friendbot**: https://friendbot.stellar.org
- **Soroban RPC**: https://soroban-testnet.stellar.org
- **Stellar Expert (Testnet)**: https://stellar.expert/explorer/testnet

## Production Deployment

For mainnet deployment:

1. Change `--network testnet` to `--network mainnet`
2. Update `STELLAR_RPC_URL` to mainnet RPC endpoint
3. Use production database instead of in-memory storage
4. Set up proper environment variables
5. Enable HTTPS
6. Configure CORS properly
7. Set up monitoring and logging

## Troubleshooting

### Contract deployment fails
- Ensure your account has enough XLM (at least 10 XLM for testnet)
- Verify Stellar CLI is properly installed
- Check network connectivity

### Backend can't connect to contract
- Verify CONTRACT_ID is correct
- Check STELLAR_RPC_URL is accessible
- Ensure contract is initialized

### Frontend can't reach backend
- Verify backend is running on correct port
- Check NEXT_PUBLIC_API_URL matches backend URL
- Ensure CORS is configured properly

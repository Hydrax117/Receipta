#!/bin/bash

# Receipta Deployment Script for WSL/Linux
# Run this after setting up WSL and installing dependencies

set -e

echo "🚀 Receipta Deployment Script (WSL/Linux)"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

# Check Rust
if command -v rustc &> /dev/null; then
    RUST_VERSION=$(rustc --version)
    echo -e "${GREEN}✅ Rust installed: $RUST_VERSION${NC}"
else
    echo -e "${RED}❌ Rust not found. Installing...${NC}"
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source $HOME/.cargo/env
fi

# Check Cargo
if command -v cargo &> /dev/null; then
    CARGO_VERSION=$(cargo --version)
    echo -e "${GREEN}✅ Cargo installed: $CARGO_VERSION${NC}"
else
    echo -e "${RED}❌ Cargo not found.${NC}"
    exit 1
fi

# Check Stellar CLI
if command -v stellar &> /dev/null; then
    STELLAR_VERSION=$(stellar --version)
    echo -e "${GREEN}✅ Stellar CLI installed: $STELLAR_VERSION${NC}"
else
    echo -e "${YELLOW}❌ Stellar CLI not found. Installing...${NC}"
    echo -e "${YELLOW}⏳ This will take 5-10 minutes...${NC}"
    cargo install --locked stellar-cli
fi

echo ""
echo -e "${YELLOW}📦 Step 1: Adding WebAssembly target...${NC}"
rustup target add wasm32-unknown-unknown

echo ""
echo -e "${YELLOW}🔑 Step 2: Setting up Stellar testnet account...${NC}"

# Check if deployer identity exists
if stellar keys ls 2>/dev/null | grep -q "deployer"; then
    echo -e "${GREEN}✅ Deployer identity already exists${NC}"
else
    echo "Creating new deployer identity..."
    stellar keys generate deployer --network testnet
    
    echo ""
    echo -e "${YELLOW}💰 Funding account with testnet XLM...${NC}"
    stellar keys fund deployer --network testnet
    
    sleep 3
fi

PUBLIC_KEY=$(stellar keys address deployer)
echo -e "${GREEN}✅ Deployer address: $PUBLIC_KEY${NC}"

echo ""
echo -e "${YELLOW}🔨 Step 3: Building smart contract...${NC}"
cd contract

# Use soroban contract build instead of cargo build
stellar contract build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Contract build failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Contract built successfully!${NC}"

echo ""
echo -e "${YELLOW}🚀 Step 4: Deploying contract to Stellar testnet...${NC}"

CONTRACT_ID=$(stellar contract deploy \
    --wasm target/wasm32-unknown-unknown/release/receipta_contract.wasm \
    --source deployer \
    --network testnet \
    --network-passphrase "Test SDF Network ; September 2015")

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Contract deployment failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Contract deployed!${NC}"
echo -e "${CYAN}📝 Contract ID: $CONTRACT_ID${NC}"

echo ""
echo -e "${YELLOW}⚙️  Step 5: Initializing contract...${NC}"

stellar contract invoke \
    --id $CONTRACT_ID \
    --source deployer \
    --network testnet \
    --network-passphrase "Test SDF Network ; September 2015" \
    -- initialize \
    --fee_address $PUBLIC_KEY \
    --fee_bps 75 \
    --min_fee 10000

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Contract initialization failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Contract initialized!${NC}"

cd ..

echo ""
echo -e "${YELLOW}📝 Step 6: Updating .env file...${NC}"

# Update .env file
if [ -f .env ]; then
    sed -i "s/CONTRACT_ID=.*/CONTRACT_ID=$CONTRACT_ID/" .env
    echo -e "${GREEN}✅ .env updated with CONTRACT_ID${NC}"
else
    echo -e "${YELLOW}⚠️  .env file not found. Please update manually.${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo "======================"
echo ""
echo -e "${CYAN}📋 Deployment Summary:${NC}"
echo "  Contract ID: $CONTRACT_ID"
echo "  Deployer Address: $PUBLIC_KEY"
echo "  Network: Testnet"
echo "  Fee: 0.75%, Min: 10000 stroops"
echo ""
echo -e "${CYAN}🔗 View on Stellar Expert:${NC}"
echo -e "${BLUE}  https://stellar.expert/explorer/testnet/contract/$CONTRACT_ID${NC}"
echo ""
echo -e "${YELLOW}📱 Next Steps:${NC}"
echo "  1. Open new terminal and run: cd backend && npm install && npm run dev"
echo "  2. Open another terminal and run: cd frontend && npm install && npm run dev"
echo "  3. Open browser: http://localhost:3000"
echo ""
echo -e "${CYAN}💡 Tip: You can run backend/frontend from Windows PowerShell${NC}"
echo ""

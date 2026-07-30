#!/bin/bash

# Receipta Demo Script
# This script demonstrates the core functionality of Receipta

set -e

echo "🚀 Receipta Demo Script"
echo "======================="
echo ""

# Check if contract is deployed
if [ -z "$CONTRACT_ID" ]; then
    echo "❌ CONTRACT_ID environment variable not set"
    echo "Please deploy the contract first and set CONTRACT_ID"
    exit 1
fi

if [ -z "$STELLAR_SECRET" ]; then
    echo "❌ STELLAR_SECRET environment variable not set"
    echo "Please set your Stellar secret key"
    exit 1
fi

echo "📝 Contract ID: $CONTRACT_ID"
echo ""

# Generate test addresses
SENDER=$(stellar keys generate sender --network testnet)
RECEIVER=$(stellar keys generate receiver --network testnet)
TOKEN=$(stellar keys generate token --network testnet)

echo "👤 Generated test addresses:"
echo "   Sender: $SENDER"
echo "   Receiver: $RECEIVER"
echo "   Token: $TOKEN"
echo ""

# Create a receipt
echo "📄 Creating receipt..."
RECEIPT_ID=$(stellar contract invoke \
  --id $CONTRACT_ID \
  --network testnet \
  --source $STELLAR_SECRET \
  -- create_receipt \
  --sender $SENDER \
  --receiver $RECEIVER \
  --amount 5000000 \
  --token $TOKEN)

echo "✅ Receipt created: $RECEIPT_ID"
echo ""

# Get receipt details
echo "🔍 Fetching receipt details..."
stellar contract invoke \
  --id $CONTRACT_ID \
  --network testnet \
  -- get_receipt \
  --receipt_id $RECEIPT_ID

echo ""

# Confirm receipt
echo "✅ Confirming receipt..."
stellar contract invoke \
  --id $CONTRACT_ID \
  --network testnet \
  --source $STELLAR_SECRET \
  -- confirm_receipt \
  --receipt_id $RECEIPT_ID

echo "✅ Receipt confirmed!"
echo ""

# Get updated receipt
echo "🔍 Fetching updated receipt..."
stellar contract invoke \
  --id $CONTRACT_ID \
  --network testnet \
  -- get_receipt \
  --receipt_id $RECEIPT_ID

echo ""
echo "🎉 Demo completed successfully!"
echo ""
echo "Next steps:"
echo "1. Visit http://localhost:3000/verify"
echo "2. Enter receipt ID: $RECEIPT_ID"
echo "3. View the verified receipt on-chain"

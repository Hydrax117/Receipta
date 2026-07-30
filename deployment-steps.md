# Receipta Deployment Checklist

## ✅ Step 1: Install Rust
- [ ] Download from https://rustup.rs/
- [ ] Run rustup-init.exe
- [ ] Choose default installation (option 1)
- [ ] Close and reopen terminal
- [ ] Verify: `rustc --version`
- [ ] Verify: `cargo --version`

## ⏳ Step 2: Add WebAssembly Target
```powershell
rustup target add wasm32-unknown-unknown
```

## ⏳ Step 3: Install Stellar CLI
```powershell
cargo install --locked stellar-cli --features opt
```
⚠️ This takes 5-10 minutes - be patient!

## ⏳ Step 4: Create Stellar Testnet Account
```powershell
# Generate keypair
stellar keys generate deployer --network testnet

# View your public key
stellar keys address deployer

# Fund with testnet XLM
stellar keys fund deployer --network testnet
```

## ⏳ Step 5: Build Smart Contract
```powershell
cd contract
cargo build --target wasm32-unknown-unknown --release
```

## ⏳ Step 6: Deploy Contract to Testnet
```powershell
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/receipta_contract.wasm \
  --source deployer \
  --network testnet
```
Save the CONTRACT_ID that's returned!

## ⏳ Step 7: Initialize Contract
```powershell
stellar contract invoke \
  --id <YOUR_CONTRACT_ID> \
  --source deployer \
  --network testnet \
  -- initialize \
  --fee_address $(stellar keys address deployer) \
  --fee_bps 75 \
  --min_fee 10000
```

## ⏳ Step 8: Update .env File
Update CONTRACT_ID in .env with your deployed contract address

## ⏳ Step 9: Start Backend
```powershell
cd backend
npm install
npm run dev
```

## ⏳ Step 10: Start Frontend
```powershell
cd frontend
npm install
npm run dev
```

## ⏳ Step 11: Test Application
- Open http://localhost:3000
- Register a merchant account
- Test the dashboard
- Verify a receipt

---

## Current Progress
Mark each step as you complete it!

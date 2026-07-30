# Windows Setup Guide for Receipta Deployment

## Step 1: Install Rust

1. Download Rust installer from: https://rustup.rs/
2. Run `rustup-init.exe`
3. Follow the prompts (choose default installation)
4. Restart your terminal after installation

Verify installation:
```powershell
rustc --version
cargo --version
```

## Step 2: Add WebAssembly Target

```powershell
rustup target add wasm32-unknown-unknown
```

## Step 3: Install Stellar CLI

```powershell
cargo install --locked stellar-cli --features opt
```

This will take 5-10 minutes. Verify installation:
```powershell
stellar --version
```

## Step 4: Create Stellar Testnet Account

### Option A: Using Stellar Laboratory (Recommended)
1. Go to: https://laboratory.stellar.org/#account-creator?network=test
2. Click "Generate keypair"
3. Save both keys securely:
   - **Public Key** (starts with G)
   - **Secret Key** (starts with S) - KEEP THIS PRIVATE!
4. Click "Fund account with Friendbot" to get testnet XLM

### Option B: Using Stellar CLI
```powershell
# Generate identity
stellar keys generate deployer --network testnet

# Get the public key
stellar keys address deployer

# Fund with testnet XLM
stellar keys fund deployer --network testnet
```

## Step 5: Verify Account Funding

Check your account balance:
```powershell
stellar keys address deployer
# Copy the address and check at: https://stellar.expert/explorer/testnet/account/YOUR_ADDRESS
```

You should see ~10,000 XLM in your testnet account.

## Next Steps

Once you have:
- ✅ Rust installed
- ✅ Stellar CLI installed
- ✅ Testnet account created and funded

You're ready to deploy! Continue with the deployment steps.

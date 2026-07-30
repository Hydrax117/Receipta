# Deploy Receipta using WSL (Windows Subsystem for Linux)

## Step 1: Install WSL

Run this command in PowerShell **as Administrator**:

```powershell
wsl --install
```

This will:
- Enable WSL feature
- Install Ubuntu (default Linux distribution)
- Download and set up Ubuntu

**After installation completes, restart your computer.**

## Step 2: Set Up Ubuntu

After restart:

1. **Open "Ubuntu" from Start menu** (or search for "Ubuntu")
2. **Wait for initial setup** (takes 1-2 minutes)
3. **Create a username** (e.g., your name in lowercase)
4. **Create a password** (you'll need this for sudo commands)

## Step 3: Update Ubuntu

In the Ubuntu terminal:

```bash
sudo apt update && sudo apt upgrade -y
```

## Step 4: Install Dependencies

```bash
# Install curl and build essentials
sudo apt install -y curl build-essential pkg-config libssl-dev

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installations
node --version
npm --version
```

## Step 5: Install Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

- Press **1** for default installation
- Wait for installation to complete

Then reload your shell:

```bash
source $HOME/.cargo/env
```

Verify:

```bash
rustc --version
cargo --version
```

## Step 6: Add WebAssembly Target

```bash
rustup target add wasm32-unknown-unknown
```

## Step 7: Install Stellar CLI

```bash
cargo install --locked stellar-cli --features opt
```

⏳ This takes 5-10 minutes. Be patient!

## Step 8: Access Your Project in WSL

Your Windows files are accessible at `/mnt/c/`:

```bash
cd /mnt/c/Users/Pk/Desktop/Receipta
```

## Step 9: Deploy Contract

```bash
# Create Stellar testnet account
stellar keys generate deployer --network testnet

# View your public key
stellar keys address deployer

# Fund with testnet XLM
stellar keys fund deployer --network testnet

# Build contract
cd contract
cargo build --target wasm32-unknown-unknown --release

# Deploy to testnet
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/receipta_contract.wasm \
  --source deployer \
  --network testnet

# Save the CONTRACT_ID that's returned!
```

## Step 10: Initialize Contract

```bash
# Replace <CONTRACT_ID> with your actual contract ID
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source deployer \
  --network testnet \
  -- initialize \
  --fee_address $(stellar keys address deployer) \
  --fee_bps 75 \
  --min_fee 10000
```

## Step 11: Update .env File

Back in Windows, update your `.env` file with the CONTRACT_ID.

Or from WSL:

```bash
cd /mnt/c/Users/Pk/Desktop/Receipta
nano .env
# Update CONTRACT_ID line
# Press Ctrl+X, then Y, then Enter to save
```

## Step 12: Run Backend and Frontend

You can run these from Windows PowerShell:

**Terminal 1 (Backend):**
```powershell
cd C:\Users\Pk\Desktop\Receipta\backend
npm install
npm run dev
```

**Terminal 2 (Frontend):**
```powershell
cd C:\Users\Pk\Desktop\Receipta\frontend
npm install
npm run dev
```

**Open browser:** http://localhost:3000

## Tips

### Access WSL files from Windows
- Open File Explorer
- Type in address bar: `\\wsl$\Ubuntu\home\<your-username>`

### Access Windows files from WSL
- All Windows drives are at `/mnt/`
- C: drive is at `/mnt/c/`

### Copy files between WSL and Windows
```bash
# Copy from Windows to WSL
cp /mnt/c/Users/Pk/Desktop/file.txt ~/

# Copy from WSL to Windows
cp ~/file.txt /mnt/c/Users/Pk/Desktop/
```

## Troubleshooting

### "wsl --install" doesn't work
- Make sure you're running PowerShell **as Administrator**
- Right-click PowerShell → "Run as Administrator"

### Ubuntu doesn't appear after restart
- Search for "Ubuntu" in Start menu
- Or run `wsl` in PowerShell

### Can't access Windows files
- Make sure you're using `/mnt/c/` not `C:\`
- Check path: `ls /mnt/c/Users/Pk/Desktop/`

### Stellar CLI installation fails
- Make sure you ran `source $HOME/.cargo/env`
- Try closing and reopening Ubuntu terminal

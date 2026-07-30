# Receipta Deployment Script for Windows
# Run this after installing Rust and Stellar CLI

Write-Host "🚀 Receipta Deployment Script" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "📋 Checking prerequisites..." -ForegroundColor Yellow

# Check Rust
try {
    $rustVersion = rustc --version
    Write-Host "✅ Rust installed: $rustVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Rust not found. Please install from https://rustup.rs/" -ForegroundColor Red
    exit 1
}

# Check Cargo
try {
    $cargoVersion = cargo --version
    Write-Host "✅ Cargo installed: $cargoVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Cargo not found." -ForegroundColor Red
    exit 1
}

# Check Stellar CLI
try {
    $stellarVersion = stellar --version
    Write-Host "✅ Stellar CLI installed: $stellarVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Stellar CLI not found. Installing..." -ForegroundColor Yellow
    Write-Host "⏳ This will take 5-10 minutes..." -ForegroundColor Yellow
    cargo install --locked stellar-cli
}

Write-Host ""
Write-Host "📦 Step 1: Adding WebAssembly target..." -ForegroundColor Yellow
rustup target add wasm32-unknown-unknown

Write-Host ""
Write-Host "🔑 Step 2: Setting up Stellar testnet account..." -ForegroundColor Yellow

# Check if deployer identity exists
$identityExists = stellar keys ls 2>&1 | Select-String "deployer"

if (-not $identityExists) {
    Write-Host "Creating new deployer identity..." -ForegroundColor Yellow
    stellar keys generate deployer --network testnet
    
    Write-Host ""
    Write-Host "💰 Funding account with testnet XLM..." -ForegroundColor Yellow
    stellar keys fund deployer --network testnet
    
    Start-Sleep -Seconds 3
}

$publicKey = stellar keys address deployer
Write-Host "✅ Deployer address: $publicKey" -ForegroundColor Green

Write-Host ""
Write-Host "🔨 Step 3: Building smart contract..." -ForegroundColor Yellow
Set-Location contract
cargo build --target wasm32-unknown-unknown --release

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Contract build failed!" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Write-Host "✅ Contract built successfully!" -ForegroundColor Green

Write-Host ""
Write-Host "🚀 Step 4: Deploying contract to Stellar testnet..." -ForegroundColor Yellow

$contractId = stellar contract deploy `
    --wasm target/wasm32-unknown-unknown/release/receipta_contract.wasm `
    --source deployer `
    --network testnet

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Contract deployment failed!" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Write-Host "✅ Contract deployed!" -ForegroundColor Green
Write-Host "📝 Contract ID: $contractId" -ForegroundColor Cyan

Write-Host ""
Write-Host "⚙️  Step 5: Initializing contract..." -ForegroundColor Yellow

stellar contract invoke `
    --id $contractId `
    --source deployer `
    --network testnet `
    -- initialize `
    --fee_address $publicKey `
    --fee_bps 75 `
    --min_fee 10000

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Contract initialization failed!" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Write-Host "✅ Contract initialized!" -ForegroundColor Green

Set-Location ..

Write-Host ""
Write-Host "📝 Step 6: Updating .env file..." -ForegroundColor Yellow

# Update .env file
$envContent = Get-Content .env -Raw
$envContent = $envContent -replace 'CONTRACT_ID=.*', "CONTRACT_ID=$contractId"
$envContent | Set-Content .env

Write-Host "✅ .env updated with CONTRACT_ID" -ForegroundColor Green

Write-Host ""
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "======================" -ForegroundColor Green
Write-Host ""
Write-Host "Deployment Summary:" -ForegroundColor Cyan
Write-Host "  Contract ID: $contractId" -ForegroundColor White
Write-Host "  Deployer Address: $publicKey" -ForegroundColor White
Write-Host "  Network: Testnet" -ForegroundColor White
Write-Host "  Fee: 0.75 percent, Min: 10000 stroops" -ForegroundColor White
Write-Host ""
Write-Host "View on Stellar Expert:" -ForegroundColor Cyan
Write-Host "  https://stellar.expert/explorer/testnet/contract/$contractId" -ForegroundColor Blue
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Start backend in new terminal" -ForegroundColor White
Write-Host "  2. Start frontend in another terminal" -ForegroundColor White
Write-Host "  3. Open http://localhost:3000" -ForegroundColor White
Write-Host ""

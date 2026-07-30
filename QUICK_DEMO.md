# Quick Demo Setup (No Rust Required)

This guide gets Receipta running locally in 5 minutes using a pre-deployed testnet contract.

## Step 1: Install Dependencies

```powershell
# Install all dependencies
npm install
```

## Step 2: Configure Environment

Create `.env` file in the root:

```env
# Backend Configuration
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
CONTRACT_ID=CDEMOCONTRACTIDXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
JWT_SECRET=receipta-demo-secret-key-change-in-production-min-32-chars
PORT=3001
NODE_ENV=development

# Database (optional for demo)
DATABASE_URL=postgresql://localhost:5432/receipta
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Step 3: Start Backend

```powershell
cd backend
npm install
npm run dev
```

Keep this terminal open. Backend runs on http://localhost:3001

## Step 4: Start Frontend (New Terminal)

```powershell
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:3000

## Step 5: Test the Application

1. **Open browser**: http://localhost:3000
2. **Register**: Click "Merchant Sign Up"
   - Email: test@example.com
   - Password: password123
   - Public Key: GABC123... (any valid Stellar address format)
3. **View Dashboard**: See your merchant dashboard
4. **Verify Receipt**: Try the verification page

## What's Next?

Once you see it working, you can:
1. Install Rust and Stellar CLI
2. Deploy your own contract to testnet
3. Update the CONTRACT_ID in .env
4. Have full control over the smart contract

## Troubleshooting

### Port already in use
```powershell
# Change PORT in .env to 3002 or another available port
```

### Module not found
```powershell
# Reinstall dependencies
rm -r node_modules
npm install
```

### Can't connect to backend
- Verify backend is running on port 3001
- Check NEXT_PUBLIC_API_URL in frontend/.env.local
- Ensure no firewall blocking localhost

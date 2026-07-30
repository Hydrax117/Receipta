# Makefile Usage Guide

This project includes two Makefiles for easy automation:
- `Makefile` - For Linux/macOS/WSL
- `Makefile.ps1` - For Windows PowerShell

## 🚀 Quick Start

### On Linux/macOS/WSL:
```bash
# See all commands
make help

# Install everything
make install

# Start development
make dev
```

### On Windows PowerShell:
```powershell
# See all commands
.\Makefile.ps1 help

# Install everything
.\Makefile.ps1 install

# Start backend
.\Makefile.ps1 dev-backend

# Start frontend (in another terminal)
.\Makefile.ps1 dev-frontend
```

---

## 📋 Common Commands

### Installation

**Install all dependencies:**
```bash
# Linux/macOS/WSL
make install

# Windows
.\Makefile.ps1 install
```

**Install specific component:**
```bash
# Linux/macOS/WSL
make install-backend
make install-frontend

# Windows
.\Makefile.ps1 install-backend
.\Makefile.ps1 install-frontend
```

### Development

**Start development servers:**
```bash
# Linux/macOS/WSL (starts both)
make dev

# Windows (run in separate terminals)
.\Makefile.ps1 dev-backend    # Terminal 1
.\Makefile.ps1 dev-frontend   # Terminal 2
```

**Start individual servers:**
```bash
# Linux/macOS/WSL
make dev-backend
make dev-frontend

# Windows
.\Makefile.ps1 dev-backend
.\Makefile.ps1 dev-frontend
```

### Building

**Build everything:**
```bash
# Linux/macOS/WSL
make build

# Windows
.\Makefile.ps1 build
```

**Build specific component:**
```bash
# Linux/macOS/WSL
make build-contract
make build-backend
make build-frontend

# Windows
.\Makefile.ps1 build-backend
.\Makefile.ps1 build-frontend
```

### Testing

**Run all tests:**
```bash
# Linux/macOS/WSL
make test

# Windows
.\Makefile.ps1 test
```

**Run specific tests:**
```bash
# Linux/macOS/WSL
make test-contract
make test-backend
make test-frontend

# Windows
.\Makefile.ps1 test-backend
.\Makefile.ps1 test-frontend
```

### Deployment

**Deploy to testnet:**
```bash
# Linux/macOS/WSL only
make deploy-testnet

# Windows - use WSL or run manually:
wsl ./deploy-wsl.sh
```

### Utilities

**Clean build artifacts:**
```bash
# Linux/macOS/WSL
make clean

# Windows
.\Makefile.ps1 clean
```

**Check project status:**
```bash
# Linux/macOS/WSL
make status

# Windows
.\Makefile.ps1 status
```

**Setup environment:**
```bash
# Linux/macOS/WSL
make setup-env

# Windows
.\Makefile.ps1 setup-env
```

**Format code:**
```bash
# Linux/macOS/WSL only
make format
```

**Lint code:**
```bash
# Linux/macOS/WSL only
make lint
```

---

## 🎯 Common Workflows

### First Time Setup

**Linux/macOS/WSL:**
```bash
# 1. Clone repository
git clone https://github.com/your-org/receipta-platform.git
cd receipta-platform

# 2. Setup environment
make setup-env
# Edit .env with your values

# 3. Install and build
make install
make build

# 4. Start development
make dev
```

**Windows:**
```powershell
# 1. Clone repository
git clone https://github.com/your-org/receipta-platform.git
cd receipta-platform

# 2. Setup environment
.\Makefile.ps1 setup-env
# Edit .env with your values

# 3. Install and build
.\Makefile.ps1 install
.\Makefile.ps1 build

# 4. Start development (two terminals)
.\Makefile.ps1 dev-backend    # Terminal 1
.\Makefile.ps1 dev-frontend   # Terminal 2
```

### Daily Development

**Linux/macOS/WSL:**
```bash
# Start working
make dev

# Run tests before committing
make test

# Format and lint
make format
make lint
```

**Windows:**
```powershell
# Start working (two terminals)
.\Makefile.ps1 dev-backend    # Terminal 1
.\Makefile.ps1 dev-frontend   # Terminal 2

# Run tests before committing
.\Makefile.ps1 test
```

### Before Committing

**Linux/macOS/WSL:**
```bash
# Run all checks
make check

# Or individually
make format
make lint
make test
```

**Windows:**
```powershell
# Run tests
.\Makefile.ps1 test

# Check status
.\Makefile.ps1 status
```

### Deployment

**Linux/macOS/WSL:**
```bash
# Build contract
make build-contract

# Deploy to testnet
make deploy-testnet

# Verify deployment
make verify
```

**Windows (use WSL):**
```powershell
# Switch to WSL
wsl

# Deploy
make deploy-testnet

# Or run script directly
./deploy-wsl.sh
```

### Cleaning Up

**Linux/macOS/WSL:**
```bash
# Clean everything
make clean

# Reinstall
make install
```

**Windows:**
```powershell
# Clean everything
.\Makefile.ps1 clean

# Reinstall
.\Makefile.ps1 install
```

---

## 🔧 Advanced Usage

### Running Multiple Commands

**Linux/macOS/WSL:**
```bash
# Install and build in one go
make install build

# Format, lint, and test
make format lint test

# Or use the check command
make check
```

### Custom Targets

**Linux/macOS/WSL:**
```bash
# Quick start for new developers
make onboard

# Check project status
make status

# View documentation
make docs
```

**Windows:**
```powershell
# Quick start for new developers
.\Makefile.ps1 onboard

# Check project status
.\Makefile.ps1 status
```

---

## 📝 Makefile Customization

### Adding New Commands

**Linux/macOS (Makefile):**
```makefile
# Add to Makefile
my-command:
	@echo "Running my command..."
	# Your commands here
```

**Windows (Makefile.ps1):**
```powershell
# Add to Makefile.ps1
function My-Command {
    Write-Host "Running my command..." -ForegroundColor Cyan
    # Your commands here
}

# Add to switch statement
"my-command" { My-Command }
```

---

## 🐛 Troubleshooting

### "make: command not found"

**Solution:** Install make or use Windows PowerShell version
```bash
# Ubuntu/Debian
sudo apt install make

# macOS
brew install make

# Windows - use Makefile.ps1 instead
.\Makefile.ps1 help
```

### "Permission denied"

**Solution:** Make scripts executable
```bash
chmod +x Makefile
chmod +x deploy-wsl.sh
```

### "npm: command not found"

**Solution:** Install Node.js
```bash
# Check if installed
node --version
npm --version

# If not, install from nodejs.org
```

### Commands not working on Windows

**Solution:** Use the PowerShell version
```powershell
# Instead of: make install
# Use:
.\Makefile.ps1 install
```

---

## 💡 Tips & Tricks

### 1. Use Tab Completion
```bash
# Type 'make ' and press Tab to see available commands
make <Tab>
```

### 2. Run in Background
```bash
# Linux/macOS/WSL
make dev-backend &
make dev-frontend &
```

### 3. Check What a Command Does
```bash
# Linux/macOS/WSL
make -n build  # Shows commands without running
```

### 4. Parallel Execution
```bash
# Linux/macOS/WSL
make -j4 test  # Run tests in parallel
```

### 5. Create Aliases
```bash
# Add to ~/.bashrc or ~/.zshrc
alias dev='make dev'
alias test='make test'
alias build='make build'
```

---

## 📊 Command Reference

| Task | Linux/macOS/WSL | Windows |
|------|----------------|---------|
| Help | `make help` | `.\Makefile.ps1 help` |
| Install | `make install` | `.\Makefile.ps1 install` |
| Dev Backend | `make dev-backend` | `.\Makefile.ps1 dev-backend` |
| Dev Frontend | `make dev-frontend` | `.\Makefile.ps1 dev-frontend` |
| Build | `make build` | `.\Makefile.ps1 build` |
| Test | `make test` | `.\Makefile.ps1 test` |
| Clean | `make clean` | `.\Makefile.ps1 clean` |
| Status | `make status` | `.\Makefile.ps1 status` |
| Deploy | `make deploy-testnet` | Use WSL |

---

## 🎯 Quick Reference

**Most Used Commands:**

```bash
# Setup (once)
make install

# Daily development
make dev

# Before committing
make test

# Deployment
make deploy-testnet
```

**Windows Quick Reference:**

```powershell
# Setup (once)
.\Makefile.ps1 install

# Daily development (two terminals)
.\Makefile.ps1 dev-backend
.\Makefile.ps1 dev-frontend

# Before committing
.\Makefile.ps1 test
```

---

## ✅ Your Receipta Project

**Recommended workflow:**

1. **First time:**
   ```bash
   make onboard  # or .\Makefile.ps1 onboard
   ```

2. **Daily development:**
   ```bash
   make dev  # or .\Makefile.ps1 dev-backend + dev-frontend
   ```

3. **Before committing:**
   ```bash
   make test  # or .\Makefile.ps1 test
   ```

4. **Deployment:**
   ```bash
   make deploy-testnet  # or use WSL
   ```

---

**You now have powerful automation for your project!** 🚀

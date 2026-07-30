.PHONY: help install build test deploy clean dev start stop

# Default target
help:
	@echo "Receipta - Makefile Commands"
	@echo "=============================="
	@echo ""
	@echo "Setup & Installation:"
	@echo "  make install          - Install all dependencies"
	@echo "  make install-contract - Install Rust dependencies"
	@echo "  make install-backend  - Install backend dependencies"
	@echo "  make install-frontend - Install frontend dependencies"
	@echo ""
	@echo "Development:"
	@echo "  make dev              - Start backend and frontend in dev mode"
	@echo "  make dev-backend      - Start backend only"
	@echo "  make dev-frontend     - Start frontend only"
	@echo ""
	@echo "Building:"
	@echo "  make build            - Build all components"
	@echo "  make build-contract   - Build smart contract"
	@echo "  make build-backend    - Build backend"
	@echo "  make build-frontend   - Build frontend"
	@echo ""
	@echo "Testing:"
	@echo "  make test             - Run all tests"
	@echo "  make test-contract    - Run contract tests"
	@echo "  make test-backend     - Run backend tests"
	@echo "  make test-frontend    - Run frontend tests"
	@echo ""
	@echo "Deployment:"
	@echo "  make deploy           - Deploy contract to testnet"
	@echo "  make deploy-testnet   - Deploy to Stellar testnet"
	@echo "  make verify           - Verify deployment"
	@echo ""
	@echo "Utilities:"
	@echo "  make clean            - Clean build artifacts"
	@echo "  make format           - Format code"
	@echo "  make lint             - Lint code"
	@echo "  make check            - Run all checks (format, lint, test)"
	@echo ""

# Installation
install: install-contract install-backend install-frontend
	@echo "✅ All dependencies installed!"

install-contract:
	@echo "📦 Installing Rust dependencies..."
	cd contract && cargo fetch

install-backend:
	@echo "📦 Installing backend dependencies..."
	cd backend && npm install

install-frontend:
	@echo "📦 Installing frontend dependencies..."
	cd frontend && npm install

# Development
dev:
	@echo "🚀 Starting development servers..."
	@echo "Backend: http://localhost:3001"
	@echo "Frontend: http://localhost:3000"
	@make -j2 dev-backend dev-frontend

dev-backend:
	@echo "🔧 Starting backend..."
	cd backend && npm run dev

dev-frontend:
	@echo "🎨 Starting frontend..."
	cd frontend && npm run dev

# Building
build: build-contract build-backend build-frontend
	@echo "✅ All components built!"

build-contract:
	@echo "🔨 Building smart contract..."
	cd contract && cargo build --target wasm32-unknown-unknown --release
	@echo "✅ Contract built!"

build-backend:
	@echo "🔨 Building backend..."
	cd backend && npm run build
	@echo "✅ Backend built!"

build-frontend:
	@echo "🔨 Building frontend..."
	cd frontend && npm run build
	@echo "✅ Frontend built!"

# Testing
test: test-contract test-backend test-frontend
	@echo "✅ All tests passed!"

test-contract:
	@echo "🧪 Running contract tests..."
	cd contract && cargo test

test-backend:
	@echo "🧪 Running backend tests..."
	cd backend && npm test

test-frontend:
	@echo "🧪 Running frontend tests..."
	cd frontend && npm test

# Deployment
deploy: deploy-testnet

deploy-testnet:
	@echo "🚀 Deploying to Stellar testnet..."
	@if [ -f deploy-wsl.sh ]; then \
		chmod +x deploy-wsl.sh && ./deploy-wsl.sh; \
	else \
		echo "❌ deploy-wsl.sh not found!"; \
		exit 1; \
	fi

verify:
	@echo "🔍 Verifying deployment..."
	@if [ -z "$(CONTRACT_ID)" ]; then \
		echo "❌ CONTRACT_ID not set in .env"; \
		exit 1; \
	fi
	@echo "Contract ID: $(CONTRACT_ID)"
	@echo "View on Stellar Expert:"
	@echo "https://stellar.expert/explorer/testnet/contract/$(CONTRACT_ID)"

# Utilities
clean:
	@echo "🧹 Cleaning build artifacts..."
	rm -rf contract/target
	rm -rf backend/dist
	rm -rf backend/node_modules
	rm -rf frontend/.next
	rm -rf frontend/node_modules
	rm -rf node_modules
	@echo "✅ Cleaned!"

format:
	@echo "✨ Formatting code..."
	cd contract && cargo fmt
	cd backend && npm run format || echo "No format script"
	cd frontend && npm run format || echo "No format script"
	@echo "✅ Code formatted!"

lint:
	@echo "🔍 Linting code..."
	cd contract && cargo clippy
	cd backend && npm run lint || echo "No lint script"
	cd frontend && npm run lint || echo "No lint script"
	@echo "✅ Linting complete!"

check: format lint test
	@echo "✅ All checks passed!"

# Contract specific
contract-optimize:
	@echo "⚡ Optimizing contract..."
	cd contract && stellar contract optimize \
		--wasm target/wasm32-unknown-unknown/release/receipta_contract.wasm

contract-deploy:
	@echo "🚀 Deploying contract..."
	cd contract && stellar contract deploy \
		--wasm target/wasm32-unknown-unknown/release/receipta_contract.optimized.wasm \
		--source deployer \
		--network testnet \
		--network-passphrase "Test SDF Network ; September 2015"

# Quick commands
quick-start: install build
	@echo "✅ Project ready! Run 'make dev' to start development."

status:
	@echo "📊 Project Status"
	@echo "================="
	@echo ""
	@echo "Contract:"
	@if [ -f contract/target/wasm32-unknown-unknown/release/receipta_contract.wasm ]; then \
		echo "  ✅ Built"; \
	else \
		echo "  ❌ Not built"; \
	fi
	@echo ""
	@echo "Backend:"
	@if [ -d backend/node_modules ]; then \
		echo "  ✅ Dependencies installed"; \
	else \
		echo "  ❌ Dependencies not installed"; \
	fi
	@echo ""
	@echo "Frontend:"
	@if [ -d frontend/node_modules ]; then \
		echo "  ✅ Dependencies installed"; \
	else \
		echo "  ❌ Dependencies not installed"; \
	fi
	@echo ""
	@if [ -f .env ]; then \
		echo "Environment: ✅ .env exists"; \
	else \
		echo "Environment: ❌ .env missing"; \
	fi

# Documentation
docs:
	@echo "📚 Opening documentation..."
	@echo ""
	@echo "Available docs:"
	@echo "  - README.md"
	@echo "  - QUICKSTART.md"
	@echo "  - DEPLOYMENT.md"
	@echo "  - docs/API.md"
	@echo "  - docs/FEATURES.md"
	@echo ""

# Git helpers
commit:
	@echo "📝 Preparing commit..."
	git status
	@echo ""
	@echo "Run: git add . && git commit -m 'your message'"

push:
	@echo "🚀 Pushing to remote..."
	git push origin main

# Environment setup
setup-env:
	@if [ ! -f .env ]; then \
		echo "📝 Creating .env from .env.example..."; \
		cp .env.example .env; \
		echo "✅ .env created! Please update with your values."; \
	else \
		echo "✅ .env already exists"; \
	fi

# Full setup for new developers
onboard: setup-env install build
	@echo ""
	@echo "🎉 Onboarding complete!"
	@echo ""
	@echo "Next steps:"
	@echo "  1. Update .env with your configuration"
	@echo "  2. Run 'make dev' to start development"
	@echo "  3. Open http://localhost:3000"
	@echo ""

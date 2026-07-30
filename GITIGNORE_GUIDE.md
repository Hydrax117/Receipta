# .gitignore Guide for Stellar Projects

## ✅ What MUST Be Ignored

### 1. **Environment Variables & Secrets** (CRITICAL!)
```gitignore
.env
.env.local
.env.*.local
*.pem
*.key
*.secret
secrets/
.secrets/
```

**Why:** Contains sensitive data like:
- Database passwords
- API keys
- JWT secrets
- Private keys
- Stellar secret keys

**⚠️ NEVER commit:**
- `.env` files with real credentials
- Private keys
- Secret keys
- API tokens

**✅ DO commit:**
- `.env.example` (template with placeholder values)

### 2. **Dependencies**
```gitignore
node_modules/
jspm_packages/
```

**Why:** 
- Large files (100MB+)
- Can be reinstalled with `npm install`
- Different per environment

### 3. **Build Artifacts**
```gitignore
# Rust/Cargo
contract/target/
**/target/
Cargo.lock

# WASM files
*.wasm
*.optimized.wasm

# Next.js
.next/
out/

# TypeScript
dist/
build/
*.tsbuildinfo
```

**Why:**
- Generated from source code
- Large files
- Can be rebuilt
- Different per environment

### 4. **IDE & Editor Files**
```gitignore
.vscode/
.idea/
*.sublime-*
.kiro/
*.swp
*.swo
*~
```

**Why:**
- Personal preferences
- Different per developer
- Not part of the project

### 5. **OS Files**
```gitignore
.DS_Store      # macOS
Thumbs.db      # Windows
desktop.ini    # Windows
```

**Why:**
- Operating system specific
- Not part of the project
- Clutters repository

### 6. **Logs & Temporary Files**
```gitignore
logs/
*.log
npm-debug.log*
*.tmp
*.temp
tmp/
temp/
```

**Why:**
- Generated during runtime
- Can be large
- Not needed in repository

### 7. **Test Coverage & Reports**
```gitignore
coverage/
.nyc_output/
*.lcov
```

**Why:**
- Generated from tests
- Can be regenerated
- Large files

### 8. **Database Files**
```gitignore
*.db
*.sqlite
*.sqlite3
```

**Why:**
- Local development data
- Can be large
- Different per developer

---

## ❌ What Should NOT Be Ignored

### 1. **Source Code** ✅
```
✅ contract/src/
✅ backend/src/
✅ frontend/src/
✅ *.rs
✅ *.ts
✅ *.tsx
✅ *.js
✅ *.jsx
```

**Why:** This is your actual code!

### 2. **Configuration Files** ✅
```
✅ package.json
✅ Cargo.toml
✅ tsconfig.json
✅ next.config.js
✅ tailwind.config.js
✅ .eslintrc
✅ .prettierrc
```

**Why:** Needed to build and run the project

### 3. **Documentation** ✅
```
✅ README.md
✅ DEPLOYMENT.md
✅ CONTRIBUTING.md
✅ docs/
✅ *.md (except personal notes)
```

**Why:** Essential for understanding the project

### 4. **Example/Template Files** ✅
```
✅ .env.example
✅ config.example.json
```

**Why:** Shows what configuration is needed

### 5. **CI/CD Configuration** ✅
```
✅ .github/workflows/
✅ .gitlab-ci.yml
✅ Dockerfile
```

**Why:** Needed for automated builds and deployments

### 6. **Tests** ✅
```
✅ **/*.test.ts
✅ **/*.spec.ts
✅ tests/
```

**Why:** Part of the codebase

### 7. **Public Assets** ✅
```
✅ public/
✅ static/
✅ assets/
✅ images/
```

**Why:** Part of the application

### 8. **Scripts** ✅
```
✅ scripts/
✅ deploy.sh
✅ *.sh
✅ *.ps1
```

**Why:** Needed for deployment and automation

---

## 🎯 Your Receipta Project - What's Ignored

### Currently Ignored (Correct) ✅
```
✅ .env (contains secrets)
✅ node_modules/ (dependencies)
✅ contract/target/ (build artifacts)
✅ .next/ (Next.js build)
✅ *.log (logs)
✅ .vscode/ (IDE settings)
✅ .kiro/ (IDE settings)
```

### Committed (Correct) ✅
```
✅ .env.example (template)
✅ contract/src/ (source code)
✅ backend/src/ (source code)
✅ frontend/src/ (source code)
✅ README.md (documentation)
✅ package.json (configuration)
✅ Cargo.toml (configuration)
```

---

## 🚨 Common Mistakes

### ❌ Mistake 1: Committing .env
```bash
# BAD - exposes secrets!
git add .env
git commit -m "add env file"
```

**Fix:**
```bash
# Remove from git
git rm --cached .env

# Add to .gitignore
echo ".env" >> .gitignore

# Commit the fix
git add .gitignore
git commit -m "fix: remove .env from git"
```

### ❌ Mistake 2: Ignoring Source Code
```gitignore
# BAD - ignores your code!
*.ts
*.rs
```

**Fix:** Remove these lines from .gitignore

### ❌ Mistake 3: Committing node_modules
```bash
# BAD - huge files!
git add node_modules/
```

**Fix:**
```bash
# Remove from git
git rm -r --cached node_modules/

# Ensure it's in .gitignore
echo "node_modules/" >> .gitignore

# Commit the fix
git add .gitignore
git commit -m "fix: remove node_modules from git"
```

### ❌ Mistake 4: Ignoring Documentation
```gitignore
# BAD - loses important docs!
*.md
```

**Fix:** Be specific about what to ignore:
```gitignore
# Good - only ignore personal notes
NOTES.md
TODO.md
```

---

## 🔍 How to Check What's Ignored

### Check if a file is ignored:
```bash
git check-ignore -v .env
# Output: .gitignore:82:.env    .env
# ✅ File is ignored

git check-ignore -v README.md
# No output
# ✅ File is NOT ignored (good!)
```

### See all ignored files:
```bash
git status --ignored
```

### See what would be committed:
```bash
git status
```

---

## 📋 Checklist Before Committing

Before running `git add .`, check:

```bash
# 1. Check what will be added
git status

# 2. Look for sensitive files
git status | grep -E "\.env$|\.key$|\.pem$|secret"

# 3. Check for large files
find . -type f -size +10M | grep -v node_modules | grep -v target

# 4. Verify .gitignore is working
git check-ignore -v .env
git check-ignore -v node_modules/

# 5. Review changes
git diff --cached
```

**If you see:**
- ❌ `.env` → DON'T COMMIT! Add to .gitignore
- ❌ `node_modules/` → DON'T COMMIT! Add to .gitignore
- ❌ `*.wasm` files → DON'T COMMIT! Add to .gitignore
- ❌ Large files (>10MB) → Check if they should be ignored
- ✅ Source code → Good!
- ✅ Documentation → Good!
- ✅ Configuration → Good!

---

## 🛡️ Security Best Practices

### 1. Never Commit Secrets
```bash
# Check for secrets before committing
git diff --cached | grep -i "secret\|password\|key\|token"
```

### 2. Use .env.example
```bash
# .env.example (commit this)
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
JWT_SECRET=your-secret-key-here
STELLAR_SECRET=SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# .env (DON'T commit this)
DATABASE_URL=postgresql://realuser:realpass@prod.db.com:5432/proddb
JWT_SECRET=actual-secret-key-abc123xyz789
STELLAR_SECRET=SABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJK
```

### 3. Scan for Leaked Secrets
```bash
# Install git-secrets
# https://github.com/awslabs/git-secrets

# Scan repository
git secrets --scan

# Scan history
git secrets --scan-history
```

### 4. If You Accidentally Committed Secrets
```bash
# 1. Remove from git history (use with caution!)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all

# 2. Force push (if not pushed yet, just amend)
git push origin --force --all

# 3. ROTATE THE SECRETS IMMEDIATELY!
# Change passwords, regenerate keys, etc.
```

---

## 📝 Your Complete .gitignore

Your current .gitignore is now complete with:

```gitignore
# Node.js
node_modules/
npm-debug.log*
*.log

# Environment & Secrets
.env
.env.*
!.env.example
*.pem
*.key
*.secret

# Rust/Cargo
contract/target/
**/target/
Cargo.lock
*.wasm
*.optimized.wasm

# Next.js
.next/
out/

# TypeScript
dist/
*.tsbuildinfo

# IDE
.vscode/
.idea/
.kiro/

# OS
.DS_Store
Thumbs.db

# Database
*.db
*.sqlite

# Temporary
*.tmp
tmp/
```

---

## ✅ Final Verification

Run these commands to verify your .gitignore is working:

```bash
# 1. Check status
git status

# 2. Should NOT see:
# - .env
# - node_modules/
# - contract/target/
# - .next/
# - *.wasm files

# 3. SHOULD see:
# - .env.example
# - Source code files
# - Documentation
# - Configuration files

# 4. If something is wrong:
git rm --cached <file>  # Remove from git
# Add to .gitignore
git add .gitignore
git commit -m "fix: update gitignore"
```

---

## 🎯 Summary

**Always Ignore:**
- ✅ Secrets (.env, keys)
- ✅ Dependencies (node_modules)
- ✅ Build artifacts (target/, dist/)
- ✅ IDE files (.vscode/)
- ✅ OS files (.DS_Store)

**Never Ignore:**
- ✅ Source code
- ✅ Documentation
- ✅ Configuration files
- ✅ Tests
- ✅ .env.example

**When in doubt:** If it's generated or contains secrets, ignore it. If it's source code or documentation, commit it.

---

**Your .gitignore is now properly configured for a Stellar project!** ✅

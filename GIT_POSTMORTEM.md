# Git Repository Setup - Post-Mortem

**Date**: October 22, 2025  
**Issue**: Failed initial push to GitHub  
**Resolution**: Successfully deployed after cleanup

---

## 🔴 What Happened

### Initial Problem
When we attempted to push to GitHub, we encountered:

1. **Yarn Cache Issue** (Primary)
   - `.yarn/cache/` directory contained 100MB+ of dependency files
   - Yarn Berry (4.0.2) uses "Zero-Installs" by default
   - This caches ALL npm packages locally for offline installs
   - GitHub has a 100MB file size limit
   - Individual cached packages exceeded this limit

2. **Secrets in Git History** (Secondary)
   - `CREDENTIALS.md` contained Airtable Personal Access Token
   - GitHub's push protection detected and blocked the push
   - Security feature prevented accidental credential exposure

### Why We Didn't Anticipate It

**Yarn Cache:**
- We configured `.yarnrc.yml` with `nodeLinker: node-modules` 
- This tells Yarn to use `node_modules/` for runtime
- BUT we didn't explicitly disable `enableGlobalCache`
- Yarn still populated `.yarn/cache/` for offline installs
- Standard `.gitignore` templates don't always exclude this

**Credentials:**
- Created `CREDENTIALS.md` as documentation
- Included actual API tokens for reference
- Should have used `.env.local` only (already gitignored)
- Didn't verify `.gitignore` before first commit

---

## ✅ Resolution Steps

### 1. Clean Yarn Cache from History
```bash
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch -r .yarn/cache' \
  --prune-empty --tag-name-filter cat -- --all
```

**Result:** Removed all `.yarn/cache/` files from Git history

### 2. Remove Credentials from History
```bash
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch CREDENTIALS.md' \
  --prune-empty --tag-name-filter cat -- --all
```

**Result:** Removed `CREDENTIALS.md` from all commits

### 3. Garbage Collection
```bash
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

**Result:** 
- Before: 103MB
- After: 81MB
- Reduced by ~22MB

### 4. Update .gitignore
Added explicit exclusions:
```gitignore
# Secrets and credentials (NEVER commit these!)
CREDENTIALS.md
.env.local

# Yarn (exclude cache - too large for GitHub)
.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/versions
!.yarn/sdks
.pnp.*
```

### 5. Fresh GitHub Repository
```bash
# Delete old repo
gh repo delete samuelmholley1/gather-kitchen-nutrition-labels --yes

# Create new repo
gh repo create samuelmholley1/gather-kitchen-nutrition-labels \
  --public \
  --source=. \
  --remote=origin \
  --description="FDA-compliant nutrition label calculator"

# Force push cleaned history
git push -u origin main --force
```

**Result:** ✅ Successfully pushed to GitHub

---

## 🛡️ Lessons Learned

### 1. Always Verify .gitignore BEFORE First Commit
**What we should have done:**
```bash
# Check what will be committed
git status
git add --dry-run .

# Review .gitignore coverage
cat .gitignore
```

**Prevention:**
- Use a comprehensive .gitignore template
- Verify no secrets in staging area
- Check repository size before pushing

### 2. Never Commit Actual Credentials
**What we should have done:**
- Keep credentials ONLY in `.env.local` (already gitignored)
- Use `CREDENTIALS.md.example` with placeholder values
- Document WHERE to find credentials, not the credentials themselves

**Example:**
```markdown
# CREDENTIALS.md.example

## USDA API Key
- **Location:** `.env.local`
- **Variable:** `USDA_API_KEY`
- **How to get:** See USDA_API_SETUP.md

## Airtable
- **Location:** `.env.local`
- **Variable:** `AIRTABLE_PAT_TOKEN`
- **How to get:** Airtable Settings → API → Personal Access Tokens
```

### 3. Configure Yarn Berry Properly
**What we should have done:**
```yaml
# .yarnrc.yml
nodeLinker: node-modules
enableGlobalCache: false  # ← This!
```

**Or** update `.gitignore` immediately:
```gitignore
.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/sdks
!.yarn/versions
```

### 4. Test Push with Small Commit First
**Best practice:**
```bash
# Create minimal commit first
git add README.md .gitignore
git commit -m "Initial commit"
git push

# Then add rest of codebase
git add .
git commit -m "Add application code"
git push
```

**Benefit:** Catches issues early before full codebase is committed

---

## 📋 Pre-Push Checklist (For Future Projects)

Before first `git push`:

- [ ] Review `.gitignore` coverage
- [ ] Verify no `.env*` files in staging (`git status`)
- [ ] Check for credential files (`grep -r "token\|key\|secret" .`)
- [ ] Verify repository size (`du -sh .git`)
- [ ] Test with small commit first
- [ ] Use `git add --dry-run .` to preview
- [ ] Enable GitHub secret scanning (automatic in public repos)

---

## 🔒 Security Best Practices Applied

### GitHub Secret Scanning
- ✅ Enabled automatically for public repositories
- ✅ Detected Airtable token in `CREDENTIALS.md`
- ✅ Blocked push until removed
- ✅ No credentials exposed publicly

### Environment Variables
- ✅ All secrets in `.env.local` (gitignored)
- ✅ Example file: `.env.local.example` (safe to commit)
- ✅ Documentation references env vars, not actual values

### Git History Cleanup
- ✅ Used `filter-branch` to rewrite history
- ✅ Removed sensitive files from ALL commits
- ✅ Garbage collected to remove orphaned objects
- ✅ Force-pushed to overwrite remote history

---

## 📊 Final Status

| Metric | Before | After |
|--------|--------|-------|
| Repository Size | Unknown | 81MB |
| Yarn Cache Files | Yes | No |
| Credentials in Repo | Yes | No |
| GitHub Push Status | ❌ Failed | ✅ Success |
| Secrets Exposed | Prevented | None |

---

## 🎯 Recommendations

### For This Project
1. ✅ Keep using `.env.local` for all secrets
2. ✅ Delete `CREDENTIALS.md` from working directory
3. ✅ Use `CREDENTIALS.md.example` for documentation
4. ✅ Add pre-commit hook to prevent credential commits (optional)

### For Future Projects
1. Use a pre-commit hook with secret detection
2. Start with comprehensive `.gitignore` template
3. Enable branch protection on GitHub
4. Use environment variable management service (Vercel, etc.)
5. Test push with minimal commit first

---

## 🔧 Automated Prevention (Optional Enhancement)

### Pre-Commit Hook
Create `.git/hooks/pre-commit`:
```bash
#!/bin/sh
# Prevent commits with potential secrets

if git diff --cached --name-only | grep -E '\.(env|credentials|secret)'; then
  echo "❌ Error: Attempting to commit sensitive files!"
  echo "Files:"
  git diff --cached --name-only | grep -E '\.(env|credentials|secret)'
  exit 1
fi

# Check for common secret patterns
if git diff --cached | grep -E '(api_key|password|secret|token).*=.*[a-zA-Z0-9]{20,}'; then
  echo "❌ Error: Potential secrets detected in commit!"
  echo "Please use environment variables instead."
  exit 1
fi

exit 0
```

Make executable:
```bash
chmod +x .git/hooks/pre-commit
```

---

**Resolution Time:** ~15 minutes  
**Commits Affected:** All (23 commits rewritten)  
**Data Loss:** None (local changes preserved)  
**Security Impact:** None (secrets never reached GitHub)

**Status:** ✅ RESOLVED - Repository clean and deployed

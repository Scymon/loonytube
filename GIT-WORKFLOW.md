# LoonyTube — Git Workflow SOP

---

## Branch Structure

```
main          ← production (Vercel auto-deploys)
dev           ← staging (Vercel preview URL)
  └─ feature/xyz
  └─ fix/xyz
  └─ chore/xyz
  └─ refactor/xyz
  └─ security/xyz
  └─ docs/xyz
hotfix/xyz    ← branches off main directly (emergencies only)
```

---

## Daily Workflow — New Feature or Fix

```powershell
# 1. Always start from dev
git checkout dev
git pull origin dev          # get latest before branching

# 2. Create your branch
git checkout -b feature/channel-page

# 3. Do your work, commit often
git add .
git commit -m "feat: add public channel page skeleton"
git commit -m "feat: wire follow button on channel page"

# 4. Push your branch
git push origin feature/channel-page
# Vercel auto-creates a preview URL for this branch

# 5. When done, merge into dev
git checkout dev
git merge feature/channel-page
git push origin dev
# Test on the dev preview URL

# 6. Clean up the feature branch
git branch -d feature/channel-page
git push origin --delete feature/channel-page
```

---

## Shipping to Production

```powershell
# Only when dev is tested and stable
git checkout main
git merge dev
git push origin main
# Vercel auto-deploys to production

# Tag the release
git tag v0.16.0
git push origin v0.16.0
```

---

## Hotfix — Production is Broken

```powershell
# 1. Branch off MAIN (not dev)
git checkout main
git pull origin main
git checkout -b hotfix/signup-broken

# 2. Fix it
git add .
git commit -m "fix: signup broken due to guard trigger"

# 3. Merge to main → goes live
git checkout main
git merge hotfix/signup-broken
git push origin main

# 4. Merge to dev → keeps them in sync
git checkout dev
git merge hotfix/signup-broken
git push origin dev

# 5. Tag it if significant
git tag v0.16.1
git push origin v0.16.1

# 6. Clean up
git branch -d hotfix/signup-broken
git push origin --delete hotfix/signup-broken
```

---

## Branch Naming

| Prefix | Use for |
|--------|---------|
| `feature/` | New functionality |
| `fix/` | Bug fixes (non-urgent) |
| `hotfix/` | Urgent production fixes |
| `chore/` | Dependencies, lockfile, config |
| `refactor/` | Code restructure, no behavior change |
| `security/` | Auth, RLS, signed URLs, hardening |
| `docs/` | README, changelog, SOP updates |

Examples:
```
feature/channel-page
feature/monetization-tiers
fix/thumbnail-scrubber
fix/nav-mobile-search
hotfix/upload-api-broken
chore/regenerate-lockfile
refactor/comment-unification
security/webhook-hmac-verify
docs/update-readme
```

---

## Commit Message Format

```
type: short description in present tense

feat:     new feature
fix:      bug fix
chore:    tooling, deps, config
refactor: restructure without behavior change
security: security hardening
docs:     documentation only
```

Examples:
```
feat: add processing toast after video upload
fix: cf thumbnail url format seconds not percent
chore: regenerate pnpm lockfile
security: enforce signed playback for private videos
docs: update readme to reflect v0.15
```

---

## Versioning — When to Bump

| Change | Version bump | Example |
|--------|-------------|---------|
| Bug fix, no new features | PATCH | `v0.15.0` → `v0.15.1` |
| New feature, nothing breaks | MINOR | `v0.15.0` → `v0.16.0` |
| Breaking change | MAJOR | `v0.x` → `v1.0.0` |

**Current stage:** `0.x` = pre-alpha, anything goes.

```
0.x.y          → now (active development)
1.0.0-alpha    → invite-only beta with real users
1.0.0-beta     → broader access, monetization live
1.0.0          → public launch
```

---

## Quick Reference

```powershell
# Where am I?
git branch

# What's changed?
git status

# Pull latest dev before branching
git pull origin dev

# See all branches
git branch -a

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Stash work in progress before switching branches
git stash
git stash pop          # bring it back

# See recent commits
git log --oneline -10
```

---

## Rules

1. **Never commit directly to `main`** — always go through `dev`.
2. **Always `git pull origin dev` before creating a new branch** — avoids merge conflicts.
3. **Hotfixes merge to both `main` AND `dev`** — never skip `dev` or the fix gets re-broken next deploy.
4. **Tag every production merge** — keeps the changelog anchored to real commits.
5. **Delete branches after merging** — keeps the repo clean.

# LoonyTube — Git Workflow SOP

---

## Branch Structure

```
main              ← production (loonytube.tv) — Vercel auto-deploys
└── dev           ← staging — merges into main to ship
    ├── features  ← new pages, components, functionality
    ├── fixes     ← bug fixes (non-urgent)
    ├── security  ← RLS, auth, signed URLs, hardening
    ├── refactor  ← restructures, no behavior change
    ├── docs      ← README, changelog, SOP updates
    └── chore     ← dependencies, lockfile, config

hotfix            ← emergency only, branches off main directly
```

The category branches (`features`, `fixes`, etc.) are **permanent** — they never get deleted. Work on them, merge into `dev`, and the branch stays ready for the next task.

---

## Daily Workflow

### 1. Pick your branch and pull latest

```powershell
git checkout features    # or fixes, security, refactor, docs, chore
git pull origin features
```

### 2. Do your work, commit often

```powershell
git add .
git commit -m "feat: add shorts feed vertical scroll"
git push origin features
# Vercel auto-creates a preview URL for every branch
```

### 3. Merge into dev when ready

```powershell
git checkout dev
git pull origin dev
git merge features
git push origin dev
# Test on the dev Vercel preview URL before shipping
```

### 4. Sync category branch with latest dev before starting new work

```powershell
git checkout dev && git pull origin dev
git checkout features
git merge dev
```

---

## Shipping to Production

Only when `dev` is tested and stable:

```powershell
git checkout main
git merge dev
git push origin main        # Vercel auto-deploys to loonytube.tv

# Tag the release
git tag v0.16.0
git push origin v0.16.0
```

---

## Hotfix — Production is Broken

The one exception to the normal flow. Branches off `main`, not `dev`.

```powershell
# 1. Branch off main
git checkout main
git pull origin main
git checkout -b hotfix

# 2. Fix it
git add .
git commit -m "fix: describe what broke"

# 3. Merge to main → goes live
git checkout main
git merge hotfix
git push origin main

# 4. Backport to dev → keeps branches in sync
git checkout dev
git merge hotfix
git push origin dev

# 5. Tag if significant
git tag v0.16.1
git push origin v0.16.1
```

---

## Commit Message Format

```
feat:     new feature
fix:      bug fix
chore:    tooling, deps, config
refactor: restructure without behavior change
security: security hardening
docs:     documentation only
```

Examples:
```
feat: add public channel page
fix: cf thumbnail url format seconds not percent
chore: regenerate pnpm lockfile
security: enforce signed playback for private videos
docs: update readme to reflect v0.16
```

---

## Versioning — When to Bump

| Change | Bump | Example |
|--------|------|---------|
| Bug fix, no new features | PATCH | `v0.15.0` → `v0.15.1` |
| New feature, nothing breaks | MINOR | `v0.15.0` → `v0.16.0` |
| Breaking change | MAJOR | `v0.x` → `v1.0.0` |

**Current stage:** `0.x` = pre-alpha.

```
0.x.y        → now (active development)
1.0.0-alpha  → invite-only beta with real users
1.0.0-beta   → broader access, monetization live
1.0.0        → public launch
```

---

## Quick Reference

```powershell
# Where am I?
git branch

# What's changed?
git status

# See the branch graph
git log --oneline --graph --all

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Stash work in progress before switching branches
git stash
git stash pop

# See recent commits
git log --oneline -10
```

---

## Rules

1. **Never commit directly to `main`** — always go through `dev`.
2. **Pull the category branch before starting work** — avoids merge conflicts.
3. **Merge category branch → `dev` before shipping** — staging is the gate.
4. **Hotfixes merge to both `main` AND `dev`** — never skip `dev` or the fix gets re-broken on next deploy.
5. **Tag every production merge** — keeps the changelog anchored to real commits.

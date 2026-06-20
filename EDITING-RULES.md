# LoonyTube — File Editing Rules

## The One Rule

**Never rewrite a whole file. Always use surgical Python replacement.**

---

## Why

The Edit tool silently truncates large files by inserting null bytes (`\x00`) at the cut point. The file looks fine in the editor. The app compiles locally. Then Vercel's build fails with a cryptic error, or worse — the file is silently corrupted and you don't notice until something random breaks.

This has happened multiple times on this project. It is not hypothetical.

---

## The Safe Way — Python Surgical Replacement

Always read the file first, replace only the exact string you need to change, write it back, and verify no null bytes were introduced.

```python
# Read
data = open("src/components/whatever/YourComponent.tsx").read()

# Verify what you're replacing is actually there
assert "old string here" in data, "String not found — check exact whitespace"

# Replace only that string
data = data.replace(
    'old string here',
    'new string here'
)

# Write back
open("src/components/whatever/YourComponent.tsx", "wb").write(data.encode())

# Verify — zero nulls, sane file size
d = open("src/components/whatever/YourComponent.tsx", "rb").read()
print("bytes:", len(d), "nulls:", d.count(b"\x00"), "tail:", repr(d[-20:]))
```

---

## Null Byte Check — Run This If Something Seems Wrong

```python
import glob

for f in glob.glob("src/**/*.tsx", recursive=True) + glob.glob("src/**/*.ts", recursive=True):
    d = open(f, "rb").read()
    if b"\x00" in d:
        print("NULL BYTES FOUND:", f)
```

If you find null bytes, strip them:

```python
path = "src/components/whatever/YourComponent.tsx"
d = open(path, "rb").read()
d = d.rstrip(b"\x00")
open(path, "wb").write(d)
print("Fixed. Bytes remaining:", len(d))
```

The `.next/types/routes.d.ts` file is a known repeat offender — Next.js regenerates it with trailing null bytes every time you add a new API route. Same fix applies.

---

## The Only Time a Full Rewrite Is Acceptable

When the file is **new** (doesn't exist yet), or when the architecture of the file is changing so completely that surgical replacement would require more than 5 individual replacements. Even then — write the full content as a Python string and write it in one shot, then verify.

```python
content = '''
"use client";

// ... full file content as a string ...
'''

open("src/components/new/NewComponent.tsx", "wb").write(content.encode())
d = open("src/components/new/NewComponent.tsx", "rb").read()
print("bytes:", len(d), "nulls:", d.count(b"\x00"))
```

---

## Before Pushing — Always Run

```powershell
npx tsc --noEmit
```

Zero output = zero type errors = safe to push.
Any output = fix it before pushing or Vercel will fail.

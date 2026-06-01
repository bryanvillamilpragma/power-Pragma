---
name: dependency-management
description: Frontend dependency management, supply chain security, and package auditing. Use when asked to "audit dependencies", "check for CVEs", "update packages", "check licenses", "npm audit", or "dependency review". Includes npm vulnerability context and migration path to pnpm.
license: MIT
metadata:
  author: pragma-frontend-security
  version: "2.0"
  scope: "npm, yarn, pnpm ecosystems"
---

# Dependency Management — Complete Knowledge Base

Best practices for managing frontend dependencies securely and efficiently. Covers supply chain security, CVE detection, license compliance, version strategies, and package health evaluation.

> **Recommendation:** Use **pnpm** as your package manager. It is the only one with native `min-version-age` support — the most effective defense against the supply chain attacks described in this document.

---

## D0 — npm Supply Chain Risk (Current Threat Landscape)

### Why npm Projects Are at Higher Risk

Recent incidents demonstrate that malicious packages are injected into npm immediately after publication — attackers exploit the window between publish and detection (minutes to hours). npm has **no native mechanism to enforce a cooling-off period** before packages can be installed.

| Package Manager | `min-version-age` | Lockfile Integrity | Phantom Dependency Protection |
|---|---|---|---|
| **pnpm** | ✅ Built-in | ✅ Strict | ✅ |
| npm | ❌ Not available | Partial | ❌ |
| yarn | ❌ Not available | ✅ Strict | ❌ |

### Notable npm Supply Chain Incidents

| Year | Incident | Impact |
|---|---|---|
| 2018 | `event-stream` — compromised maintainer injected crypto-stealing code | Millions of downloads |
| 2021 | `ua-parser-js` — hijacked, three malicious versions published in hours | Widespread enterprise exposure |
| 2022 | `colors` / `faker` — intentional protestware by maintainer | Production breakage across thousands of projects |
| 2024 | `polyfill.io` — CDN hijacked, malicious scripts injected into 100k+ sites | Widespread frontend exposure |
| 2025 | Multiple npm packages with malicious `postinstall` scripts | Active exploitation ongoing |

> Note: the xz-utils (2024) backdoor was a system library attack (liblzma), not npm — but it demonstrates that supply chain attacks affect all ecosystems via social engineering.

### npm Mitigation (if migration is not immediate)

```ini
# .npmrc — minimum required for npm projects
save-exact=true
ignore-scripts=true
```

```bash
# CI/CD
npm ci                              # Never npm install in CI
npm audit --audit-level=moderate    # Fail on moderate+

# Before installing ANY new package
npm info <pkg> time.created dist-tags.latest   # Check publish date
# Never install packages published < 1 day ago
npm install <pkg>@<exact-version> --save-exact
```

### Migration: npm → pnpm

```bash
# 1. Enable pnpm via corepack (no global install)
corepack enable && corepack use pnpm@latest

# 2. Import existing lockfile
pnpm import           # generates pnpm-lock.yaml from package-lock.json

# 3. Reinstall cleanly
rm package-lock.json && rm -rf node_modules
pnpm install

# 4. Add min-version-age to .npmrc
echo "min-version-age=3" >> .npmrc

# 5. Pin packageManager in package.json
# { "packageManager": "pnpm@10.x.x" }

# 6. Commit
git add pnpm-lock.yaml package.json .npmrc
git rm package-lock.json
git commit -m "chore: migrate from npm to pnpm with supply chain hardening"
```

---

## D1 — Supply Chain Attack Prevention

### Attack Vectors

| Vector | Description | Example |
|--------|-------------|---------|
| **Typosquatting** | Packages with similar names to popular ones | `lodahs` instead of `lodash` |
| **Dependency Confusion** | Public package matching a private package name | Attacker publishes `@company/internal-lib` to npm |
| **Compromised Maintainer** | Maintainer account hacked, malicious version published | `event-stream` incident (2018) |
| **Install Scripts** | `postinstall` scripts execute arbitrary code | Mining crypto in `postinstall` |
| **Protestware** | Maintainer intentionally adds destructive code | `colors` and `faker` incident (2022) |

### Prevention

```bash
# ✅ Always commit lock files
git add pnpm-lock.yaml   # or package-lock.json / yarn.lock

# ✅ Use lockfile-lint to detect unauthorized registries
npx lockfile-lint \
  --path pnpm-lock.yaml \
  --type pnpm \
  --allowed-hosts npm \
  --validate-https
# npm projects: --path package-lock.json --type npm

# ✅ Disable install scripts for untrusted packages (npm)
npm config set ignore-scripts true

# ✅ Use frozen lockfile in CI
pnpm install --frozen-lockfile   # pnpm
npm ci                           # npm

# ✅ Pin exact versions for critical dependencies
pnpm add react@18.3.1            # pnpm (exact by default with save-exact)
npm install --save-exact react@18.3.1

# ✅ Use provenance verification (npm v9.5+)
npm audit signatures
```

### .npmrc Security Configuration (pnpm)

```ini
# Require packages to be at least 3 days old before install
min-version-age=3

# Shared lockfile for workspaces
shared-workspace-lockfile=true
```

### .npmrc Security Configuration (npm fallback)

```ini
package-lock=true
access=restricted
ignore-scripts=true
strict-ssl=true
save-exact=true
registry=https://registry.npmjs.org/
```

---

## D2 — CVE Detection & Resolution

### Audit Commands

```bash
# pnpm
pnpm audit
pnpm audit --audit-level=moderate

# npm
npm audit
npm audit --audit-level=moderate
npm audit fix
npm audit fix --force   # REVIEW CHANGES before committing

# Better audit for CI pipelines
npx audit-ci --moderate

# Snyk (comprehensive, requires account)
npx snyk test
npx snyk monitor

# OSV-Scanner (Google, free)
npx osv-scanner --lockfile=pnpm-lock.yaml
```

### CVE Severity Decision Matrix

| Severity | Action | Timeline |
|----------|--------|----------|
| **CRITICAL** | Stop and fix immediately | Same day |
| **HIGH** | Fix in current sprint | This week |
| **MEDIUM** | Plan fix, assess impact | Next sprint |
| **LOW** | Document, fix when convenient | Backlog |

### Resolution Strategies

```bash
# Strategy 1: Direct update (preferred)
pnpm update vulnerable-package
```

```json
// Strategy 2: Override nested dependency — package.json (pnpm)
{
  "pnpm": {
    "overrides": {
      "vulnerable-transitive-dep": ">=2.0.1"
    }
  }
}
```

```json
// npm
{
  "overrides": {
    "vulnerable-transitive-dep": ">=2.0.1"
  }
}
```

```bash

// Strategy 3: Replace package entirely
pnpm remove vulnerable-package
pnpm add secure-alternative@<exact-version>

// Strategy 4: Mitigate if no fix available
// Document the risk + apply compensating controls
// e.g., CSP headers, input sanitization, WAF rules
```

---

## D3 — License Compliance

### License Risk Matrix

| License | Risk | Commercial Use | Copyleft | Action |
|---------|------|---------------|----------|--------|
| MIT | ✅ Low | Yes | No | Safe to use |
| Apache-2.0 | ✅ Low | Yes | No | Safe, patent grant |
| BSD-2/3 | ✅ Low | Yes | No | Safe to use |
| ISC | ✅ Low | Yes | No | Safe to use |
| GPL-2.0 | 🔴 High | Conditional | Yes | **Review with legal** |
| GPL-3.0 | 🔴 High | Conditional | Yes | **Review with legal** |
| AGPL-3.0 | 🔴 Critical | Conditional | Yes + Network | **Avoid in SaaS** |
| LGPL-2.1/3.0 | 🟡 Medium | Yes (with rules) | Partial | OK for dynamic linking |
| Unlicensed | 🔴 Critical | Unknown | Unknown | **Never use** |

### Audit Licenses

```bash
npx license-checker --summary
npx license-checker --failOn "GPL-2.0;GPL-3.0;AGPL-3.0"
npx license-checker --csv --out licenses.csv
```

---

## D4 — Package Health Evaluation

Before installing ANY new package:

| Criterion | Green Flag | Red Flag |
|-----------|-----------|----------|
| **Age** | >3 days since publish | <1 day (block with min-version-age) |
| **Downloads/week** | >10,000 | <100 |
| **Last publish** | <6 months | >2 years |
| **Maintainers** | >1 active | 1 inactive |
| **GitHub stars** | >500 | <10 |
| **Open issues** | Actively triaged | 100+ abandoned |
| **Dependencies** | <5 direct deps | 50+ deep chain |
| **TypeScript** | Native or @types | No types available |
| **Test coverage** | Has CI/tests | No test suite |
| **Security policy** | SECURITY.md exists | No reporting process |

```bash
# Check publish date before installing
npm info <package> time.created dist-tags.latest

# Check bundle size impact
npx bundle-phobia <package-name>
```

---

## D5 — Version Strategy

```json
{
  "dependencies": {
    "react": "18.3.1",
    "next": "15.2.0"
  }
}
```

**Never use ranges** — especially in pnpm projects. `^` and `~` allow automatic upgrades that bypass lockfile review. Always use exact pins.

### Update Strategy

```bash
# Check for outdated packages
pnpm outdated

# Update deliberately, one package at a time
pnpm update <pkg> --latest
git diff pnpm-lock.yaml   # Review before committing

# Automated PRs: use Renovate or Dependabot (review each PR)
```

---

## D6 — Monorepo Dependency Management

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

```bash
# Check version mismatches across workspace
npx syncpack list-mismatches
npx syncpack fix-mismatches
```

---

## Quick Reference — Dependency Checklist

| Category | Check | Severity |
|----------|-------|----------|
| **Package Manager** | Using pnpm with `min-version-age=3` | CRITICAL |
| **Supply Chain** | Lockfile committed, CI uses frozen install | CRITICAL |
| **Supply Chain** | Install scripts disabled for untrusted packages | HIGH |
| **CVEs** | Audit returns 0 critical/high | CRITICAL |
| **CVEs** | CI pipeline fails on moderate+ | HIGH |
| **Licenses** | No GPL/AGPL in production | HIGH |
| **Health** | New packages evaluated (age, downloads, maintainers) | HIGH |
| **Versions** | All deps pinned exact (no `^` or `~`) | HIGH |
| **Monorepo** | Version sync across workspaces | MEDIUM |

---

## Agent Rules — npm Projects

> Apply these rules when the project uses npm (`package-lock.json` detected).

### Mandatory warning on every install/update request

> ⚠ **Este proyecto usa npm.** npm no soporta `min-version-age`, lo que lo expone a paquetes maliciosos inyectados en el periodo inmediato a su publicación. Se recomienda migrar a pnpm.

### npm install rules

- NUNCA sugerir `npm install <pkg>` sin versión exacta. Siempre: `npm install <pkg>@<version> --save-exact`.
- NUNCA usar `^` ni `~` en `package.json`.
- NUNCA sugerir `npm update` ni upgrades masivos.
- Verificar fecha de publicación antes de instalar: `npm info <pkg> time.created`.
- No instalar paquetes publicados hace menos de 1 día.

### Recommend migration to pnpm

When working on dependency config, project setup, or CI/CD:

```bash
corepack enable && corepack use pnpm@latest
pnpm import          # imports package-lock.json → pnpm-lock.yaml
# add min-version-age=3 to .npmrc
# delete package-lock.json
```

### Minimum mitigation if not migrating

```ini
# .npmrc
save-exact=true
```

```bash
npm audit --audit-level=moderate
npm ci   # never npm install in CI
```

Do NOT disable audits to unblock pipelines. Do NOT use `npm install` without `--save-exact` for new deps.

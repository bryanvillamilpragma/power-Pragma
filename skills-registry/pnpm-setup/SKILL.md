---
name: pnpm-setup
description: Complete pnpm setup and security configuration guide. Use when initializing pnpm in a project, configuring .npmrc, setting up CI, or hardening supply chain security. Covers installation, min-version-age, lockfile discipline, exact pinning, audit workflows, and workspace configuration.
---

# pnpm — Setup & Security Configuration

pnpm is the recommended package manager for Pragma projects. It is the only major package manager with native `min-version-age` support — the single most effective defense against malicious package injection attacks.

---

## Quick Start

```bash
# 1. Enable pnpm via corepack
corepack enable
corepack use pnpm@10  # pin to major; run `pnpm --version` and commit the exact version to package.json

# 2. Install dependencies
pnpm install

# 3. Create .npmrc with security hardening
echo "min-version-age=3" >> .npmrc

# 4. Pin packageManager in package.json
# { "packageManager": "pnpm@10.x.x" }   ← run pnpm --version to get exact

# 5. Commit
git add pnpm-lock.yaml .npmrc package.json
```

---

## Why min-version-age

Most supply chain attacks exploit the window between malicious package publication and community detection (minutes to hours). `min-version-age=3` blocks installation of any package published less than 3 days ago — the attack window.

```ini
# .npmrc
min-version-age=3       # baseline for all projects
# min-version-age=7     # use for production-critical projects
```

When install fails:
```
ERR_PNPM_MIN_VERSION_AGE: The package <pkg>@<ver> is too new (published X hours ago)
```
**Do not disable `min-version-age` to unblock.** Use the previous stable version instead.

---

## Full .npmrc Configuration

```ini
# Supply chain hardening
min-version-age=3

# Workspaces
shared-workspace-lockfile=true

# Optional: save exact versions by default
save-exact=true
```

---

## Installation

### New project (no lockfile)

```bash
corepack enable
pnpm install
```

### Migrating from npm

```bash
pnpm import              # converts package-lock.json → pnpm-lock.yaml
rm package-lock.json
rm -rf node_modules
pnpm install
```

### Migrating from yarn

```bash
pnpm import              # converts yarn.lock → pnpm-lock.yaml
rm yarn.lock
rm -rf node_modules
pnpm install
```

---

## Lockfile Discipline

```bash
# Always commit pnpm-lock.yaml
# Never add it to .gitignore

# Local dev
pnpm install              # updates lockfile as needed

# CI — strict, no surprises
pnpm install --frozen-lockfile

# Never
pnpm install --no-lockfile
```

---

## Adding Dependencies

Always use exact versions:

```bash
# Preferred: specify exact version
pnpm add react@18.3.1

# Or configure pnpm to always save exact
echo "save-exact=true" >> .npmrc
pnpm add react             # saves exact version automatically
```

Before adding ANY new package:
1. Check publish date: `npm info <pkg> time.created` — never add packages < 1 day old
2. Verify on npmjs.com: downloads, maintainers, last publish date
3. Check bundle impact: `npx bundle-phobia <pkg>`

**Never use `^` or `~` in `package.json`.**

---

## Audit Workflow

```bash
# Check for vulnerabilities
pnpm audit
pnpm audit --audit-level=moderate

# Auto-fix compatible upgrades
pnpm audit --fix

# Review lockfile diff before committing
git diff pnpm-lock.yaml
```

In CI:

```yaml
- name: Audit dependencies
  run: pnpm audit --audit-level=moderate
```

Never skip audits to unblock a pipeline.

---

## CI/CD Setup

### GitHub Actions

```yaml
- uses: pnpm/action-setup@v4
  with:
    version: 10

- name: Install Node.js
  uses: actions/setup-node@v4
  with:
    node-version: 22
    cache: 'pnpm'

- name: Install dependencies
  run: pnpm install --frozen-lockfile

- name: Audit
  run: pnpm audit --audit-level=moderate
```

### Other CI systems

```bash
# Always use frozen-lockfile in CI
pnpm install --frozen-lockfile
```

---

## Workspace Configuration

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

```ini
# .npmrc at workspace root — applies to all packages
min-version-age=3
shared-workspace-lockfile=true
```

Single `pnpm-lock.yaml` at root. Never use `--no-lockfile` in workspaces.

---

## package.json Conventions

```json
{
  "packageManager": "pnpm@10.0.0",
  "scripts": {
    "install:ci": "pnpm install --frozen-lockfile"
  },
  "dependencies": {
    "react": "18.3.1"
  }
}
```

---

## Disallowed Patterns

```bash
# ❌ Never
pnpm install --no-lockfile
npm install                  # use pnpm
yarn add                     # use pnpm
npm update                   # use pnpm update <pkg>
npx npm-check-updates        # mass upgrade bypasses review

# ✅ Always
pnpm install --frozen-lockfile    # in CI
pnpm add <pkg>@<exact-version>   # when adding deps
pnpm update <pkg>                 # when upgrading (review diff)
```

---

## Updating Dependencies

```bash
# Check what's outdated
pnpm outdated

# Update one package at a time — review diff before committing
pnpm update <pkg> --latest
git diff pnpm-lock.yaml

# Never mass-upgrade without review
```

---

## Agent Rules — pnpm Projects

> Apply these rules at all times in any project using pnpm (or being set up with pnpm).

### Package manager

- NUNCA sugerir `npm install`, `yarn add` ni `bun add`. Usar siempre `pnpm`.
- Si no existe `pnpm-lock.yaml`: inicializar con `corepack enable && pnpm install`, pedir commit del lockfile.
- Si `package.json` no tiene `packageManager`: agregar `"packageManager": "pnpm@<version>"` (obtener con `pnpm --version`).

### Exact versions

- NUNCA usar `^` ni `~`. Solo pins exactos: `"react": "18.3.1"`.
- Al agregar: `pnpm add <pkg>@<exact-version>`.
- NUNCA `npm update`, `npx npm-check-updates` ni upgrades masivos.

### .npmrc

- Todo proyecto DEBE tener `min-version-age=3` en `.npmrc`.
- Proyectos críticos de producción: `min-version-age=7`. Si es un proyecto nuevo sin contexto, preguntar al equipo el nivel de criticidad.
- Si `.npmrc` no existe, crearlo con esa línea.

### Lockfile

- `pnpm-lock.yaml` siempre commiteado. NUNCA en `.gitignore`.
- En CI: `pnpm install --frozen-lockfile`. NUNCA `--no-lockfile`.

### New dependencies

- Verificar en npmjs.com: fecha de publicación, descargas, publisher.
- No instalar paquetes publicados hace menos de 1 día.
- Si falla por `ERR_PNPM_MIN_VERSION_AGE`: usar versión anterior estable. No deshabilitar el control salvo necesidad absoluta documentada.

### Audit

- Incluir `pnpm audit --audit-level=moderate` en pipelines CI.
- Nunca omitir auditorías para desbloquear un pipeline.

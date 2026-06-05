# Instalación y configuración de Playwright

## Detectar package manager

```bash
[ -f "yarn.lock" ] && echo "yarn" || [ -f "pnpm-lock.yaml" ] && echo "pnpm" || echo "npm"
```

## Instalar Playwright

```bash
# npm
npm install -D @playwright/test

# yarn
yarn add -D @playwright/test

# pnpm
pnpm add -D @playwright/test
```

```bash
# Instalar solo Chromium (más rápido)
npx playwright install --with-deps chromium
```

---

## Generar playwright.config.ts según stack

### Detectar framework:
```bash
[ -f "angular.json" ] && echo "ANGULAR" || \
grep -q '"next"' package.json && echo "NEXT" || \
grep -q '"vite"' package.json && echo "VITE" || echo "REACT"
```

### Angular (puerto 4200):
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'ng serve',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env.CI,
  },
});
```

### React / Vite (puerto 5173):
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Next.js (puerto 3000):
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## Crear directorio de tests

```bash
mkdir -p e2e
```

## Verificación final

```bash
npx playwright --version
npx playwright test --list 2>/dev/null || echo "Sin specs aún — listo para crear"
```

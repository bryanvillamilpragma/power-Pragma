# Escritura y corrección de tests

Usar SIEMPRE los selectores y textos capturados en Fase 1. Nunca adivinar.

---

## Selectores — orden de preferencia

```typescript
// ✅ 1. Por rol + nombre (más robusto)
page.getByRole('button', { name: 'Ingresar' })
page.getByRole('link', { name: 'Usuarios' })

// ✅ 2. Por label o placeholder
page.getByLabel('Contraseña')
page.getByPlaceholder('Ingresa tu correo')

// ✅ 3. Por texto visible exacto
page.getByText('Credenciales incorrectas')

// ⚠️ Aceptable si el equipo lo usa como estándar
page.getByTestId('submit-button')

// ❌ Nunca
page.locator('.btn-primary')
page.locator('#some-id')
page.locator('div:nth-child(3) > button')
```

---

## Assertions — siempre específicas

```typescript
// ✅
await expect(page).toHaveURL('/dashboard');
await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
await expect(page.getByRole('alert')).toContainText('Credenciales incorrectas');

// ❌ Test sin assertions no prueba nada
```

---

## Esperas — siempre por condición

```typescript
// ✅
await expect(page.getByText('Guardado exitosamente')).toBeVisible();
await page.waitForURL('/usuarios');

// ❌
await page.waitForTimeout(3000);
```

---

## Plantilla base — estructura AAA obligatoria

```typescript
import { test, expect } from '@playwright/test';

test.describe('[Pantalla o flujo]', () => {

  test.beforeEach(async ({ page }) => {
    // Login compartido si la pantalla requiere autenticación
    await page.goto('/login');
    await page.getByPlaceholder('Correo electrónico').fill('test@ejemplo.com');
    await page.getByLabel('Contraseña').fill('password123');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await page.waitForURL('/dashboard');
  });

  test('should [acción] [resultado esperado]', async ({ page }) => {
    // Arrange
    await page.goto('/[ruta]');

    // Act
    // interacciones...

    // Assert
    // verificaciones...
  });

  test('should show error when [condición]', async ({ page }) => {
    // Arrange
    await page.goto('/[ruta]');

    // Act
    // acción que genera error...

    // Assert
    await expect(page.getByRole('alert')).toContainText('[mensaje exacto]');
  });

});
```

---

## Flujos mínimos por tipo de pantalla

### Login / Auth
- Flujo exitoso → redirección correcta
- Credenciales incorrectas → mensaje exacto
- Campos vacíos → validaciones

### Listado CRUD
- Carga inicial → tabla visible
- Estado vacío → mensaje de "sin datos"
- Botón de crear → navega a la ruta correcta

### Formulario CRUD
- Submit exitoso → mensaje de confirmación + redirección
- Validaciones → mensajes de error por campo
- Cancelar → regresa al listado sin cambios

### Eliminación
- Modal/dialog de confirmación aparece
- Confirmación → item desaparece del listado
- Mensaje de éxito visible

---

## Corrección de tests fallando

1. Leer el error exacto de Playwright
2. Identificar qué cambió (selector, texto, ruta)
3. Actualizar SOLO lo que cambió
4. Ejecutar ese spec para confirmar:

```bash
npx playwright test e2e/[archivo].spec.ts --reporter=list
npx playwright test -g "should redirect to dashboard"
```

5. Si pasa → ejecutar suite completo para detectar regresiones

---

## Verificación final

```bash
npx playwright test --reporter=list
```

Solo reportar éxito cuando TODOS los tests estén en verde.
Si alguno falla tras los cambios → investigar y corregir antes de reportar.

---

## Reporte final — `reports/playwright-e2e-audit.md`

```markdown
# Playwright E2E Audit — {fecha}

**Stack:** {Angular | React | Next.js}
**IDE:** {Claude Code | Kiro | VS Code}
**MCP browser:** {ya configurado | configurado en esta sesión}

## Resumen

| Métrica | Valor |
|---------|-------|
| Tests corregidos | X |
| Tests nuevos escritos | Y |
| Suite final | Z/Z pasando |
| Cobertura de pantallas | N/N pantallas con tests |

## Cambios realizados

| Archivo | Tipo | Descripción |
|---------|------|-------------|
| e2e/login.spec.ts | Corrección | Selector .login-btn → getByRole |
| e2e/usuarios.spec.ts | Nuevo | Crear, editar, eliminar usuario |

## Tests por pantalla

| Pantalla | Tests | Estado |
|----------|-------|--------|
| /login | 2 | ✅ |
| /dashboard | 4 | ✅ |
| /usuarios | 5 | ✅ |
```

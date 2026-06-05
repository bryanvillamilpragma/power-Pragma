# Análisis de gaps: app vs tests

## Paso 1 — Inventario de tests existentes

```bash
find . -name "*.spec.ts" -not -path "*/node_modules/*" | sort
```

```bash
npx playwright test --reporter=list 2>&1
```

Leer cada spec encontrado. Extraer:
- Qué ruta cubre (`page.goto(...)`)
- Qué flujos prueba (nombres de los `test(...)`)
- Qué selectores usa (para detectar si son frágiles)

---

## Paso 2 — Clasificación por flujo

### ✅ Cubierto y sano
- Tiene spec, está pasando, usa selectores robustos (rol/label/placeholder), tiene estructura AAA.
- **Acción: no tocar nada**

### ⚠️ Cubierto pero frágil
Test pasa pero tiene alguno de estos problemas:
- Selector por clase CSS: `page.locator('.btn-primary')`
- Selector por ID: `page.locator('#submit')`
- Espera por tiempo: `await page.waitForTimeout(2000)`
- Sin assertions significativas

**Acción: proponer refactor — el usuario decide si aplicar**

### ❌ Test fallando
Investigar causa:
- Selector que ya no existe
- Texto de botón/label que cambió
- Ruta que cambió
- Redirección inesperada

**Acción: corregir (con aprobación)**

### 🔴 Sin tests
Flujo existe en la app pero no tiene spec.

**Acción: escribir tests nuevos (con aprobación)**

---

## Paso 3 — Priorización si hay muchos gaps

1. **Crítico** → autenticación, datos del usuario, pagos
2. **Alto** → flujos CRUD principales, validaciones de formularios
3. **Medio** → listados, navegación, estados vacíos
4. **Bajo** → pantallas de solo lectura

---

## Detectar selectores frágiles

| Frágil | Robusto |
|---|---|
| `.btn-primary` | `getByRole('button', { name: 'Guardar' })` |
| `#username-input` | `getByLabel('Usuario')` |
| `div.card:nth-child(2)` | `getByText('Nombre del card')` |
| `xpath=//button[1]` | `getByRole('button').first()` |
| `await page.waitForTimeout(3000)` | `await expect(el).toBeVisible()` |

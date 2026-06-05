---
name: playwright-e2e-audit
description: Configura el entorno E2E, navega la app en vivo, audita tests existentes y completa los que faltan. Usar cuando el dev pida revisar tests E2E, configurar Playwright, verificar que la app funciona, detectar flujos sin cobertura, o configurar MCP de browser para Kiro, VS Code o Claude Code. Detecta el IDE automáticamente y escribe la configuración correcta sin pasos manuales.
type: workflow
stacks:
  - angular
  - react
  - nextjs
---

# Workflow: Playwright E2E Audit

Automatiza todo el ciclo de testing E2E: configura el entorno, navega la app, audita los tests existentes y completa los que faltan.

## Fases de ejecución

Ejecuta las fases en orden. No pasar a la siguiente sin completar la anterior.

```
FASE 0 → Setup del entorno (MCP + Playwright)
FASE 1 → Exploración de la app (navegación en vivo)
FASE 2 → Auditoría de tests existentes
FASE 3 → Reporte y aprobación del usuario
FASE 4 → Acción (solo con aprobación explícita)
```

---

## FASE 0 — Setup del entorno

Lee [`setup/env-detection.md`](setup/env-detection.md) para el proceso completo.

**Pasos:**
1. Detectar IDE activo (buscar `.kiro/`, `.vscode/`, `.claude/` en el proyecto)
2. Verificar si `@playwright/mcp` está configurado en el IDE
3. Si no está → escribir la config correcta (ver [`setup/mcp-config.md`](setup/mcp-config.md))
4. Verificar si Playwright está instalado → `npx playwright --version`
5. Si no está → instalar (ver [`setup/playwright-setup.md`](setup/playwright-setup.md))
6. Verificar `playwright.config.ts` → si no existe, generarlo según el stack

Informar al usuario cada paso. Si algo falla, explicar qué salió mal antes de continuar.

---

## FASE 1 — Exploración de la app

Lee [`audit/flow-discovery.md`](audit/flow-discovery.md) para el proceso completo.

**Pasos:**
1. Detectar si el servidor de desarrollo está corriendo (probar `localhost:4200`, `3000`, `5173`, `8080`)
2. Si no está corriendo → iniciarlo (`ng serve`, `npm run dev`, `npm start`)
3. Navegar TODAS las pantallas usando las herramientas MCP de browser disponibles
4. Construir mapa completo: rutas, formularios, flujos, mensajes de error exactos

**Herramientas por IDE:**
- Claude Code → `mcp__Claude_in_Chrome__*` / `mcp__Claude_Preview__*`
- Kiro / VS Code → herramientas MCP `playwright` configuradas en Fase 0

---

## FASE 2 — Auditoría de tests existentes

Lee [`audit/gap-analysis.md`](audit/gap-analysis.md) para el proceso completo.

**Pasos:**
1. Encontrar todos los specs: `find . -name "*.spec.ts" -not -path "*/node_modules/*"`
2. Ejecutar suite: `npx playwright test --reporter=list`
3. Leer cada spec para entender qué cubre
4. Cruzar: **flujos de la app** vs **flujos con tests**

---

## FASE 3 — Reporte y aprobación

Lee [`audit/report-format.md`](audit/report-format.md) para el formato exacto.

**Regla crítica:** NUNCA modificar ni escribir tests sin mostrar el reporte y recibir aprobación explícita del usuario.

Clasificación por flujo:
- ✅ Test pasa y está bien escrito → no tocar
- ⚠️ Test pasa pero es frágil → proponer mejora (usuario decide)
- ❌ Test falla → corregir (con aprobación)
- 🔴 Flujo sin tests → escribir (con aprobación)

---

## FASE 4 — Acción

Lee [`writing/test-completion.md`](writing/test-completion.md) para patrones de escritura.

**Reglas:**
- Solo tocar lo que el usuario aprobó en Fase 3
- Usar selectores y textos REALES observados en Fase 1 — nunca adivinarlos
- Después de cada cambio ejecutar `npx playwright test --reporter=list` para confirmar verde
- Generar `reports/playwright-e2e-audit.md` con el resumen final

Al terminar, mostrar:
```
✔ X tests corregidos
✔ Y tests nuevos escritos
✔ Suite completo: Z/Z pasando

Siguiente paso sugerido:
→ /unit-test-review  para revisar también los tests unitarios
```

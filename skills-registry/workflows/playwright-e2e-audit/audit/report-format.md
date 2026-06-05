# Formato del reporte de auditoría

Presentar este reporte ANTES de hacer cualquier cambio. Esperar aprobación explícita.

---

## Estructura del reporte

```
╔══════════════════════════════════════════════╗
║         REPORTE DE AUDITORÍA E2E             ║
╚══════════════════════════════════════════════╝

ENTORNO
───────
IDE:               [Kiro | VS Code | Claude Code]
MCP browser:       [✅ ya estaba | ⚙️ configurado ahora]
Playwright:        [versión]
Stack:             [Angular | React | Next.js]
Base URL:          http://localhost:[puerto]

RESUMEN
───────
Pantallas encontradas:     12
Tests existentes:           8 specs / 23 casos
Tests pasando:             19 ✅
Tests fallando:             4 ❌
Flujos sin tests:           5 🔴

DETALLE POR PANTALLA
────────────────────

/login
  ✅ login exitoso con credenciales válidas
  ✅ error con credenciales inválidas
  ⚠️ selector frágil: .login-btn → proponer getByRole('button', { name: 'Ingresar' })

/dashboard
  ✅ carga post-login
  🔴 Sin tests: cards de resumen, tabla de actividad

/usuarios
  ✅ listado de usuarios
  ❌ FALLA: "crear usuario" — botón cambió de "Guardar" a "Crear"
  🔴 Sin tests: editar usuario, eliminar usuario

/reportes
  🔴 Sin tests (pantalla completa)

PLAN DE ACCIÓN
──────────────

1. ❌ CORREGIR — 4 tests fallando (crítico):
   - /usuarios: actualizar nombre del botón "Guardar" → "Crear"
   - ...

2. 🔴 ESCRIBIR — tests nuevos:
   - /dashboard: cards, tabla de actividad (~4 tests)
   - /usuarios: crear, editar, eliminar (~6 tests)
   - /reportes: flujo completo (~3 tests)
   Estimado: ~13 tests nuevos

3. ⚠️ MEJORAR — opcional, el usuario decide:
   - /login: reemplazar .login-btn por getByRole(...)
   - /perfil: reemplazar waitForTimeout por expect().toBeVisible()

4. ✅ DEJAR IGUAL:
   - /login: login exitoso, error con credenciales
   - /usuarios: listado

──────────────────────────────────────────────
¿Procedo con el plan completo o solo con lo crítico (❌)?
```

---

## Reglas al presentar el reporte

- Mostrar resumen numérico primero
- Agrupar por pantalla, no por tipo de problema
- Para tests fallando: incluir el mensaje de error exacto de Playwright
- Para frágiles: mostrar selector actual → selector propuesto
- Para nuevos tests: listar los flujos que se escribirán (basados en exploración)
- Las mejoras opcionales (⚠️) siempre preguntar antes de aplicar
- No continuar hasta recibir respuesta del usuario

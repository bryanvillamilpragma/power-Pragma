# Descubrimiento de flujos de la app

Navegar con los ojos de un QA: recorrer cada pantalla, interactuar con formularios,
seguir flujos completos. Capturar selectores y textos REALES del DOM.

---

## Paso 1 — Detectar si el servidor está corriendo

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:4200 2>/dev/null || \
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null || \
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173 2>/dev/null || \
echo "DOWN"
```

Si está `DOWN` → iniciar según stack:
- Angular: `ng serve`
- React/Vite: `npm run dev`
- Next.js: `npm run dev`

---

## Paso 2 — Protocolo de exploración

### Por cada pantalla capturar:

**2a. Ruta y título**
- URL exacta: `/login`, `/dashboard`, `/usuarios/lista`
- Heading principal (h1) o título visible

**2b. Elementos interactivos**
- Formularios: labels, placeholders, botón de submit (texto exacto)
- Botones: texto exacto y rol ARIA
- Navegación: links del menú con texto exacto
- Tablas: columnas y acciones por fila

**2c. Flujos a seguir:**
1. **Auth**: ingresar credenciales → verificar redirección
2. **CRUD**: crear → listar → editar → eliminar
3. **Validaciones**: enviar form vacío → leer mensajes de error exactos
4. **Navegación**: ir a cada item del menú principal
5. **Estados vacíos**: ir a listados sin datos

**2d. Anotar para cada flujo:**
- Selectores reales (texto exacto de botones/labels/placeholders)
- Mensajes de error/éxito textuales exactos
- Redirecciones que ocurren
- Cualquier comportamiento inesperado

---

## Paso 3 — Mapa de la app (output)

```
MAPA DE LA APP
==============
/ → redirige a /login si no autenticado

/login
  Inputs:  placeholder="Correo electrónico", type="password"
  Botón:   "Ingresar"
  Éxito:   → /dashboard
  Error:   "Credenciales incorrectas"

/dashboard
  Cards:   4 cards de resumen (Usuarios, Reportes, ...)
  Tabla:   últimas actividades (columnas: Fecha, Usuario, Acción)

/usuarios
  Botón:   "Nuevo usuario"
  Tabla:   columnas [Nombre, Email, Rol, Acciones]
  Acciones por fila: Editar, Eliminar

/usuarios/nuevo
  Labels:  Nombre*, Email*, Rol (select), Activo (checkbox)
  Botón:   "Guardar"
  Errores: "El nombre es requerido", "Email inválido"

... (continuar por cada ruta)
```

---

## Si no hay browser MCP disponible (requiere reinicio del IDE)

Inferir rutas desde el código fuente:

```bash
# Angular — buscar en routing modules
grep -r "path:" src/app --include="*.ts" | grep -v "node_modules" | grep -v "spec"

# React Router
grep -r "<Route" src --include="*.tsx" | grep -v "node_modules"

# Next.js App Router
find src/app -name "page.tsx" | sed 's/src\/app//' | sed 's/\/page.tsx//'
```

Avisar al usuario que la exploración fue por código, no por navegación visual, y que los tests generados deberán verificarse manualmente.

---
name: git-commit
description: Reglas para crear commits siguiendo Conventional Commits 1.0.0. Staging por contexto frontend, título ≤50 chars, cuerpo ≤72 chars.
trigger: always_on
type: rule
inclusion: manual
---

Al realizar un commit, aplica estas reglas sin excepción:

# Reglas para Commits Git — Conventional Commits 1.0.0

## Formato obligatorio

```
<tipo>[ámbito opcional][! opcional]: <descripción>

[cuerpo opcional]

[nota(s) al pie opcional(es)]
```

## Tipos permitidos

| Tipo | Cuándo usarlo |
|---|---|
| `feat` | Nueva funcionalidad → implica MINOR en SemVer |
| `fix` | Corrección de bug → implica PATCH en SemVer |
| `chore` | Mantenimiento, configuración, dependencias |
| `docs` | Solo documentación |
| `style` | Formato, espaciado, sin cambio de lógica |
| `refactor` | Reestructuración sin bug fix ni feature |
| `perf` | Mejora de rendimiento |
| `test` | Añadir o corregir tests |
| `revert` | Revertir commits anteriores |
| `ci` | Cambios en pipelines CI/CD |
| `build` | Sistema de build o dependencias externas |

## Breaking changes

Dos formas válidas, ambas implican MAJOR en SemVer:

```
feat(button)!: rename `label` prop to `children`
```

```
feat(modal): replace `visible` prop with `isOpen`

BREAKING CHANGE: `visible` prop removed — use `isOpen` instead
```

Se pueden combinar ambas:
```
refactor(theme)!: remove legacy CSS variables

BREAKING CHANGE: --color-primary replaced by --color-brand-500
```

## Ámbito (scope)

Sustantivo entre paréntesis que describe el componente, módulo o área afectada:

```
feat(button): add loading state
fix(form): prevent submit on empty required fields
perf(table): virtualize rows for large datasets
style(header): align nav items to baseline grid
refactor(auth): extract login form to own component
test(modal): add unit tests for close behavior
feat(router): add protected route guard
chore(deps): update tailwind to 4.x
```

## Notas al pie (footers)

Formato `Token: valor` o `Token #valor`. Separadas del cuerpo por una línea en blanco:

```
fix(carousel): prevent flicker on fast swipe

Touch events were being handled twice due to passive
listener conflict with the scroll handler.

Refs #287
```

## Reglas de staging — solo los archivos del contexto

Antes de hacer commit, analizar qué archivos coinciden con el contexto indicado:

- "cambios en estilos" → `.scss`, `.css`, `.less`, `.sass`, `*.styled.ts`, `*.styled.tsx`
- "cambios en componentes" → `.tsx`, `.jsx`, `.vue`, `.svelte`
- "cambios en tests" → `*.test.*`, `*.spec.*`
- "cambios en routing" → `*router*`, `*routes*`, `*routing*`
- "cambios en estado/store" → `*store*`, `*slice*`, `*context*`, `*provider*`
- "cambios en rules" → archivos `.md` dentro de carpetas `rules/`
- Si no se especifica contexto → incluir todos los archivos modificados relevantes

NUNCA hacer `git add .` sin antes verificar que todos los archivos staged corresponden al contexto indicado.

## Límites de longitud

- Título (primera línea): máximo 50 caracteres
- Cuerpo y notas al pie: máximo 72 caracteres por línea
- Línea en blanco obligatoria entre título y cuerpo

## Reglas de contenido

- El título debe completar la frase: "Si aplico este commit, este commit _____"
- Usar imperativo: "add", "fix", "update" — no "added", "fixed", "updated"
- NO incluir información obvia al leer el diff
- NO incluir nombres de archivos en el título si el ámbito ya lo comunica
- Cuerpo solo si el "por qué" no es obvio en el diff
- Si el commit abarca múltiples responsabilidades → dividir en commits separados
- NUNCA usar `--no-verify`

## Reglas para IA

- SIEMPRE revisar `git diff --staged` antes de redactar el mensaje
- NUNCA generar un commit con archivos fuera del contexto indicado
- Si el contexto es ambiguo, preguntar antes de hacer staged
- Si los cambios son BREAKING CHANGE, usar `!` y/o footer `BREAKING CHANGE:`

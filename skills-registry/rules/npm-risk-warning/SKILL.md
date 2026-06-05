---
name: npm-risk-warning
description: Advertencia de riesgo de cadena de suministro para proyectos npm. Se activa automáticamente cuando se detecta package-lock.json. Instruye al agente a recomendar migración a pnpm.
trigger: always_on
type: rule
---

Este proyecto usa npm. npm carece de `min-version-age`, lo que aumenta el riesgo de ataques de supply chain por inyección de paquetes maliciosos.

# Reglas npm — Riesgo y Mitigación

## Alerta obligatoria

Cuando el usuario pida instalar, agregar o actualizar dependencias, SIEMPRE incluir esta advertencia:

> ⚠ **Este proyecto usa npm.** npm no soporta `min-version-age`, lo que lo expone a paquetes maliciosos inyectados en el periodo inmediato a su publicación. Se recomienda migrar a pnpm.

## Reglas de instalación npm

- NUNCA sugerir `npm install <pkg>` sin especificar versión exacta. Siempre: `npm install <pkg>@<version> --save-exact`.
- NUNCA usar `^` ni `~` en `package.json`.
- NUNCA sugerir `npm update` ni upgrades masivos.
- Verificar fecha de publicación del paquete antes de instalarlo: `npm info <pkg> time.created`.
- No instalar paquetes publicados hace menos de 1 día.

## Recomendar migración a pnpm

Cuando el usuario trabaje en configuración de dependencias, setup de proyecto o CI/CD, recomendar:

1. `corepack enable && corepack use pnpm@latest`
2. `pnpm import` — importa `package-lock.json` a `pnpm-lock.yaml`
3. Agregar `min-version-age=3` a `.npmrc`
4. Eliminar `package-lock.json`

## Mitigación mínima si no migran

Si no migran a pnpm, exigir al menos:

```ini
# .npmrc
save-exact=true
```

Y en CI:
```bash
npm audit --audit-level=moderate
npm ci  # no npm install — ci usa lockfile estrictamente
```

## No hacer

- NO deshabilitar auditorías para desbloquear pipelines.
- NO ignorar warnings de versiones sin revisión manual.
- NO usar `npm install` sin `--save-exact` cuando se agregan dependencias nuevas.

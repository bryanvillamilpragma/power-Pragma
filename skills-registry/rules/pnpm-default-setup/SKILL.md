---
name: pnpm-default-setup
description: Reglas pnpm para cualquier proyecto — nuevo sin lockfile o existente con pnpm-lock.yaml. Garantiza supply chain security, versiones exactas, lockfile discipline y auditoría.
trigger: always_on
type: rule
---

Usar pnpm como manejador de paquetes. Seguir estas reglas en todo momento.

# Reglas pnpm — Setup & Supply Chain Security

## Manejador de paquetes

- NUNCA sugerir `npm install`, `yarn add` ni `bun add`. Usar siempre `pnpm`.
- Si no existe `pnpm-lock.yaml`, inicializar con `corepack enable && pnpm install` y pedir commit del lockfile.
- Si `package.json` no tiene `packageManager`, agregar: `"packageManager": "pnpm@<version>"` (`pnpm --version`).

## Versiones exactas

- NUNCA usar `^` ni `~`. Solo pins exactos: `"react": "18.3.1"`.
- Al agregar: `pnpm add <pkg>@<exact-version>`.
- NUNCA `npm update`, `npx npm-check-updates` ni upgrades masivos.

## .npmrc

- Todo proyecto pnpm DEBE tener `min-version-age=3` en `.npmrc`.
- Proyectos críticos de producción: `min-version-age=7`.
- Si `.npmrc` no existe, crearlo con esa línea y preguntar al equipo el nivel de criticidad para ajustar el valor del `min-version-age`.

## Lockfile

- `pnpm-lock.yaml` siempre commiteado. NUNCA en `.gitignore`.
- En CI: `pnpm install --frozen-lockfile`.
- NUNCA `--no-lockfile`.

## Nuevas dependencias

- Verificar en npmjs.com antes de instalar: fecha de publicación, descargas, publisher.
- No instalar paquetes publicados hace menos de 1 día.
- Si falla por `ERR_PNPM_MIN_VERSION_AGE`: usar versión anterior estable, no deshabilitar el control salvo que quede absolutamente necesario y se documente la razón. 

## Auditoría

- Incluir `pnpm audit --audit-level=moderate` en pipelines CI.
- Nunca omitir auditorías para desbloquear un pipeline.

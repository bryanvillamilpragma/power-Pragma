# Configuración MCP de browser por IDE

Servidor a usar: `@playwright/mcp` — oficial de Playwright, funciona en Claude Code, Kiro y VS Code con el mismo paquete.

---

## Claude Code — `.claude/settings.json`

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

Si el archivo ya existe, agregar solo el bloque `mcpServers` sin sobreescribir el resto.

---

## Kiro — `.kiro/settings/mcp.json`

```bash
mkdir -p .kiro/settings
```

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

### Steering rule adicional para Kiro

Crear `.kiro/steering/playwright-e2e.md`:

```markdown
---
inclusion: fileMatch
fileMatchPattern: "**/*.spec.ts"
---

# Playwright E2E Testing

Este proyecto usa Playwright para tests E2E. El servidor MCP `playwright` está
configurado para navegación en vivo. Cuando el usuario pida auditar tests,
navegar la app o completar specs faltantes, usa las herramientas del MCP
playwright para explorar primero y luego escribe tests basados en lo observado.
```

---

## VS Code / Copilot — `.vscode/mcp.json`

```json
{
  "servers": {
    "playwright": {
      "type": "stdio",
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

### Instrucciones para Copilot — `.github/copilot-instructions.md`

Crear o agregar al final del archivo:

```markdown
## Playwright E2E Testing

El servidor MCP `playwright` está configurado. Cuando el dev pida auditar,
completar o verificar tests E2E:

1. Usar herramientas MCP playwright para navegar la app en vivo
2. Mapear rutas y flujos encontrados
3. Comparar contra specs existentes en `e2e/`
4. Reportar gaps antes de escribir código
5. Escribir tests con selectores basados en lo observado
6. Ejecutar `npx playwright test` para confirmar que pasan
```

---

## Después de configurar — avisar al usuario

> "Configuré el MCP de Playwright en [archivo]. **Debes reiniciar [IDE] para que tome efecto.**
> Una vez reiniciado, las herramientas de navegación estarán disponibles."

---

## Solución de problemas

| Problema | Causa | Solución |
|---|---|---|
| MCP no aparece tras reiniciar | `npx` no en PATH | Usar ruta absoluta: `"command": "/usr/local/bin/npx"` |
| Error `Cannot find @playwright/mcp` | npm desactualizado | `npm i -g @playwright/mcp` y cambiar command a `playwright-mcp` |
| Kiro no lee `mcp.json` | Directorio no existe | `mkdir -p .kiro/settings` |
| VS Code no detecta el servidor | VS Code < 1.99 | Actualizar VS Code |

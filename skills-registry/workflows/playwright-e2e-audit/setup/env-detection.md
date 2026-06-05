# Detección de entorno

## Paso 1 — Identificar el IDE activo

```bash
[ -d ".kiro" ]   && echo "KIRO"         || true
[ -d ".vscode" ] && echo "VSCODE"       || true
[ -d ".claude" ] && echo "CLAUDE_CODE"  || true
```

| Condición | IDE detectado |
|---|---|
| Existe `.kiro/` | Kiro |
| Existe `.vscode/` (sin `.kiro/`) | VS Code / Copilot |
| Existe `.claude/` (sin los anteriores) | Claude Code |
| Ninguno existe | Crear `.claude/` → Claude Code por defecto |

---

## Paso 2 — Verificar MCP de browser

### Claude Code
```bash
cat .claude/settings.json 2>/dev/null | grep -i "playwright" || echo "NO_MCP"
cat ~/.claude/settings.json 2>/dev/null | grep -i "playwright" || echo "NO_MCP_GLOBAL"
```

### Kiro
```bash
cat .kiro/settings/mcp.json 2>/dev/null | grep -i "playwright" || echo "NO_MCP"
```

### VS Code
```bash
cat .vscode/mcp.json 2>/dev/null | grep -i "playwright" || echo "NO_MCP"
```

Si el output es `NO_MCP` → ir a `setup/mcp-config.md`.

---

## Paso 3 — Verificar Playwright instalado

```bash
npx playwright --version 2>/dev/null || echo "NOT_INSTALLED"
```

Si `NOT_INSTALLED` → ir a `setup/playwright-setup.md`.

---

## Paso 4 — Verificar playwright.config.ts

```bash
ls playwright.config.* 2>/dev/null || echo "NO_CONFIG"
```

Si `NO_CONFIG` → ir a `setup/playwright-setup.md` sección "Generar config".

---

## Resumen del estado del entorno

Reportar al usuario antes de pasar a Fase 1:

```
Entorno detectado: [Kiro | VS Code | Claude Code]
MCP de browser:    [✅ configurado | ⚙️ configurando ahora...]
Playwright:        [✅ v1.x.x | ⚙️ instalando ahora...]
playwright.config: [✅ existe | ⚙️ generando ahora...]
```

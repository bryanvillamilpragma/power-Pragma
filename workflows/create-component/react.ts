import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cyan, dim, green, yellow, log, write } from "../../colors.js";
import {
  type WorkflowContext,
  askImagePath,
  askOption,
  askText,
  toKebabCase,
  toPascalCase,
} from "../runner.js";
import { callLLM, getApiKey, imageToContent, parseJSONResponse, type LLMContent } from "../llm.js";
import { collectProjectContext, type ProjectContext } from "../context-collector.js";

// ── Constructores de contenido ────────────────────────────────

function buildPageWithHook(className: string): string {
  return `import { use${className} } from './use${className}';

export function ${className}() {
  const { isLoading, error, data } = use${className}();

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div>
      {/* ${className} */}
    </div>
  );
}
`;
}

function buildPageWithoutHook(className: string): string {
  return `export function ${className}() {
  return (
    <div>
      {/* ${className} */}
    </div>
  );
}
`;
}

function buildUiComponent(className: string): string {
  return `interface Props {
  // definir props
}

export function ${className}({ }: Props) {
  return (
    <div>
      {/* ${className} */}
    </div>
  );
}
`;
}

function buildSharedComponent(className: string): string {
  return `interface Props {
  children?: React.ReactNode;
  className?: string;
}

export function ${className}({ children, className }: Props) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}
`;
}

function buildReactSpec(className: string): string {
  return `import { render, screen } from '@testing-library/react';
import { ${className} } from './${className}';

describe('${className}', () => {
  it('should render without errors', () => {
    render(<${className} />);
    expect(document.querySelector('div')).toBeInTheDocument();
  });
});
`;
}

function buildHook(className: string): string {
  return `import { useState } from 'react';

export function use${className}() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState(null);

  return { isLoading, error, data };
}
`;
}

function buildHookSpec(className: string): string {
  return `import { renderHook } from '@testing-library/react';
import { use${className} } from './use${className}';

describe('use${className}', () => {
  it('should initialize with default state', () => {
    const { result } = renderHook(() => use${className}());
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
`;
}

// ── Rama principal ────────────────────────────────────────────

export async function runReact(ctx: WorkflowContext): Promise<void> {
  const { projectDir, rl } = ctx;

  // P1 — nombre
  const rawName = await askText(rl, "¿Cómo se llama el componente?", "PaymentForm");
  const className = toPascalCase(rawName);

  // P2 — tipo
  const typeIdx = await askOption(rl, "¿Qué tipo de componente es?", [
    "page / view — componente de ruta, puede tener fetching de datos",
    "componente de UI — recibe props, no tiene lógica de negocio",
    "shared / reutilizable — componente genérico de design system",
  ]);
  const typeMap = ["page", "ui", "shared"] as const;
  const type = typeMap[typeIdx];

  let needsHook = false;
  if (type === "page") {
    const hookIdx = await askOption(rl, "¿Necesita hook propio para manejar su estado?", [
      "sí — tiene loading, error, datos o lógica compleja",
      "no — estado simple con useState local",
    ]);
    needsHook = hookIdx === 0;
  }

  // P3 — carpeta destino
  const candidates = ["src/components", "src/pages", "src/views", "src/features"].filter((p) =>
    existsSync(join(projectDir, p)),
  );

  let targetFolder: string;
  if (candidates.length === 0) {
    targetFolder = type === "page" ? "src/pages" : "src/components";
    log("");
    log(dim(`  No se encontraron carpetas existentes. Se usará: ${targetFolder}`));
  } else {
    const opts = [...candidates, "+ crear carpeta nueva"];
    const idx = await askOption(rl, "¿Dónde va el componente?", opts);
    if (idx === opts.length - 1) {
      const raw = await askText(rl, "Ruta relativa desde la raíz:", "src/features/payments");
      targetFolder = raw.startsWith("src/") ? raw : `src/${raw}`;
    } else {
      targetFolder = candidates[idx];
    }
  }

  const targetDir = join(projectDir, targetFolder, className);
  const relTarget = join(targetFolder, className);

  // Imagen de referencia (solo si hay API key)
  let screenshotPath: string | null = null;
  if (getApiKey()) {
    screenshotPath = await askImagePath(rl, projectDir);
  } else {
    log("");
    log(dim("  💡 Tip: agrega ANTHROPIC_API_KEY a tu .env para generar desde imagen"));
  }

  // Construir archivos
  const files: Array<{ rel: string; content: string }> = [];

  let componentContent: string;
  if (type === "page" && needsHook) {
    componentContent = buildPageWithHook(className);
  } else if (type === "ui") {
    componentContent = buildUiComponent(className);
  } else if (type === "shared") {
    componentContent = buildSharedComponent(className);
  } else {
    componentContent = buildPageWithoutHook(className);
  }

  files.push({ rel: `${className}.tsx`, content: componentContent });
  files.push({ rel: `${className}.test.tsx`, content: buildReactSpec(className) });

  if (type === "page" && needsHook) {
    files.push({ rel: `use${className}.ts`, content: buildHook(className) });
    files.push({ rel: `use${className}.test.ts`, content: buildHookSpec(className) });
  }

  // Confirmación
  log("");
  log(yellow("  ◆ Se van a generar estos archivos:"));
  log("");
  log(dim(`  ${relTarget}/`));
  for (const f of files) {
    log(green("    +") + " " + f.rel);
  }
  log("");

  const confirmIdx = await askOption(rl, "¿Confirmar y generar?", [
    "sí, generar",
    "cancelar",
  ]);

  if (confirmIdx === 1) {
    log("");
    log(dim("  Cancelado."));
    return;
  }

  // ── Generar ───────────────────────────────────────────────

  if (getApiKey()) {
    log("");
    write(cyan("  ◆ Generando con IA") + dim(screenshotPath ? " (con imagen)..." : "...") + "\r");

    const ctx = collectProjectContext(projectDir, className, type === "page", ["react"]);

    const generated = await generateReactWithLLM({
      className,
      type,
      needsHook,
      screenshotPath: screenshotPath ?? undefined,
      context: ctx,
    });

    write("\x1b[K");

    if (generated && generated.length > 0) {
      mkdirSync(targetDir, { recursive: true });
      for (const f of generated) {
        writeFileSync(join(targetDir, f.rel), f.content, "utf-8");
        log(green("  ✔") + " " + join(relTarget, f.rel));
      }
      log("");
      log(green(`  ✔ ${generated.length} archivos generados con IA`));
      log("");
      log(dim("  Siguientes pasos:"));
      log(dim("  ›") + " " + cyan("npx autoskills-pragma unit-test-review") + dim("  — revisar tests"));
      log("");
      return;
    }

    log(yellow("  ⚠ Generación con IA falló. Usando plantilla base..."));
    log("");
  }

  // Fallback
  mkdirSync(targetDir, { recursive: true });
  for (const f of files) {
    writeFileSync(join(targetDir, f.rel), f.content, "utf-8");
    log(green("  ✔") + " " + join(relTarget, f.rel));
  }
  log("");
  log(green(`  ✔ ${files.length} archivos generados`));
  log("");
  log(dim("  Siguientes pasos:"));
  log(dim("  ›") + " " + cyan("npx autoskills-pragma unit-test-review") + dim("  — revisar tests"));
  log("");
}

// ── Tipos ─────────────────────────────────────────────────────

interface GeneratedFile {
  rel: string;
  content: string;
}

interface GenerateReactOptions {
  className: string;
  type: "page" | "ui" | "shared";
  needsHook: boolean;
  screenshotPath?: string;
  context: ProjectContext;
}

// ── System prompt ─────────────────────────────────────────────

const REACT_SYSTEM_PROMPT = `Eres un experto en React con TypeScript moderno.
Generas código React de alta calidad siguiendo las convenciones del equipo.

REGLAS OBLIGATORIAS:
- Componentes funcionales únicamente, nunca clases
- TypeScript estricto — siempre interface Props
- Named exports, no default exports
- Hooks para lógica de estado
- Tests con React Testing Library — nunca querySelector directo
- userEvent para interacciones, no fireEvent

FORMATO DE RESPUESTA:
Responde ÚNICAMENTE con JSON válido, sin markdown fences, sin texto antes o después:
{
  "files": [
    { "rel": "NombreComponente.tsx", "content": "código completo aquí" },
    { "rel": "NombreComponente.test.tsx", "content": "spec completo aquí" }
  ]
}

Genera código REAL y FUNCIONAL. Sin placeholders, sin TODO.`;

// ── Prompt builder ────────────────────────────────────────────

function buildReactPrompt(opts: GenerateReactOptions & { hasImage: boolean }): string {
  const { className, type, needsHook, context, hasImage } = opts;

  const lines: string[] = [];
  lines.push(`Crea el componente React "${className}" con estas especificaciones:`);
  lines.push("");
  lines.push("## Componente");
  lines.push(`- Nombre: ${className}`);
  lines.push(`- Tipo: ${type}`);
  lines.push(`- Hook propio: ${needsHook ? "sí" : "no"}`);

  if (hasImage) {
    lines.push("");
    lines.push("## Diseño visual");
    lines.push("La imagen adjunta muestra el diseño a implementar.");
    lines.push("El JSX debe ser fiel al diseño usando los componentes del design system.");
  }

  lines.push("");
  lines.push("## Stack");
  lines.push(context.stack.join(", "));

  if (context.designSystem) {
    lines.push("");
    lines.push("## Design system");
    lines.push(`Usar ${context.designSystem}.`);
  }

  if (context.similarComponents.length > 0) {
    lines.push("");
    lines.push("## Referencia de estilo del equipo");
    for (const sc of context.similarComponents) {
      lines.push(`\n### ${sc.name}\n\`\`\`tsx\n${sc.content}\n\`\`\``);
    }
  }

  if (context.conventions.length > 0) {
    lines.push("");
    lines.push("## Convenciones");
    for (const c of context.conventions) lines.push(`- ${c}`);
  }

  lines.push("");
  lines.push("## Archivos a generar");
  lines.push(`- ${className}.tsx`);
  lines.push(`- ${className}.test.tsx`);
  if (needsHook) {
    lines.push(`- use${className}.ts`);
    lines.push(`- use${className}.test.ts`);
  }

  lines.push("");
  lines.push("Responde SOLO con el JSON. Sin explicaciones.");

  return lines.join("\n");
}

// ── Generador ─────────────────────────────────────────────────

async function generateReactWithLLM(
  opts: GenerateReactOptions,
): Promise<GeneratedFile[] | null> {
  const content: LLMContent[] = [];

  if (opts.screenshotPath) {
    const img = imageToContent(opts.screenshotPath);
    if (img) content.push(img);
  }

  content.push({
    type: "text",
    text: buildReactPrompt({ ...opts, hasImage: !!opts.screenshotPath }),
  });

  const result = await callLLM(
    [{ role: "user", content }],
    { system: REACT_SYSTEM_PROMPT, maxTokens: 8000 },
  );

  if (!result.ok) return null;

  const parsed = parseJSONResponse<{ files: GeneratedFile[] }>(result.text);
  if (!parsed?.files?.length) return null;

  return parsed.files.filter(
    (f) =>
      typeof f.rel === "string" &&
      typeof f.content === "string" &&
      f.rel.length > 0 &&
      f.content.length > 10,
  );
}

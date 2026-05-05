import { existsSync } from "node:fs";
import { createInterface } from "node:readline";
import { resolve } from "node:path";
import { bold, cyan, dim, green, red, yellow, log, write } from "../colors.js";
import { detectTechnologies } from "../lib.js";

// ── Tipos públicos ────────────────────────────────────────────

export interface WorkflowContext {
  projectDir: string;
  detectedIds: string[];
  rl: ReturnType<typeof createInterface>;
}

export type WorkflowBranch = (ctx: WorkflowContext) => Promise<void>;

export interface WorkflowDefinition {
  name: string;
  description: string;
  stacks: Array<{
    requires: string[];
    branch: WorkflowBranch;
  }>;
}

// ── Helpers de UI — exportados para usar en las ramas ────────

export function askText(
  rl: ReturnType<typeof createInterface>,
  question: string,
  placeholder: string,
): Promise<string> {
  return new Promise((resolve) => {
    log("");
    log(cyan("  ?") + " " + bold(question) + dim(` (ej: ${placeholder})`));
    log("");
    const tryAsk = () => {
      rl.question(dim("  › "), (raw) => {
        const trimmed = raw.trim();
        if (trimmed.length > 0) {
          resolve(trimmed);
        } else {
          write(red("  No puede estar vacío. Intenta de nuevo.\n"));
          tryAsk();
        }
      });
    };
    tryAsk();
  });
}

export function askOption(
  rl: ReturnType<typeof createInterface>,
  question: string,
  options: string[],
): Promise<number> {
  return new Promise((resolve) => {
    log("");
    log(cyan("  ?") + " " + bold(question));
    options.forEach((opt, i) => log(dim(`    [${i + 1}]`) + " " + opt));
    log("");
    const tryAsk = () => {
      rl.question(dim("  › "), (raw) => {
        const num = parseInt(raw.trim(), 10);
        if (num >= 1 && num <= options.length) {
          resolve(num - 1);
        } else {
          write(red(`  Opción inválida. Ingresa un número entre 1 y ${options.length}.\n`));
          tryAsk();
        }
      });
    };
    tryAsk();
  });
}

// ── Helpers de nombre — exportados para tests ────────────────

export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");
}

export function toPascalCase(str: string): string {
  return toKebabCase(str)
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

// ── Helper de imagen — drag & drop ───────────────────────────

/**
 * Pregunta al dev si tiene imagen de referencia.
 * Soporta drag & drop — el dev arrastra el archivo al terminal
 * y el OS convierte el drag en la ruta absoluta automáticamente.
 * Retorna la ruta absoluta validada, o null si no hay imagen.
 */
export async function askImagePath(
  rl: ReturnType<typeof createInterface>,
  projectDir: string,
): Promise<string | null> {
  const hasImage = await askOption(rl, "¿Tienes imagen de referencia del diseño?", [
    "sí — tengo un PNG, JPG o WebP",
    "no — continuar sin imagen",
  ]);

  if (hasImage === 1) return null;

  log("");
  log(cyan("  ?") + " " + bold("Arrastra la imagen aquí o escribe la ruta:"));
  log(dim("  Tip: arrastra el archivo PNG/JPG desde tu explorador al terminal y presiona Enter"));
  log("");

  const SUPPORTED = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);

  for (let attempt = 0; attempt < 3; attempt++) {
    const raw = await new Promise<string>((res) => rl.question(dim("  › "), res));

    // Limpiar la ruta — el drag & drop puede agregar comillas o espacios
    // en algunos sistemas (macOS Terminal agrega comillas si hay espacios)
    const cleaned = raw.trim().replace(/^['"]|['"]$/g, "");

    if (!cleaned) {
      write(red("  Ruta vacía. Intenta de nuevo.\n"));
      continue;
    }

    // Resolver ruta relativa o absoluta
    const absPath = cleaned.startsWith("/") || cleaned.match(/^[A-Za-z]:\\/)
      ? cleaned
      : resolve(projectDir, cleaned);

    // Validar extensión
    const ext = absPath.toLowerCase().slice(absPath.lastIndexOf("."));
    if (!SUPPORTED.has(ext)) {
      write(red(`  Formato no soportado: ${ext}. Usa PNG, JPG, JPEG, WebP o GIF.\n`));
      continue;
    }

    // Validar que existe
    if (!existsSync(absPath)) {
      write(red(`  Archivo no encontrado: ${absPath}\n`));
      if (attempt < 2) write(dim("  Intenta de nuevo o presiona Enter para continuar sin imagen.\n"));
      continue;
    }

    log(green("  ✔") + dim(` imagen: ${cleaned}`));
    return absPath;
  }

  log(yellow("  Continuando sin imagen de referencia."));
  return null;
}

// ── Motor principal ───────────────────────────────────────────

export async function runWorkflow(workflow: WorkflowDefinition): Promise<void> {
  const projectDir = resolve(".");
  const { detected } = detectTechnologies(projectDir);
  const detectedIds = detected.map((t) => t.id);

  const match = workflow.stacks.find((s) =>
    s.requires.every((req) => detectedIds.includes(req)),
  );

  if (!match) {
    log("");
    log(yellow(`  ⚠ El workflow "${workflow.name}" no está disponible para este stack.`));
    log(dim(`  Stack detectado: ${detectedIds.join(", ") || "ninguno"}`));
    log(
      dim(
        `  Stacks soportados: ${workflow.stacks.map((s) => s.requires.join(" + ")).join(" | ")}`,
      ),
    );
    log("");
    process.exit(0);
  }

  log("");
  log(
    cyan(`  ◆ Workflow: ${workflow.name}`) +
      dim(`  [${match.requires.join(" + ")}]`),
  );
  log("");

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    await match.branch({ projectDir, detectedIds, rl });
  } finally {
    rl.close();
  }
}

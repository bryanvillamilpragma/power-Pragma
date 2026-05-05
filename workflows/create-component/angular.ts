import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
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

// ── Helpers internos ─────────────────────────────────────────

function scanFolders(basePath: string): string[] {
  if (!existsSync(basePath)) return [];
  return readdirSync(basePath, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

// ── Constructores de contenido ────────────────────────────────

function buildComponentTs(opts: {
  name: string;
  className: string;
  type: "page" | "presentacional" | "shared";
  needsViewModel: boolean;
  formType: "reactive" | "template" | "none";
}): string {
  const { name, className, type, needsViewModel, formType } = opts;

  const coreImports = ["Component"];
  if (type === "page") coreImports.push("OnInit");
  if (needsViewModel || formType !== "none") coreImports.push("inject");

  const ngImports: string[] = ["CommonModule"];
  const extraImports: string[] = [];

  if (formType === "reactive") {
    ngImports.push("ReactiveFormsModule");
    extraImports.push(`import { FormGroup, ReactiveFormsModule } from '@angular/forms';`);
  }
  if (formType === "template") {
    ngImports.push("FormsModule");
    extraImports.push(`import { FormsModule } from '@angular/forms';`);
  }
  if (needsViewModel) {
    extraImports.push(
      `import { ${className}ViewModel } from './${name}.view-model';`,
    );
  }

  let out = `import { ${coreImports.join(", ")} } from '@angular/core';\n`;
  out += `import { CommonModule } from '@angular/common';\n`;
  if (extraImports.length) out += extraImports.join("\n") + "\n";
  out += "\n";
  out += `@Component({\n`;
  out += `  selector: 'app-${name}',\n`;
  out += `  standalone: true,\n`;
  out += `  imports: [${ngImports.join(", ")}],\n`;
  out += `  templateUrl: './${name}.component.html',\n`;
  out += `})\n`;

  if (type === "page") {
    out += `export class ${className}Component implements OnInit {\n`;
    if (needsViewModel) {
      out += `  protected readonly vm = inject(${className}ViewModel);\n`;
    }
    if (formType === "reactive") {
      out += `  protected readonly form = new FormGroup({});\n`;
    }
    out += `\n  ngOnInit(): void {\n    // inicialización\n  }\n}\n`;
  } else if (type === "presentacional") {
    out += `export class ${className}Component {\n`;
    out += `  // Ejemplo: readonly title = input.required<string>();\n`;
    out += `  // Ejemplo: readonly action = output<void>();\n`;
    out += `}\n`;
  } else {
    out += `export class ${className}Component {\n`;
    out += `  // Ejemplo: readonly label = input<string>('');\n`;
    out += `}\n`;
  }

  return out;
}

function buildComponentHtml(name: string, className: string): string {
  return `<div class="${name}">\n  <!-- ${className}Component -->\n</div>\n`;
}

function buildComponentSpec(name: string, className: string): string {
  return `import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ${className}Component } from './${name}.component';

describe('${className}Component', () => {
  let component: ${className}Component;
  let fixture: ComponentFixture<${className}Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [${className}Component],
    }).compileComponents();

    fixture = TestBed.createComponent(${className}Component);
    component = fixture.componentInstance;
  });

  it('should create', async () => {
    await fixture.whenStable();
    expect(component).toBeTruthy();
  });
});
`;
}

function buildViewModelTs(name: string, className: string): string {
  return `import { Injectable, signal, computed } from '@angular/core';

@Injectable()
export class ${className}ViewModel {
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly hasError = computed(() => this.error() !== null);
}
`;
}

function buildViewModelSpec(name: string, className: string): string {
  return `import { TestBed } from '@angular/core/testing';
import { ${className}ViewModel } from './${name}.view-model';

describe('${className}ViewModel', () => {
  let vm: ${className}ViewModel;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [${className}ViewModel],
    });
    vm = TestBed.inject(${className}ViewModel);
  });

  it('should initialize with default state', () => {
    expect(vm.isLoading()).toBe(false);
    expect(vm.error()).toBeNull();
    expect(vm.hasError()).toBe(false);
  });
});
`;
}

// ── Rama principal ────────────────────────────────────────────

export async function runAngularCleanArch(ctx: WorkflowContext): Promise<void> {
  const { projectDir, rl } = ctx;

  // P1 — nombre
  const rawName = await askText(rl, "¿Cómo se llama el componente?", "PaymentForm");
  const name = toKebabCase(rawName);
  const className = toPascalCase(rawName);

  // P2 — tipo
  const typeIdx = await askOption(rl, "¿Qué tipo de componente es?", [
    "page (smart) — tiene lógica, se conecta a ViewModels o UseCases",
    "presentacional (dumb) — solo recibe @Input() y emite @Output()",
    "shared / reutilizable — componente de UI genérico",
  ]);
  const typeMap = ["page", "presentacional", "shared"] as const;
  const type = typeMap[typeIdx];

  let feature: string | undefined;
  let needsViewModel = false;
  let formType: "reactive" | "template" | "none" = "none";

  if (type === "page") {
    // P3 — feature
    const pagesBase = join(projectDir, "src", "app", "presentation", "pages");
    const existing = scanFolders(pagesBase);
    const opts = [...existing, "+ crear nueva feature"];
    const idx = await askOption(rl, "¿En qué feature va?", opts);

    if (idx === opts.length - 1) {
      const raw = await askText(rl, "Nombre de la nueva feature:", "payments");
      feature = toKebabCase(raw);
    } else {
      feature = existing[idx];
    }

    // P4 — ViewModel
    const vmIdx = await askOption(rl, "¿Necesita ViewModel propio?", [
      "sí — tiene estado y lógica propios",
      "no — usa el ViewModel existente de la feature",
    ]);
    needsViewModel = vmIdx === 0;
  }

  if (type === "page" || type === "presentacional") {
    // P5 — formulario
    const formIdx = await askOption(rl, "¿El componente maneja un formulario?", [
      "sí, reactivo (ReactiveFormsModule)",
      "sí, template-driven (FormsModule)",
      "no",
    ]);
    formType = (["reactive", "template", "none"] as const)[formIdx];
  }

  // P6 — Imagen de referencia (solo si hay API key disponible)
  let screenshotPath: string | null = null;
  if (getApiKey()) {
    screenshotPath = await askImagePath(rl, projectDir);
  } else {
    log("");
    log(dim("  💡 Tip: agrega ANTHROPIC_API_KEY a tu .env para generar desde imagen"));
  }

  // Calcular ruta destino
  let targetDir: string;
  if (type === "page" && feature) {
    targetDir = join(projectDir, "src", "app", "presentation", "pages", feature, name);
  } else if (type === "presentacional") {
    targetDir = join(projectDir, "src", "app", "presentation", "components", name);
  } else {
    targetDir = join(projectDir, "src", "app", "presentation", "components", "shared", name);
  }

  // Construir lista de archivos
  const files: Array<{ rel: string; content: string }> = [
    {
      rel: `${name}.component.ts`,
      content: buildComponentTs({ name, className, type, needsViewModel, formType }),
    },
    {
      rel: `${name}.component.html`,
      content: buildComponentHtml(name, className),
    },
    {
      rel: `${name}.component.spec.ts`,
      content: buildComponentSpec(name, className),
    },
  ];

  if (type === "page" && needsViewModel) {
    files.push({ rel: `${name}.view-model.ts`, content: buildViewModelTs(name, className) });
    files.push({ rel: `${name}.view-model.spec.ts`, content: buildViewModelSpec(name, className) });
  }

  // Confirmación
  const relTarget = targetDir.replace(projectDir + "/", "");
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

  // Intentar con LLM si hay API key
  if (getApiKey()) {
    log("");
    write(cyan("  ◆ Generando con IA") + dim(screenshotPath ? " (con imagen)..." : "...") + "\r");

    const isPage = type === "page";
    const ctx = collectProjectContext(projectDir, name, isPage, ["angular", "clean-architecture-uml"]);

    const generated = await generateAngularWithLLM({
      name,
      className,
      type,
      needsViewModel,
      formType,
      screenshotPath: screenshotPath ?? undefined,
      context: ctx,
    });

    write("\x1b[K"); // limpiar línea del spinner

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

  // Fallback — plantillas base
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

// ── Tipos internos ────────────────────────────────────────────

interface GeneratedFile {
  rel: string;
  content: string;
}

interface GenerateAngularOptions {
  name: string;
  className: string;
  type: "page" | "presentacional" | "shared";
  needsViewModel: boolean;
  formType: "reactive" | "template" | "none";
  screenshotPath?: string;
  context: ProjectContext;
}

// ── System prompt ─────────────────────────────────────────────

const ANGULAR_SYSTEM_PROMPT = `Eres un experto en Angular con Clean Architecture. \
Generas código TypeScript/Angular de alta calidad siguiendo las convenciones del equipo.

REGLAS OBLIGATORIAS:
- Siempre usar inject() — NUNCA constructor DI
- Siempre standalone: true en componentes
- Signals para todo estado: signal(), computed(), effect()
- Tests: await fixture.whenStable() — NUNCA fixture.detectChanges()
- No importar infrastructure desde presentation

FORMATO DE RESPUESTA:
Responde ÚNICAMENTE con JSON válido, sin markdown fences, sin texto antes o después:
{
  "files": [
    { "rel": "nombre.component.ts", "content": "código completo aquí" },
    { "rel": "nombre.component.html", "content": "template completo aquí" },
    { "rel": "nombre.component.spec.ts", "content": "spec completo aquí" }
  ]
}

Genera código REAL y FUNCIONAL. Sin placeholders, sin TODO, sin código incompleto.`;

// ── Prompt builder ────────────────────────────────────────────

function buildAngularPrompt(opts: GenerateAngularOptions & { hasImage: boolean }): string {
  const { name, className, type, needsViewModel, formType, context, hasImage } = opts;

  const lines: string[] = [];

  lines.push(`Crea el componente Angular "${className}" con estas especificaciones:`);
  lines.push("");
  lines.push("## Componente");
  lines.push(`- Archivo: ${name}.component.ts`);
  lines.push(`- Tipo: ${type}`);
  lines.push(`- ViewModel propio: ${needsViewModel ? "sí" : "no"}`);
  lines.push(`- Formulario: ${formType}`);

  if (hasImage) {
    lines.push("");
    lines.push("## Diseño visual");
    lines.push("La imagen adjunta muestra el diseño a implementar.");
    lines.push("Analiza el layout, campos, botones, colores y estructura.");
    lines.push("El template HTML debe ser fiel al diseño usando los componentes del design system.");
  }

  lines.push("");
  lines.push("## Stack");
  lines.push(context.stack.join(", "));

  if (context.designSystem) {
    lines.push("");
    lines.push("## Design system");
    lines.push(`Usar ${context.designSystem} para todos los elementos de UI.`);
    lines.push("No usar elementos HTML nativos si existe un componente del design system equivalente.");
  }

  if (context.domainModels.length > 0) {
    lines.push("");
    lines.push("## Modelos de dominio disponibles");
    lines.push("Usa estas interfaces para tipar el componente y sus datos:");
    for (const m of context.domainModels) {
      lines.push(`\n### ${m.name}\n\`\`\`typescript\n${m.content}\n\`\`\``);
    }
  }

  if (context.useCases.length > 0) {
    lines.push("");
    lines.push("## UseCases disponibles");
    lines.push("Inyecta y usa estos use cases en el componente:");
    for (const uc of context.useCases) {
      lines.push(`\n### ${uc.name}\n\`\`\`typescript\n${uc.content}\n\`\`\``);
    }
  }

  if (context.similarComponents.length > 0) {
    lines.push("");
    lines.push("## Referencia de estilo del equipo");
    lines.push("IMPORTANTE: genera el nuevo componente con el MISMO estilo que estos:");
    for (const sc of context.similarComponents) {
      lines.push(`\n### ${sc.name}\n\`\`\`typescript\n${sc.content}\n\`\`\``);
    }
  }

  if (context.conventions.length > 0) {
    lines.push("");
    lines.push("## Convenciones del equipo");
    for (const c of context.conventions) lines.push(`- ${c}`);
  }

  lines.push("");
  lines.push("## Archivos a generar");
  lines.push(`- ${name}.component.ts`);
  lines.push(`- ${name}.component.html`);
  lines.push(`- ${name}.component.spec.ts`);
  if (needsViewModel) {
    lines.push(`- ${name}.view-model.ts`);
    lines.push(`- ${name}.view-model.spec.ts`);
  }

  lines.push("");
  lines.push("Responde SOLO con el JSON. Sin explicaciones.");

  return lines.join("\n");
}

// ── Generador principal ───────────────────────────────────────

async function generateAngularWithLLM(
  opts: GenerateAngularOptions,
): Promise<GeneratedFile[] | null> {
  const content: LLMContent[] = [];

  if (opts.screenshotPath) {
    const img = imageToContent(opts.screenshotPath);
    if (img) content.push(img);
  }

  content.push({
    type: "text",
    text: buildAngularPrompt({ ...opts, hasImage: !!opts.screenshotPath }),
  });

  const result = await callLLM(
    [{ role: "user", content }],
    { system: ANGULAR_SYSTEM_PROMPT, maxTokens: 8000 },
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

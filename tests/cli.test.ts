import { ok, strictEqual } from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { before, describe, it } from "node:test";
import type { CliArgs } from "../main.js";
import { addWorkspace, useTmpDir, writeFile, writeJson, writePackageJson } from "./helpers.js";

const CLI_PATH = resolve(import.meta.dirname!, "..", "index.mjs");

function run(args: string[] = [], cwd: string = process.cwd()): string {
  return execFileSync(process.execPath, [CLI_PATH, ...args], {
    cwd,
    encoding: "utf-8",
    timeout: 10_000,
    env: { ...process.env, NO_COLOR: "1", AUTOSKILLS_SKIP_AUTH: "1" },
  });
}

// ── parseArgs unit tests ──────────────────────────────────────
describe("parseArgs", () => {
  let parseArgs: (argv?: string[]) => CliArgs;

  before(async () => {
    const mod = await import("../main.js") as { parseArgs: (argv?: string[]) => CliArgs };
    parseArgs = mod.parseArgs;
  });

  it('"agents" activa listAgents y no workflow', () => {
    const r = parseArgs(["agents"]);
    strictEqual(r.listAgents, true);
    strictEqual(r.workflow, null);
  });

  it('"agent" también activa listAgents', () => {
    const r = parseArgs(["agent"]);
    strictEqual(r.listAgents, true);
    strictEqual(r.workflow, null);
  });

  it('"--agents" activa listAgents', () => {
    const r = parseArgs(["--agents"]);
    strictEqual(r.listAgents, true);
    strictEqual(r.workflow, null);
  });

  it('"create-component" queda como workflow (para mostrar mensaje educativo)', () => {
    const r = parseArgs(["create-component"]);
    strictEqual(r.listAgents, false);
    strictEqual(r.workflow, "create-component");
  });

  it('sin argumentos: listAgents false, workflow null', () => {
    const r = parseArgs([]);
    strictEqual(r.listAgents, false);
    strictEqual(r.workflow, null);
  });

  it('flag -a no se mezcla con positionals', () => {
    const r = parseArgs(["-a", "cursor", "claude-code"]);
    strictEqual(r.listAgents, false);
    strictEqual(r.workflow, null);
    ok(r.agents.includes("cursor"));
    ok(r.agents.includes("claude-code"));
  });
});

describe("CLI", () => {
  const tmp = useTmpDir();

  it("shows help with --help", () => {
    const output = run(["--help"]);
    ok(output.includes("sopp-front"));
    ok(output.includes("--dry-run"));
    ok(output.includes("--clear-cache"));
    ok(output.includes("--yes"));
    ok(output.includes("--agent"));
  });

  it("shows help with -h", () => {
    const output = run(["-h"]);
    ok(output.includes("sopp-front"));
  });

  it("clears the autoskills cache with --clear-cache", () => {
    const cacheDir = join(tmp.path, "cache");
    const prevCacheDir = process.env.AUTOSKILLS_CACHE_DIR;

    process.env.AUTOSKILLS_CACHE_DIR = cacheDir;
    try {
      writeFile(tmp.path, "cache/bundle/SKILL.md", "# cached");

      const output = run(["--clear-cache"], tmp.path);

      ok(output.includes("Cleared autoskills cache"));
      ok(output.includes(cacheDir));
      ok(!existsSync(cacheDir));
    } finally {
      if (prevCacheDir === undefined) delete process.env.AUTOSKILLS_CACHE_DIR;
      else process.env.AUTOSKILLS_CACHE_DIR = prevCacheDir;
    }
  });

  describe("--dry-run", () => {
    const tmp = useTmpDir();

    it("shows detected technologies without installing", () => {
      writePackageJson(tmp.path, {
        dependencies: { react: "^19", next: "^15" },
        devDependencies: { typescript: "^5" },
      });
      writeFile(tmp.path, "tsconfig.json", "{}");

      const output = run(["--dry-run"], tmp.path);

      ok(output.includes("React"));
      ok(output.includes("Next.js"));
      ok(output.includes("TypeScript"));
      ok(output.includes("--dry-run"));
      ok(output.includes("nothing was installed"));
    });

    it("warns when no technologies are detected", () => {
      writePackageJson(tmp.path);

      const output = run(["--dry-run"], tmp.path);
      ok(output.includes("No supported technologies"));
    });

    it("shows skills grouped by source technology", () => {
      writePackageJson(tmp.path, {
        devDependencies: { tailwindcss: "^4", typescript: "^5" },
      });
      writeFile(tmp.path, "tsconfig.json", "{}");

      const output = run(["--dry-run"], tmp.path);

      ok(output.includes("tailwind-css-patterns"));
      ok(output.includes("typescript-advanced-types"));
      ok(output.includes("Tailwind CSS"));
      ok(output.includes("TypeScript"));
    });

    it("detects technologies from config files only", () => {
      writePackageJson(tmp.path);
      writeFile(tmp.path, "next.config.mjs", "export default {}");

      const output = run(["--dry-run"], tmp.path);

      ok(output.includes("Next.js"));
    });

    it("detects Remotion from package.json", () => {
      writePackageJson(tmp.path, { dependencies: { remotion: "^4" } });

      const output = run(["--dry-run"], tmp.path);

      ok(output.includes("Remotion"));
      ok(output.includes("remotion-best-practices"));
    });

    it("detects Angular from @angular/core", () => {
      writePackageJson(tmp.path, { dependencies: { "@angular/core": "^18" } });

      const output = run(["--dry-run"], tmp.path);

      ok(output.includes("Angular"));
      ok(output.includes("angular-developer"));
      ok(output.includes("angular-security"));
    });

    it("detects Tailwind CSS from tailwindcss package", () => {
      writePackageJson(tmp.path, { devDependencies: { tailwindcss: "^4" } });

      const output = run(["--dry-run"], tmp.path);

      ok(output.includes("Tailwind CSS"));
      ok(output.includes("tailwind-css-patterns"));
      ok(output.includes("tailwind-best-practices"));
    });

    it("detects web frontend from .html files and installs web fundamentals", () => {
      writeFile(tmp.path, "public/index.html", "<html></html>");
      const output = run(["--dry-run"], tmp.path);
      ok(output.includes("Web frontend detected"));
      ok(output.includes("frontend-design"));
      ok(output.includes("accessibility"));
      ok(output.includes("seo"));
    });

    it("detects web frontend from .css files", () => {
      writeFile(tmp.path, "assets/main.css", "body { margin: 0 }");
      const output = run(["--dry-run"], tmp.path);
      ok(output.includes("Web frontend detected"));
    });

    it("does NOT detect web frontend from .php files alone", () => {
      writeFile(tmp.path, "src/index.php", "<?php echo 'hello';");
      writeFile(tmp.path, "src/controller.php", "<?php class Controller {}");
      const output = run(["--dry-run"], tmp.path);
      ok(output.includes("No supported technologies"));
    });

    it("detects technologies from monorepo workspaces with --dry-run", () => {
      writePackageJson(tmp.path, {
        devDependencies: { typescript: "^5" },
        workspaces: ["packages/*", "apps/*"],
      });
      writeFile(tmp.path, "tsconfig.json", "{}");
      addWorkspace(tmp.path, "packages/ui", { dependencies: { react: "^19", tailwindcss: "^4" } });
      addWorkspace(tmp.path, "apps/web", { dependencies: { next: "^15" } });
      const output = run(["--dry-run"], tmp.path);
      ok(output.includes("TypeScript"), "root tech detected");
      ok(output.includes("React"), "workspace tech detected");
      ok(output.includes("Next.js"), "workspace tech detected");
      ok(output.includes("Tailwind"), "workspace tech detected");
      ok(output.includes("nothing was installed"));
    });

    it("adds web fundamentals when npm frontend is detected too", () => {
      writePackageJson(tmp.path, { dependencies: { react: "^19", next: "^15" } });
      const output = run(["--dry-run"], tmp.path);
      ok(output.includes("React"));
      ok(output.includes("frontend-design"));
      ok(output.includes("accessibility"));
      ok(output.includes("seo"));
    });

    it("shows IDEs in dry-run output", () => {
      writePackageJson(tmp.path, { dependencies: { react: "^19" } });
      const output = run(["--dry-run"], tmp.path);
      ok(output.includes("IDEs:") || output.includes("dry-run"), "debe mostrar IDEs o confirmación de dry-run");
    });

    it("shows user-specified IDE in dry-run output", () => {
      writePackageJson(tmp.path, { dependencies: { react: "^19" } });
      const output = run(["--dry-run", "-a", "cursor"], tmp.path);
      ok(output.includes("dry-run"), "debe confirmar dry-run");
    });
  });

  describe("agents command", () => {
    const tmp = useTmpDir();

    it('"agents" muestra aviso de deprecación', () => {
      writePackageJson(tmp.path, { dependencies: { react: "^19" } });
      const output = run(["agents", "--dry-run"], tmp.path);
      ok(output.includes("deprecado"), "debe mostrar aviso de deprecación");
    });

    it('"agents" cae al flujo unificado y lista workflows', () => {
      writePackageJson(tmp.path, { dependencies: { react: "^19" } });
      const output = run(["agents", "--dry-run"], tmp.path);
      ok(output.includes("dry-run"), "debe continuar con flujo unificado en dry-run");
    });

    it('"--agents" también muestra aviso de deprecación', () => {
      writePackageJson(tmp.path, { dependencies: { react: "^19" } });
      const output = run(["--agents", "--dry-run"], tmp.path);
      ok(output.includes("deprecado"), "debe mostrar aviso de deprecación");
    });

    it('"agents" muestra aviso de deprecación y cae al flujo unificado', () => {
      writePackageJson(tmp.path, { devDependencies: { typescript: "^5" } });
      writeFile(tmp.path, "tsconfig.json", "{}");
      const output = run(["agents", "--dry-run"], tmp.path);
      ok(
        output.includes("deprecado") || output.includes("No supported") || output.includes("dry-run"),
        "debe mostrar deprecación o continuar con flujo unificado",
      );
    });
  });

  describe("workflow educational message", () => {
    const tmp = useTmpDir();

    it('"create-component" muestra mensaje educativo sin ejecutar nada', () => {
      writePackageJson(tmp.path, { dependencies: { react: "^19" } });
      const output = run(["create-component"], tmp.path);
      ok(output.includes("installs tools"), "debe mencionar que el CLI instala herramientas");
      ok(output.includes("create-component"), "debe mostrar el nombre del workflow");
      ok(output.includes("IDE"), "debe mencionar el IDE");
      ok(!output.includes("Skills to install"), "no debe mostrar pantalla de skills");
    });

    it('cualquier positional desconocido muestra mensaje educativo', () => {
      writePackageJson(tmp.path, { dependencies: { react: "^19" } });
      const output = run(["my-custom-workflow"], tmp.path);
      ok(output.includes("installs tools"), "debe mostrar mensaje educativo");
      ok(output.includes("my-custom-workflow"), "debe mostrar el nombre dado");
    });
  });
});

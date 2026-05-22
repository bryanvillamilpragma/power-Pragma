import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import {
    detectCombos,
    detectTechnologies,
    getAllPackageNames,
    getDenoImportNames,
    parseSettingsGradleModules,
    readDenoJson,
    readGemfile,
    readPackageJson,
} from "../lib.js";
import { addWorkspace, useTmpDir, writeFile, writeJson, writePackageJson } from "./helpers.js";

// ── getAllPackageNames ─────────────────────────────────────────

describe("getAllPackageNames", () => {
  it("returns empty array for null input", () => {
    deepStrictEqual(getAllPackageNames(null), []);
  });

  it("returns empty array for empty package.json", () => {
    deepStrictEqual(getAllPackageNames({}), []);
  });

  it("extracts dependencies", () => {
    const pkg = { dependencies: { react: "^19.0.0", next: "^15.0.0" } };
    deepStrictEqual(getAllPackageNames(pkg), ["react", "next"]);
  });

  it("extracts devDependencies", () => {
    const pkg = { devDependencies: { typescript: "^5.0.0" } };
    deepStrictEqual(getAllPackageNames(pkg), ["typescript"]);
  });

  it("merges both dependencies and devDependencies", () => {
    const pkg = {
      dependencies: { react: "^19.0.0" },
      devDependencies: { typescript: "^5.0.0" },
    };
    const result = getAllPackageNames(pkg);
    ok(result.includes("react"));
    ok(result.includes("typescript"));
    strictEqual(result.length, 2);
  });
});

// ── readPackageJson ───────────────────────────────────────────

describe("readPackageJson", () => {
  const tmp = useTmpDir();

  it("returns null when no package.json exists", () => {
    strictEqual(readPackageJson(tmp.path), null);
  });

  it("parses valid package.json", () => {
    const pkg = { name: "test", dependencies: { react: "^19.0.0" } };
    writePackageJson(tmp.path, pkg);
    deepStrictEqual(readPackageJson(tmp.path), pkg);
  });

  it("returns null for invalid JSON", () => {
    writeFile(tmp.path, "package.json", "{ not valid json }}}");
    strictEqual(readPackageJson(tmp.path), null);
  });
});

// ── readGemfile ──────────────────────────────────────────────

describe("readGemfile", () => {
  const tmp = useTmpDir();

  it("returns empty array when no Gemfile exists", () => {
    deepStrictEqual(readGemfile(tmp.path), []);
  });

  it("parses gem names with single quotes", () => {
    writeFile(tmp.path, "Gemfile", "gem 'rails', '~> 7.0'\ngem 'pg'\n");
    deepStrictEqual(readGemfile(tmp.path), ["rails", "pg"]);
  });

  it("parses gem names with double quotes", () => {
    writeFile(tmp.path, "Gemfile", 'gem "rails"\ngem "sidekiq"\n');
    deepStrictEqual(readGemfile(tmp.path), ["rails", "sidekiq"]);
  });

  it("ignores comments", () => {
    writeFile(tmp.path, "Gemfile", "# gem 'unused'\ngem 'rails'\n");
    deepStrictEqual(readGemfile(tmp.path), ["rails"]);
  });

  it("handles indented gems (inside groups)", () => {
    writeFile(tmp.path, "Gemfile", "group :development do\n  gem 'rspec'\nend\n");
    deepStrictEqual(readGemfile(tmp.path), ["rspec"]);
  });
});

// ── parseSettingsGradleModules ─────────────────────────────────

describe("parseSettingsGradleModules", () => {
  it("extracts module from Kotlin DSL include", () => {
    const modules = parseSettingsGradleModules('include("app")');
    deepStrictEqual(modules, ["app"]);
  });

  it("extracts module from Groovy include", () => {
    const modules = parseSettingsGradleModules("include 'app'");
    deepStrictEqual(modules, ["app"]);
  });

  it("strips leading colon from module paths", () => {
    const modules = parseSettingsGradleModules('include(":app")');
    deepStrictEqual(modules, ["app"]);
  });

  it("converts colon-separated paths to filesystem paths", () => {
    const modules = parseSettingsGradleModules('include(":feature:login")');
    deepStrictEqual(modules, ["feature/login"]);
  });

  it("handles multiple modules on one line (Groovy)", () => {
    const modules = parseSettingsGradleModules("include 'app', 'core', 'data'");
    deepStrictEqual(modules, ["app", "core", "data"]);
  });

  it("handles multiple modules on one line (Kotlin DSL)", () => {
    const modules = parseSettingsGradleModules('include(":app", ":core", ":data")');
    deepStrictEqual(modules, ["app", "core", "data"]);
  });

  it("handles multi-line include block", () => {
    const content = `include(
  ":app",
  ":core",
  ":shared:data"
)`;
    deepStrictEqual(parseSettingsGradleModules(content), ["app", "core", "shared/data"]);
  });

  it("handles multiple separate include statements", () => {
    const content = 'include(":app")\ninclude(":core")';
    deepStrictEqual(parseSettingsGradleModules(content), ["app", "core"]);
  });

  it("returns empty array when no includes are present", () => {
    const content = 'rootProject.name = "my-app"\npluginManagement { }';
    deepStrictEqual(parseSettingsGradleModules(content), []);
  });

  it("returns empty array for empty content", () => {
    deepStrictEqual(parseSettingsGradleModules(""), []);
  });

  it("ignores non-include content around includes", () => {
    const content = `rootProject.name = "my-app"
pluginManagement {
    repositories { google() }
}
include(":app")`;
    deepStrictEqual(parseSettingsGradleModules(content), ["app"]);
  });
});

// ── getDenoImportNames ────────────────────────────────────────

describe("getDenoImportNames", () => {
  const tmp = useTmpDir();

  it("returns empty array when no deno.json exists", () => {
    deepStrictEqual(getDenoImportNames(readDenoJson(tmp.path)), []);
  });

  it("extracts npm: imports from deno.json", () => {
    writeJson(tmp.path, "deno.json", {
      imports: { "react": "npm:react@^19", "next": "npm:next@^15" },
    });
    const denoJson = readDenoJson(tmp.path);
    const names = getDenoImportNames(denoJson);
    ok(names.includes("react"));
    ok(names.includes("next"));
  });

  it("extracts jsr: imports from deno.json", () => {
    writeJson(tmp.path, "deno.json", {
      imports: { "@std/path": "jsr:@std/path@^1" },
    });
    const denoJson = readDenoJson(tmp.path);
    const names = getDenoImportNames(denoJson);
    ok(names.includes("@std/path"));
  });

  it("ignores non-npm/jsr imports", () => {
    writeJson(tmp.path, "deno.json", {
      imports: { "./utils": "./src/utils.ts" },
    });
    const denoJson = readDenoJson(tmp.path);
    deepStrictEqual(getDenoImportNames(denoJson), []);
  });
});

// ── detectTechnologies ────────────────────────────────────────

describe("detectTechnologies", () => {
  const tmp = useTmpDir();

  it("returns empty when no package.json or config files", () => {
    const { detected } = detectTechnologies(tmp.path);
    strictEqual(detected.length, 0);
  });

  it("detects React from dependencies", () => {
    writePackageJson(tmp.path, { dependencies: { react: "^19.0.0", "react-dom": "^19.0.0" } });
    const { detected } = detectTechnologies(tmp.path);
    const ids = detected.map((t) => t.id);
    ok(ids.includes("react"));
  });

  it("detects Next.js from dependencies", () => {
    writePackageJson(tmp.path, { dependencies: { next: "^15.0.0" } });
    const { detected } = detectTechnologies(tmp.path);
    const ids = detected.map((t) => t.id);
    ok(ids.includes("nextjs"));
  });

  it("detects Next.js from config file even without package", () => {
    writePackageJson(tmp.path);
    writeFile(tmp.path, "next.config.mjs", "export default {}");
    const { detected } = detectTechnologies(tmp.path);
    const ids = detected.map((t) => t.id);
    ok(ids.includes("nextjs"));
  });

  it("detects Angular from @angular/core package", () => {
    writePackageJson(tmp.path, { dependencies: { "@angular/core": "^18.0.0" } });
    const { detected } = detectTechnologies(tmp.path);
    const ids = detected.map((t) => t.id);
    ok(ids.includes("angular"));
  });

  it("detects Angular from angular.json config file", () => {
    writePackageJson(tmp.path);
    writeFile(tmp.path, "angular.json", "{}");
    const { detected } = detectTechnologies(tmp.path);
    const ids = detected.map((t) => t.id);
    ok(ids.includes("angular"));
  });

  it("detects Tailwind CSS from package", () => {
    writePackageJson(tmp.path, { devDependencies: { tailwindcss: "^4.0.0" } });
    const { detected } = detectTechnologies(tmp.path);
    const ids = detected.map((t) => t.id);
    ok(ids.includes("tailwind"));
  });

  it("detects Tailwind CSS from @tailwindcss/vite package", () => {
    writePackageJson(tmp.path, { devDependencies: { "@tailwindcss/vite": "^4.0.0" } });
    const { detected } = detectTechnologies(tmp.path);
    const ids = detected.map((t) => t.id);
    ok(ids.includes("tailwind"));
  });

  it("detects Tailwind CSS from config file", () => {
    writePackageJson(tmp.path);
    writeFile(tmp.path, "tailwind.config.ts", "export default {}");
    const { detected } = detectTechnologies(tmp.path);
    const ids = detected.map((t) => t.id);
    ok(ids.includes("tailwind"));
  });

  it("detects TypeScript from package", () => {
    writePackageJson(tmp.path, { devDependencies: { typescript: "^5.0.0" } });
    const { detected } = detectTechnologies(tmp.path);
    const ids = detected.map((t) => t.id);
    ok(ids.includes("typescript"));
  });

  it("detects TypeScript from tsconfig.json", () => {
    writePackageJson(tmp.path);
    writeFile(tmp.path, "tsconfig.json", "{}");
    const { detected } = detectTechnologies(tmp.path);
    const ids = detected.map((t) => t.id);
    ok(ids.includes("typescript"));
  });

  it("detects Remotion from package", () => {
    writePackageJson(tmp.path, { dependencies: { remotion: "^4.0.0" } });
    const { detected } = detectTechnologies(tmp.path);
    const ids = detected.map((t) => t.id);
    ok(ids.includes("remotion"));
  });

  it("detects Remotion from @remotion/cli", () => {
    writePackageJson(tmp.path, { devDependencies: { "@remotion/cli": "^4.0.0" } });
    const { detected } = detectTechnologies(tmp.path);
    const ids = detected.map((t) => t.id);
    ok(ids.includes("remotion"));
  });

  it("detects multiple technologies at once", () => {
    writePackageJson(tmp.path, {
      dependencies: { react: "^19", next: "^15", "@angular/core": "^18" },
      devDependencies: { typescript: "^5", tailwindcss: "^4" },
    });
    const { detected } = detectTechnologies(tmp.path);
    const ids = detected.map((t) => t.id);
    ok(ids.includes("react"));
    ok(ids.includes("nextjs"));
    ok(ids.includes("angular"));
    ok(ids.includes("typescript"));
    ok(ids.includes("tailwind"));
  });

  it("returns correct skills for React detection", () => {
    writePackageJson(tmp.path, { dependencies: { react: "^19", "react-dom": "^19" } });
    const { detected } = detectTechnologies(tmp.path);
    const react = detected.find((t) => t.id === "react")!;
    ok(react.skills.includes("sopp-front/skills/react-security"));
    ok(react.skills.includes("sopp-front/skills/vercel-react-best-practices"));
  });

  it("returns correct skills for Angular detection", () => {
    writePackageJson(tmp.path, { dependencies: { "@angular/core": "^18" } });
    const { detected } = detectTechnologies(tmp.path);
    const angular = detected.find((t) => t.id === "angular")!;
    ok(angular.skills.includes("angular/skills/angular-developer"));
    ok(angular.skills.includes("sopp-front/skills/angular-security"));
    ok(angular.skills.includes("sopp-front/skills/clean-architecture-uml"));
  });

  it("returns correct skills for TypeScript detection", () => {
    writePackageJson(tmp.path, { devDependencies: { typescript: "^5" } });
    const { detected } = detectTechnologies(tmp.path);
    const ts = detected.find((t) => t.id === "typescript")!;
    ok(ts.skills.includes("wshobson/agents/typescript-advanced-types"));
    ok(ts.skills.includes("sopp-front/skills/typescript-best-practices"));
  });

  it("marks project as frontend when React is detected", () => {
    writePackageJson(tmp.path, { dependencies: { react: "^19" } });
    const { isFrontend } = detectTechnologies(tmp.path);
    ok(isFrontend);
  });

  it("marks project as frontend when Angular is detected", () => {
    writePackageJson(tmp.path, { dependencies: { "@angular/core": "^18" } });
    const { isFrontend } = detectTechnologies(tmp.path);
    ok(isFrontend);
  });

  it("does not mark TypeScript-only project as frontend", () => {
    writePackageJson(tmp.path, { devDependencies: { typescript: "^5" } });
    const { isFrontend } = detectTechnologies(tmp.path);
    strictEqual(isFrontend, false);
  });

  it("detects web frontend from .html files", () => {
    writeFile(tmp.path, "public/index.html", "<html></html>");
    const { isFrontend } = detectTechnologies(tmp.path);
    ok(isFrontend);
  });

  it("detects web frontend from .css files", () => {
    writeFile(tmp.path, "assets/main.css", "body { margin: 0 }");
    const { isFrontend } = detectTechnologies(tmp.path);
    ok(isFrontend);
  });

  it("detects web frontend from .vue files", () => {
    writeFile(tmp.path, "src/App.vue", "<template><div></div></template>");
    const { isFrontend } = detectTechnologies(tmp.path);
    ok(isFrontend);
  });

  it("detects web frontend from .tsx files", () => {
    writeFile(tmp.path, "src/App.tsx", "export default function App() { return <div/>; }");
    const { isFrontend } = detectTechnologies(tmp.path);
    ok(isFrontend);
  });
});

// ── detectTechnologies (monorepo) ─────────────────────────────

describe("detectTechnologies (monorepo)", () => {
  const tmp = useTmpDir();

  it("merges root and workspace technologies", () => {
    writePackageJson(tmp.path, {
      devDependencies: { typescript: "^5" },
      workspaces: ["packages/*"],
    });
    writeFile(tmp.path, "tsconfig.json", "{}");
    addWorkspace(tmp.path, "packages/ui", { dependencies: { react: "^19", tailwindcss: "^4" } });

    const { detected } = detectTechnologies(tmp.path);
    const ids = detected.map((t) => t.id);
    ok(ids.includes("typescript"));
    ok(ids.includes("react"));
    ok(ids.includes("tailwind"));
  });

  it("works with pnpm-workspace.yaml", () => {
    writePackageJson(tmp.path);
    writeFile(tmp.path, "pnpm-workspace.yaml", "packages:\n  - packages/*\n");
    addWorkspace(tmp.path, "packages/web", { dependencies: { next: "^15" } });

    const { detected } = detectTechnologies(tmp.path);
    const ids = detected.map((t) => t.id);
    ok(ids.includes("nextjs"));
  });

  it("deduplicates technologies across workspaces", () => {
    writePackageJson(tmp.path, {
      workspaces: ["packages/*"],
    });
    addWorkspace(tmp.path, "packages/a", { dependencies: { react: "^19" } });
    addWorkspace(tmp.path, "packages/b", { dependencies: { react: "^19" } });

    const { detected } = detectTechnologies(tmp.path);
    const reactCount = detected.filter((t) => t.id === "react").length;
    strictEqual(reactCount, 1);
  });
});

// ── detectCombos ──────────────────────────────────────────────

describe("detectCombos", () => {
  it("returns empty array when no combos match", () => {
    deepStrictEqual(detectCombos(["react"]), []);
  });

  it("returns empty array for empty detected ids", () => {
    deepStrictEqual(detectCombos([]), []);
  });
});

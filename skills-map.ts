// ── Types ─────────────────────────────────────────────────────

export interface ConfigFileContentBlock {
  files?: string[];
  patterns: string[];
  scanGradleLayout?: boolean;
  scanDotNetLayout?: boolean;
}

export interface DetectConfig {
  packages?: string[];
  packagePatterns?: RegExp[];
  configFiles?: string[];
  fileExtensions?: string[];
  gems?: string[];
  configFileContent?: ConfigFileContentBlock | ConfigFileContentBlock[];
}

export interface Technology {
  id: string;
  name: string;
  detect: DetectConfig;
  skills: string[];
  workflows?: string[];
  autoRules?: string[];
  autoPrompts?: string[];
  agents?: string[];
}

export interface ComboSkill {
  id: string;
  name: string;
  requires: string[];
  skills: string[];
}

// ── Skills Map ────────────────────────────────────────────────

export const SKILLS_MAP: Technology[] = [
  {
    id: "react",
    name: "React",
    detect: {
      packages: ["react", "react-dom"],
    },
    skills: [
      "sopp-front/skills/react-security",
      "sopp-front/skills/vercel-react-best-practices",
    ],
    workflows: [
      "sopp-front/skills/workflows/create-view",
      "sopp-front/skills/workflows/unit-test-review",
      "sopp-front/skills/workflows/code-reviewer",
      "sopp-front/skills/workflows/performance-optimizer",
      "sopp-front/skills/workflows/security-auditor",
      "sopp-front/skills/workflows/microfrontend-architect",
      "sopp-front/skills/workflows/figma-to-code",
    ],
    autoRules: [
      "sopp-front/skills/rules/solid-clean",
      "sopp-front/skills/rules/code-test",
      "sopp-front/skills/rules/performance",
      "sopp-front/skills/rules/security",
      "sopp-front/skills/rules/responsive-design",
      "sopp-front/skills/rules/git-commit",
    ],
  },
  {
    id: "nextjs",
    name: "Next.js",
    detect: {
      packages: ["next"],
      configFiles: ["next.config.js", "next.config.mjs", "next.config.ts"],
    },
    skills: [
      "vercel-labs/next-skills/next-best-practices",
      "sopp-front/skills/nextjs-shadcn",
    ],
    workflows: [
      "sopp-front/skills/workflows/create-view",
      "sopp-front/skills/workflows/unit-test-review",
      "sopp-front/skills/workflows/code-reviewer",
      "sopp-front/skills/workflows/performance-optimizer",
      "sopp-front/skills/workflows/security-auditor",
      "sopp-front/skills/workflows/microfrontend-architect",
      "sopp-front/skills/workflows/figma-to-code",
    ],
    autoRules: [
      "sopp-front/skills/rules/solid-clean",
      "sopp-front/skills/rules/code-test",
      "sopp-front/skills/rules/performance",
      "sopp-front/skills/rules/security",
      "sopp-front/skills/rules/responsive-design",
      "sopp-front/skills/rules/git-commit",
    ],
  },
  {
    id: "angular",
    name: "Angular",
    detect: {
      packages: ["@angular/core"],
      configFiles: ["angular.json"],
    },
    skills: [
      "angular/skills/angular-developer",
      "angular/angular/reference-core",
      "angular/angular/reference-signal-forms",
      "angular/angular/reference-compiler-cli",
      "angular/angular/adev-writing-guide",
      "sopp-front/skills/angular-security",
      "sopp-front/skills/clean-architecture-uml",
    ],
    workflows: [
      "sopp-front/skills/workflows/create-view",
      "sopp-front/skills/workflows/unit-test-review",
      "sopp-front/skills/workflows/code-reviewer",
      "sopp-front/skills/workflows/performance-optimizer",
      "sopp-front/skills/workflows/security-auditor",
      "sopp-front/skills/workflows/microfrontend-architect",
      "sopp-front/skills/workflows/figma-to-code",
    ],
    autoRules: [
      "sopp-front/skills/rules/clean-architecture",
      "sopp-front/skills/rules/solid-clean",
      "sopp-front/skills/rules/code-test",
      "sopp-front/skills/rules/security",
      "sopp-front/skills/rules/responsive-design",
      "sopp-front/skills/rules/git-commit",
    ],
  },
  {
    id: "tailwind",
    name: "Tailwind CSS",
    detect: {
      packages: ["tailwindcss", "@tailwindcss/vite"],
      configFiles: ["tailwind.config.js", "tailwind.config.ts", "tailwind.config.cjs"],
    },
    skills: [
      "giuseppe-trisciuoglio/developer-kit/tailwind-css-patterns",
      "sopp-front/skills/tailwind-best-practices",
    ],
    autoRules: [
      "sopp-front/skills/rules/responsive-design",
      "sopp-front/skills/rules/git-commit",
    ],
  },
  {
    id: "typescript",
    name: "TypeScript",
    detect: {
      packages: ["typescript"],
      configFiles: ["tsconfig.json"],
    },
    skills: [
      "wshobson/agents/typescript-advanced-types",
      "sopp-front/skills/typescript-best-practices",
    ],
    autoRules: [
      "sopp-front/skills/rules/solid-clean",
      "sopp-front/skills/rules/git-commit",
    ],
  },
  {
    id: "remotion",
    name: "Remotion",
    detect: {
      packages: ["remotion", "@remotion/cli"],
    },
    skills: ["sopp-front/skills/remotion-best-practices"],
  },
];

// ── Combo Skills Map (cross-technology) ──────────────────────

export const COMBO_SKILLS_MAP: ComboSkill[] = [];

// ── Frontend Detection ────────────────────────────────────────

export const FRONTEND_PACKAGES: Set<string> = new Set([
  "react",
  "vue",
  "svelte",
  "astro",
  "next",
  "@angular/core",
  "solid-js",
  "lit",
  "preact",
  "nuxt",
  "@sveltejs/kit",
]);

export const FRONTEND_BONUS_SKILLS: string[] = [
  "anthropics/skills/frontend-design",
  "addyosmani/web-quality-skills/accessibility",
  "addyosmani/web-quality-skills/seo",
  "sopp-front/skills/web-design-guidelines",
  "sopp-front/skills/frontend-performance",
  "sopp-front/skills/frontend-security",
  "sopp-front/skills/frontend-code-quality",
  "sopp-front/skills/eslint-prettier-config",
  "sopp-front/skills/superdesign",
  "sopp-front/skills/dependency-management",
];

// ── Agent Folder Map ─────────────────────────────────────────

export const AGENT_FOLDER_MAP: Record<string, string> = {
  ".claude": "claude-code",
  ".cline": "cline",
  ".junie": "junie",
  ".codebuddy": "codebuddy",
  ".continue": "continue",
  ".kiro": "kiro-cli",
};

// ── IDE Map ───────────────────────────────────────────────────

export type ArtifactType = "skill" | "agent" | "rule" | "prompt";

export interface IDEArtifactConfig {
  folder: string;
  format: "dir" | "file" | "append";
  fileExt: string;
}

export interface IDEConfig {
  detectionPath: string;
  isGlobal: boolean;
  artifacts: Record<ArtifactType, IDEArtifactConfig>;
}

export const IDE_MAP: Record<string, IDEConfig> = {
  "claude-code": {
    detectionPath: ".claude",
    isGlobal: true,
    artifacts: {
      skill:  { folder: ".claude/skills",  format: "dir",  fileExt: ""    },
      agent:  { folder: ".claude/agents",  format: "file", fileExt: ".md" },
      rule:   { folder: ".claude/rules",   format: "file", fileExt: ".md" },
      prompt: { folder: ".claude/prompts", format: "file", fileExt: ".md" },
    },
  },
  "kiro": {
    detectionPath: ".kiro",
    isGlobal: true,
    artifacts: {
      skill:  { folder: ".kiro/skills",  format: "dir",  fileExt: ""    },
      agent:  { folder: ".kiro/agents",  format: "file", fileExt: ".md" },
      rule:   { folder: ".kiro/rules",   format: "file", fileExt: ".md" },
      prompt: { folder: ".kiro/prompts", format: "file", fileExt: ".md" },
    },
  },
  "copilot": {
    detectionPath: ".vscode",
    isGlobal: true,
    artifacts: {
      skill:  { folder: ".agents/skills",   format: "dir",    fileExt: ""                        },
      agent:  { folder: ".agents/agents",   format: "file",   fileExt: ".md"                     },
      rule:   { folder: ".copilot",         format: "append", fileExt: "copilot-instructions.md" },
      prompt: { folder: ".copilot/prompts", format: "file",   fileExt: ".md"                     },
    },
  },
  "windsurf": {
    detectionPath: ".codeium/windsurf",
    isGlobal: true,
    artifacts: {
      skill:  { folder: ".agents/skills",                      format: "dir",  fileExt: ""    },
      agent:  { folder: ".codeium/windsurf/global_workflows",  format: "file", fileExt: ".md" },
      rule:   { folder: ".codeium/windsurf/rules",             format: "file", fileExt: ".md" },
      prompt: { folder: ".codeium/windsurf/prompts",           format: "file", fileExt: ".md" },
    },
  },
  "cursor": {
    detectionPath: ".cursor",
    isGlobal: true,
    artifacts: {
      skill:  { folder: ".agents/skills",  format: "dir",  fileExt: ""     },
      agent:  { folder: ".agents/agents",  format: "file", fileExt: ".md"  },
      rule:   { folder: ".cursor/rules",   format: "file", fileExt: ".mdc" },
      prompt: { folder: ".cursor/prompts", format: "file", fileExt: ".md"  },
    },
  },
};

export const WEB_FRONTEND_EXTENSIONS: Set<string> = new Set([
  ".html",
  ".htm",
  ".css",
  ".scss",
  ".sass",
  ".less",
  ".vue",
  ".svelte",
  ".jsx",
  ".tsx",
  ".twig",
  ".tpl",
  ".ejs",
  ".hbs",
  ".pug",
  ".njk",
]);

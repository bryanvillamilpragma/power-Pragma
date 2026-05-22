import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";

describe("collectAutoPrompts", () => {
  it("retorna prompts para tecnología con autoPrompts", async () => {
    const { collectAutoPrompts } = await import("../lib.js");
    const mockAngular = {
      id: "angular",
      name: "Angular",
      detect: {},
      skills: [],
      autoPrompts: [
        "pragma/autoskills/prompts/create-component-prompt",
      ],
    };
    const result = collectAutoPrompts({ detected: [mockAngular], installedNames: [] });
    strictEqual(result.length, 1);
    ok(result.some((p) => p.skill.includes("create-component-prompt")));
  });

  it("retorna array vacío si no hay autoPrompts en la tecnología", async () => {
    const { collectAutoPrompts } = await import("../lib.js");
    const mockTs = {
      id: "typescript",
      name: "TypeScript",
      detect: {},
      skills: [],
    };
    const result = collectAutoPrompts({ detected: [mockTs], installedNames: [] });
    strictEqual(result.length, 0);
  });

  it("no duplica prompts si dos tecnologías los comparten", async () => {
    const { collectAutoPrompts } = await import("../lib.js");
    const sharedPrompt = "pragma/autoskills/prompts/shared-prompt";
    const mockA = { id: "react",   name: "React",   detect: {}, skills: [], autoPrompts: [sharedPrompt] };
    const mockB = { id: "angular", name: "Angular", detect: {}, skills: [], autoPrompts: [sharedPrompt] };
    const result = collectAutoPrompts({ detected: [mockA, mockB], installedNames: [] });
    strictEqual(result.length, 1);
  });

  it("omite prompts ya instalados", async () => {
    const { collectAutoPrompts } = await import("../lib.js");
    const mockAngular = {
      id: "angular",
      name: "Angular",
      detect: {},
      skills: [],
      autoPrompts: ["pragma/autoskills/prompts/create-component-prompt"],
    };
    const result = collectAutoPrompts({
      detected: [mockAngular],
      installedNames: ["prompts/create-component-prompt"],
    });
    strictEqual(result.length, 0);
  });

  it("acepta installedNames como Set", async () => {
    const { collectAutoPrompts } = await import("../lib.js");
    const mockReact = {
      id: "react",
      name: "React",
      detect: {},
      skills: [],
      autoPrompts: ["pragma/autoskills/prompts/some-prompt"],
    };
    const result = collectAutoPrompts({
      detected: [mockReact],
      installedNames: new Set(["prompts/some-prompt"]),
    });
    strictEqual(result.length, 0);
  });
});

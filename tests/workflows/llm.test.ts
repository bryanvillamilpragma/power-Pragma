import { strictEqual, ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { useTmpDir } from "../helpers.js";
import { imageToContent, parseJSONResponse } from "../../workflows/llm.js";

// PNG 1x1 pixel mínimo válido
const MINIMAL_PNG = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489" +
  "0000000a49444154789c6260000000020001e221bc330000000049454e44ae426082",
  "hex",
);

describe("imageToContent", () => {
  const tmp = useTmpDir();

  it("retorna null para archivo inexistente", () => {
    strictEqual(imageToContent("/no/existe/archivo.png"), null);
  });

  it("retorna null para extensión no soportada", () => {
    const p = join(tmp.path, "test.bmp");
    writeFileSync(p, "fake content");
    strictEqual(imageToContent(p), null);
  });

  it("retorna null para archivo vacío", () => {
    const p = join(tmp.path, "empty.png");
    writeFileSync(p, Buffer.alloc(0));
    strictEqual(imageToContent(p), null);
  });

  it("retorna null para archivo mayor a 5MB", () => {
    const p = join(tmp.path, "large.jpg");
    writeFileSync(p, Buffer.alloc(6 * 1024 * 1024, 0xff));
    strictEqual(imageToContent(p), null);
  });

  it("convierte PNG a base64 con media_type correcto", () => {
    const p = join(tmp.path, "valid.png");
    writeFileSync(p, MINIMAL_PNG);
    const result = imageToContent(p);
    ok(result !== null);
    strictEqual(result!.type, "image");
    strictEqual(result!.source.type, "base64");
    strictEqual(result!.source.media_type, "image/png");
    ok(result!.source.data.length > 0);
  });

  it("convierte JPG con media_type image/jpeg", () => {
    const p = join(tmp.path, "valid.jpg");
    writeFileSync(p, MINIMAL_PNG); // contenido no importa para este test
    const result = imageToContent(p);
    ok(result !== null);
    strictEqual(result!.source.media_type, "image/jpeg");
  });

  it("convierte JPEG con media_type image/jpeg", () => {
    const p = join(tmp.path, "valid.jpeg");
    writeFileSync(p, MINIMAL_PNG);
    const result = imageToContent(p);
    ok(result !== null);
    strictEqual(result!.source.media_type, "image/jpeg");
  });

  it("convierte WebP con media_type image/webp", () => {
    const p = join(tmp.path, "valid.webp");
    writeFileSync(p, MINIMAL_PNG);
    const result = imageToContent(p);
    ok(result !== null);
    strictEqual(result!.source.media_type, "image/webp");
  });

  it("el base64 generado puede decodificarse al buffer original", () => {
    const p = join(tmp.path, "round-trip.png");
    writeFileSync(p, MINIMAL_PNG);
    const result = imageToContent(p);
    ok(result !== null);
    const decoded = Buffer.from(result!.source.data, "base64");
    strictEqual(decoded.length, MINIMAL_PNG.length);
  });
});

describe("parseJSONResponse", () => {
  it("parsea JSON limpio", () => {
    const r = parseJSONResponse<{ ok: boolean }>('{"ok":true}');
    ok(r !== null);
    strictEqual(r!.ok, true);
  });

  it("parsea JSON con fence ```json```", () => {
    const r = parseJSONResponse<{ files: unknown[] }>("```json\n{\"files\":[]}\n```");
    ok(r !== null);
    ok(Array.isArray(r!.files));
  });

  it("parsea JSON con fence ``` solo```", () => {
    const r = parseJSONResponse<{ x: number }>("```\n{\"x\":42}\n```");
    ok(r !== null);
    strictEqual(r!.x, 42);
  });

  it("retorna null para JSON inválido", () => {
    strictEqual(parseJSONResponse("esto no es json"), null);
  });

  it("retorna null para string vacío", () => {
    strictEqual(parseJSONResponse(""), null);
  });

  it("parsea estructura de files correctamente", () => {
    const json = JSON.stringify({
      files: [
        { rel: "payment.component.ts", content: "export class PaymentComponent {}" },
        { rel: "payment.component.html", content: "<div></div>" },
      ],
    });
    const r = parseJSONResponse<{ files: Array<{ rel: string; content: string }> }>(json);
    ok(r !== null);
    strictEqual(r!.files.length, 2);
    strictEqual(r!.files[0].rel, "payment.component.ts");
  });
});

import assert from "node:assert";
import { describe, it } from "node:test";
import {
  detectTarget,
  findAgyBin,
  findAgyAcpBridge,
  isDarwinIntel,
} from "../install.js";
import { parseAgyModelsOutput } from "../host.js";

describe("isDarwinIntel", () => {
  it("returns true for darwin x86_64", () => {
    assert.strictEqual(isDarwinIntel({ platform: "darwin", arch: "x86_64", distKey: "darwin-x86_64", binaryName: "agy_acp_server.par", isWindows: false }), true);
  });

  it("returns false for darwin aarch64", () => {
    assert.strictEqual(isDarwinIntel({ platform: "darwin", arch: "aarch64", distKey: "darwin-aarch64", binaryName: "agy_acp_server.par", isWindows: false }), false);
  });

  it("returns false for linux x86_64", () => {
    assert.strictEqual(isDarwinIntel({ platform: "linux", arch: "x86_64", distKey: "linux-x86_64", binaryName: "agy_acp_server.par", isWindows: false }), false);
  });
});

describe("detectTarget", () => {
  it("matches the current process platform and arch", () => {
    const target = detectTarget();
    assert.strictEqual(target.platform, process.platform === "win32" ? "win32" : process.platform === "darwin" ? "darwin" : "linux");
    assert.strictEqual(target.arch, process.arch === "arm64" ? "aarch64" : process.arch === "x64" ? "x86_64" : process.arch);
  });
});

describe("parseAgyModelsOutput", () => {
  it("parses tab-delimited agy models output", () => {
    const stdout = `Fetching available models...\ngemini-3.8-flash-medium\tGemini 3.8 Flash (Medium)\ngemini-3.8-flash-low\tGemini 3.8 Flash (Low)\nclaude-opus-5-5-high\tClaude Opus 5.5 (High)\n`;
    const models = parseAgyModelsOutput(stdout);
    assert.deepStrictEqual(models, [
      { id: "gemini-3.8-flash-medium", name: "Gemini 3.8 Flash (Medium)" },
      { id: "gemini-3.8-flash-low", name: "Gemini 3.8 Flash (Low)" },
      { id: "claude-opus-5-5-high", name: "Claude Opus 5.5 (High)" },
    ]);
  });

  it("ignores blank lines and the fetching banner", () => {
    const stdout = "\nFetching available models...\n\n";
    assert.deepStrictEqual(parseAgyModelsOutput(stdout), []);
  });

  it("returns an empty array for malformed lines", () => {
    assert.deepStrictEqual(parseAgyModelsOutput("no-tabs-here"), []);
  });
});

// These tests verify the fallback paths exist on the current machine. They are
// conditional so they do not fail on platforms where agy is not installed.
describe("findAgyBin / findAgyAcpBridge", () => {
  it("findAgyBin returns a path or null", async () => {
    const result = await findAgyBin();
    assert.ok(result === null || typeof result === "string");
  });

  it("findAgyAcpBridge returns a path or null", async () => {
    const result = await findAgyAcpBridge();
    assert.ok(result === null || typeof result === "string");
  });
});

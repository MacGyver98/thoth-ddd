import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { loadCanonical, splitFrontmatter } from "../src/canonical.js";
import {
  renderTarget,
  TOOL_IDS,
  type GeneratedFile,
} from "../src/targets.js";

const CANONICAL_ROOT = fileURLToPath(new URL("../00-DDD/", import.meta.url));

test("canonical Thoth prompt keeps the working config frontmatter and body", async () => {
  const bundle = await loadCanonical(CANONICAL_ROOT);
  const { frontmatter, body } = splitFrontmatter(bundle.thoth.raw);
  assert.match(frontmatter, /mode: all/);
  assert.match(frontmatter, /#D4A017/);
  assert.match(body, /Document governance model/);
  assert.match(body, /opsx-scribe/);
  assert.ok(body.length > 40_000, "v2 prompt is the expanded English version");
});

test("all seven targets render non-empty, duplicate-free file sets", async () => {
  const bundle = await loadCanonical(CANONICAL_ROOT);
  for (const tool of TOOL_IDS) {
    const files = renderTarget(tool, bundle);
    assert.ok(files.length > 0, `${tool} produced no files`);
    const paths = files.map((f: GeneratedFile) => f.path);
    assert.equal(new Set(paths).size, paths.length, `${tool} has duplicate paths`);
    for (const file of files) {
      assert.ok(file.content.length > 0, `${tool}:${file.path} is empty`);
    }
  }
});

test("full-prompt targets embed the canonical body verbatim", async () => {
  const bundle = await loadCanonical(CANONICAL_ROOT);
  for (const [tool, path] of [
    ["opencode", ".opencode/agents/thoth-domain-scribe.md"],
    ["claude-code", ".claude/agents/thoth-domain-scribe.md"],
    ["antigravity", ".agents/agents/thoth-domain-scribe.md"],
  ] as const) {
    const files = renderTarget(tool, bundle);
    const agent = files.find((f) => f.path === path);
    assert.ok(agent, `${tool} missing ${path}`);
    assert.ok(
      agent!.content.includes(bundle.thoth.body.trim()),
      `${tool} agent does not contain the canonical prompt body`,
    );
  }
});

test("OpenCode target preserves canonical bytes for agents, commands and skills", async () => {
  const bundle = await loadCanonical(CANONICAL_ROOT);
  const files = renderTarget("opencode", bundle);
  const thoth = files.find((f) => f.path === ".opencode/agents/thoth-domain-scribe.md");
  assert.equal(thoth?.content, bundle.thoth.raw);
  for (const command of bundle.commands) {
    const file = files.find((f) => f.path === `.opencode/commands/${command.id}.md`);
    assert.equal(file?.content, command.raw);
  }
  for (const skill of bundle.skills) {
    const file = files.find(
      (f) => f.path === `.opencode/skills/${skill.id}/SKILL.md`,
    );
    assert.equal(file?.content, skill.raw);
  }
});

test("size-capped targets use a gateway and ship the full prompt bundle", async () => {
  const bundle = await loadCanonical(CANONICAL_ROOT);
  for (const tool of ["codex", "gemini-cli", "copilot", "cursor"] as const) {
    const files = renderTarget(tool, bundle);
    assert.ok(
      files.some((f) => f.path.endsWith("THOTH.md")),
      `${tool} missing bundled prompt`,
    );
    assert.ok(
      files.some((f) => f.path.endsWith("LAYOUT.md")),
      `${tool} missing layout contract`,
    );
    const native = files.filter(
      (f) =>
        !f.path.startsWith("documentation/thoth-ddd/") &&
        !f.path.endsWith("SKILL.md"),
    );
    for (const file of native) {
      assert.ok(
        !file.content.includes(bundle.thoth.body.slice(0, 200)),
        `${tool}:${file.path} inlines the full prompt instead of a gateway`,
      );
    }
  }
});

test("documented tool size limits are respected", async () => {
  const bundle = await loadCanonical(CANONICAL_ROOT);
  // Copilot custom agent prompt: 30,000 characters.
  const copilot = renderTarget("copilot", bundle);
  for (const file of copilot.filter((f) => f.path.endsWith(".agent.md"))) {
    assert.ok(
      file.content.length < 30_000,
      `Copilot agent ${file.path} exceeds 30,000 chars`,
    );
  }
  // Codex AGENTS.md: 32 KiB default project_doc_max_bytes.
  const codex = renderTarget("codex", bundle);
  const agentsMd = codex.find((f) => f.path === "AGENTS.md")!;
  assert.ok(Buffer.byteLength(agentsMd.content) < 32 * 1024, "AGENTS.md too large");
  // Cursor guidance: keep rules under 500 lines.
  const cursor = renderTarget("cursor", bundle);
  const rule = cursor.find((f) => f.path.endsWith(".mdc"))!;
  assert.ok(rule.content.split("\n").length < 500, "Cursor rule too long");
});

test("generated prompts carry a tool adapter outside OpenCode", async () => {
  const bundle = await loadCanonical(CANONICAL_ROOT);
  const claude = renderTarget("claude-code", bundle);
  const agent = claude.find(
    (f) => f.path === ".claude/agents/thoth-domain-scribe.md",
  )!;
  assert.match(agent.content, /## Tool adapter — Claude Code/);
  assert.match(agent.content, /subagent\(agent="opsx-scribe"/);
  assert.match(agent.content, /^name: thoth-domain-scribe$/m);
  assert.match(agent.content, /^color: yellow$/m);

  const antigravity = renderTarget("antigravity", bundle);
  const ag = antigravity.find(
    (f) => f.path === ".agents/agents/thoth-domain-scribe.md",
  )!;
  assert.match(ag.content, /^mainAgent: true$/m);
  assert.match(ag.content, /^commandExecutionPolicy: sandbox$/m);
});

test("the Spanish v1 prompt is archived, not lost", async () => {
  const legacy = await readFile(
    fileURLToPath(new URL("../00-DDD/legacy/DDD-Agent.v1.es.md", import.meta.url)),
    "utf8",
  );
  assert.match(legacy, /Prompt maestro/);
  assert.match(legacy, /Identidad del agente/);
});

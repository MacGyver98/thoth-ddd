#!/usr/bin/env node
/**
 * thoth-ddd CLI — generate/install the agent into multiple coding tools.
 *
 * Commands:
 *   thoth-ddd generate [--out DIR] [--tool ID] [--root DIR]
 *   thoth-ddd install <tool> [--target DIR] [--scope project|global] [--dry-run] [--force]
 *   thoth-ddd doctor [--root DIR]
 *   thoth-ddd list
 */
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { loadCanonical } from "./canonical.js";
import { writeGeneratedFiles } from "./install.js";
import {
  renderTarget,
  TOOL_IDS,
  TOOL_LABEL,
  type Scope,
  type ToolId,
} from "./targets.js";

interface ParsedArgs {
  command: string;
  positional: string[];
  flags: Record<string, string | boolean>;
}

function parseArgs(argv: string[]): ParsedArgs {
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};
  let command = "";
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        flags[key] = next;
        i += 1;
      } else {
        flags[key] = true;
      }
    } else if (!command) {
      command = arg;
    } else {
      positional.push(arg);
    }
  }
  return { command, positional, flags };
}

function asToolId(value: string): ToolId {
  if (!TOOL_IDS.includes(value as ToolId)) {
    throw new Error(`unknown tool "${value}". Available: ${TOOL_IDS.join(", ")}`);
  }
  return value as ToolId;
}

function asScope(value: unknown): Scope {
  if (value === undefined) return "project";
  if (value !== "project" && value !== "global") {
    throw new Error("--scope must be project or global");
  }
  return value;
}

function strFlag(flags: Record<string, string | boolean>, key: string): string | undefined {
  const value = flags[key];
  return typeof value === "string" ? value : undefined;
}

function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 12);
}

async function exists(path: string): Promise<boolean> {
  try {
    await readFile(path);
    return true;
  } catch {
    return false;
  }
}

async function cmdGenerate(args: ParsedArgs): Promise<void> {
  const bundle = await loadCanonical(strFlag(args.flags, "root"));
  const out = resolve(strFlag(args.flags, "out") ?? "generated");
  const tools = args.flags.tool
    ? [asToolId(String(args.flags.tool))]
    : [...TOOL_IDS];

  let total = 0;
  for (const tool of tools) {
    const files = renderTarget(tool, bundle);
    const results = await writeGeneratedFiles(files, { targetDir: join(out, tool) });
    const created = results.filter((r) => r.action !== "unchanged").length;
    total += created;
    console.log(`${TOOL_LABEL[tool]}: ${files.length} files (${created} written)`);
  }
  console.log(`Generated ${total} files under ${out}`);
}

async function cmdInstall(args: ParsedArgs): Promise<void> {
  const tool = asToolId(args.positional[0] ?? "");
  const scope = asScope(args.flags.scope);
  const targetDir = resolve(strFlag(args.flags, "target") ?? ".");
  const bundle = await loadCanonical(strFlag(args.flags, "root"));
  const files = renderTarget(tool, bundle, { scope });
  const results = await writeGeneratedFiles(files, {
    targetDir,
    force: Boolean(args.flags.force),
    dryRun: Boolean(args.flags["dry-run"]),
  });

  const counts = new Map<string, number>();
  for (const result of results) {
    counts.set(result.action, (counts.get(result.action) ?? 0) + 1);
  }
  const summary = [...counts.entries()]
    .map(([action, count]) => `${action}=${count}`)
    .join(" ");
  console.log(`${TOOL_LABEL[tool]} (${scope}): ${summary}`);
  for (const result of results.filter((r) => r.action === "skipped")) {
    console.log(`  skipped (use --force): ${result.path}`);
  }
}

async function cmdDoctor(args: ParsedArgs): Promise<void> {
  const bundle = await loadCanonical(strFlag(args.flags, "root"));
  const configDir = join(homedir(), ".config", "opencode");
  const compare: Array<[string, string]> = [
    [join(configDir, "agents", "thoth-domain-scribe.md"), bundle.thoth.raw],
    [join(configDir, "agents", "opsx-scribe.md"), bundle.opsx.raw],
    ...bundle.commands.map(
      (doc) => [join(configDir, "commands", `${doc.id}.md`), doc.raw] as [string, string],
    ),
    ...bundle.skills.map(
      (skill) =>
        [join(configDir, "skills", skill.id, "SKILL.md"), skill.raw] as [string, string],
    ),
  ];

  let drift = 0;
  for (const [path, canonical] of compare) {
    if (!(await exists(path))) {
      console.log(`MISSING  ${path}`);
      continue;
    }
    const current = await readFile(path, "utf8");
    if (current === canonical) {
      console.log(`OK       ${sha256(canonical)}  ${path}`);
    } else {
      drift += 1;
      console.log(`DRIFT    ${sha256(current)} != ${sha256(canonical)}  ${path}`);
    }
  }
  console.log(`\n${drift} drifted file(s) in ${configDir}`);

  // Size gates that motivated the gateway architecture.
  for (const tool of TOOL_IDS) {
    const files = renderTarget(tool, bundle);
    const biggest = files.reduce(
      (max, file) => (file.content.length > max.content.length ? file : max),
      files[0],
    );
    console.log(
      `  ${TOOL_LABEL[tool].padEnd(20)} ${String(biggest.content.length).padStart(6)} chars  ${biggest.path}`,
    );
  }
  if (drift > 0) process.exitCode = 1;
}

function usage(): void {
  console.log(`thoth-ddd — multi-tool DDD agent distribution

Usage:
  thoth-ddd generate [--out DIR] [--tool ID] [--root DIR]
  thoth-ddd install <tool> [--target DIR] [--scope project|global] [--dry-run] [--force]
  thoth-ddd doctor [--root DIR]
  thoth-ddd list

Tools: ${TOOL_IDS.join(", ")}`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  switch (args.command) {
    case "generate":
      return cmdGenerate(args);
    case "install":
      return cmdInstall(args);
    case "doctor":
      return cmdDoctor(args);
    case "list":
      console.log(TOOL_IDS.map((id) => `${id.padEnd(14)} ${TOOL_LABEL[id]}`).join("\n"));
      return;
    default:
      usage();
      if (args.command && args.command !== "help") process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(`thoth-ddd: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});

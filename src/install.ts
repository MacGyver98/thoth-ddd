/** Filesystem side of the generator: safe, idempotent installation. */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join } from "node:path";
import {
  MANAGED_BEGIN,
  MANAGED_END,
  type GeneratedFile,
} from "./targets.js";

/** Files that must be merged instead of overwritten (users may own them). */
export const MANAGED_FILES = new Set([
  "AGENTS.md",
  "GEMINI.md",
  ".github/copilot-instructions.md",
]);

export type WriteAction =
  | "created"
  | "updated"
  | "unchanged"
  | "skipped"
  | "dry-run";

export interface WriteResult {
  path: string;
  action: WriteAction;
}

function extractManaged(generated: string): string {
  const start = generated.indexOf(MANAGED_BEGIN);
  const end = generated.indexOf(MANAGED_END, start);
  if (start === -1 || end === -1) return generated.trim();
  return generated.slice(start, end + MANAGED_END.length).trim();
}

/** Replace an existing managed block or append one; never drop other content. */
export function mergeManaged(existing: string, generated: string): string {
  const block = extractManaged(generated);
  const start = existing.indexOf(MANAGED_BEGIN);
  const end = existing.indexOf(MANAGED_END, start);
  if (start === -1 || end === -1) {
    const trimmed = existing.replace(/\s+$/, "");
    return `${trimmed}\n\n${block}\n`;
  }
  return `${existing.slice(0, start)}${block}${existing.slice(end + MANAGED_END.length)}`;
}

export interface WriteOptions {
  targetDir: string;
  force?: boolean;
  dryRun?: boolean;
}

export async function writeGeneratedFiles(
  files: GeneratedFile[],
  options: WriteOptions,
): Promise<WriteResult[]> {
  const results: WriteResult[] = [];

  // Fail before any write on duplicate destinations.
  const seen = new Set<string>();
  for (const file of files) {
    const full = isAbsolute(file.path)
      ? file.path
      : join(options.targetDir, file.path);
    if (seen.has(full)) throw new Error(`duplicate output path: ${file.path}`);
    seen.add(full);
  }

  for (const file of files) {
    const full = isAbsolute(file.path)
      ? file.path
      : join(options.targetDir, file.path);
    const relative = full.startsWith(options.targetDir)
      ? full.slice(options.targetDir.length + 1)
      : full;
    let existing: string | undefined;
    try {
      existing = await readFile(full, "utf8");
    } catch {
      existing = undefined;
    }

    const isManaged = MANAGED_FILES.has(file.path);
    let next = file.content;
    let action: WriteAction;

    if (existing !== undefined && isManaged) {
      next = mergeManaged(existing, file.content);
      action = next === existing ? "unchanged" : "updated";
    } else if (existing === undefined) {
      action = "created";
    } else if (existing === file.content) {
      action = "unchanged";
    } else if (options.force) {
      action = "updated";
    } else {
      action = "skipped";
    }

    if (options.dryRun) {
      results.push({ path: relative, action: "dry-run" });
      continue;
    }

    if (action === "created" || action === "updated") {
      await mkdir(dirname(full), { recursive: true });
      await writeFile(full, next, "utf8");
    }
    results.push({ path: relative, action });
  }

  return results;
}

/**
 * Canonical source loader.
 *
 * `00-DDD/` is the single source of truth for every generated artifact.
 * Nothing in this module writes files; it only reads and normalizes the
 * canonical markdown assets.
 */
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

export interface FrontmatterDoc {
  /** Stable id used to derive output filenames. */
  id: string;
  /** Absolute path of the canonical source. */
  source: string;
  /** Raw file, including frontmatter. */
  raw: string;
  /** YAML frontmatter block without the `---` delimiters (may be empty). */
  frontmatter: string;
  /** Markdown body without frontmatter. */
  body: string;
}

export interface CanonicalBundle {
  root: string;
  thoth: FrontmatterDoc;
  opsx: FrontmatterDoc;
  commands: FrontmatterDoc[];
  skills: Array<{ id: string; source: string; raw: string }>;
  /** Raw layout contract (`00-DDD/LAYOUT.md`). */
  layout: string;
}

/** Split a leading YAML frontmatter block from the markdown body. */
export function splitFrontmatter(raw: string): {
  frontmatter: string;
  body: string;
} {
  if (!raw.startsWith("---\n")) return { frontmatter: "", body: raw };
  const end = raw.indexOf("\n---\n", 4);
  if (end === -1) return { frontmatter: "", body: raw };
  return {
    frontmatter: raw.slice(4, end),
    body: raw.slice(end + 5),
  };
}

/**
 * Read a scalar value from a one-line YAML frontmatter field.
 * Handles double-quoted values and plain scalars; sufficient for the
 * canonical metadata (`description`, `model`, ...).
 */
export function frontmatterValue(frontmatter: string, key: string): string | undefined {
  const needle = new RegExp(`^${key}:\\s*(.+)\\s*$`, "m");
  const match = frontmatter.match(needle);
  if (!match) return undefined;
  return match[1].trim().replace(/^"(.*)"$/, "$1").trim();
}

async function loadDoc(source: string, id: string): Promise<FrontmatterDoc> {
  const raw = await readFile(source, "utf8");
  return { id, source, raw, ...splitFrontmatter(raw) };
}

/** Load all canonical assets from `<root>/00-DDD`. */
export async function loadCanonical(root?: string): Promise<CanonicalBundle> {
  const base = root ?? join(process.cwd(), "00-DDD");

  const commandDir = join(base, "commands");
  const skillDir = join(base, "skills");

  const commandFiles = (await readdir(commandDir))
    .filter((name) => name.endsWith(".md"))
    .sort();
  const skillIds = (await readdir(skillDir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const commands = await Promise.all(
    commandFiles.map((file) =>
      loadDoc(join(commandDir, file), file.replace(/\.md$/, "")),
    ),
  );

  const skills = await Promise.all(
    skillIds.map(async (id) => {
      const source = join(skillDir, id, "SKILL.md");
      return { id, source, raw: await readFile(source, "utf8") };
    }),
  );

  return {
    root: base,
    thoth: await loadDoc(join(base, "DDD-Agent.md"), "thoth-domain-scribe"),
    opsx: await loadDoc(join(base, "agents", "opsx-scribe.md"), "opsx-scribe"),
    commands,
    skills,
    layout: await readFile(join(base, "LAYOUT.md"), "utf8"),
  };
}

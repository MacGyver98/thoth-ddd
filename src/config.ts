import { homedir } from "node:os";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Loaded plugin configuration.
 *
 * Only the model override survives plan v2 — `agent_order` was cut as
 * unverifiable/unrequested.
 */
export interface PluginConfig {
  agentModel?: string;
}

/** Default config path honoring XDG_CONFIG_HOME when set. */
function defaultConfigPath(): string {
  const xdg = process.env.XDG_CONFIG_HOME;
  const base = xdg && xdg.length > 0 ? xdg : join(homedir(), ".config");
  return join(base, "opencode", "thoth-ddd.jsonc");
}

/**
 * Minimal JSONC stripper: removes `//` line comments, `/* *​/` block comments,
 * and trailing commas. No dependency — good enough for a config file.
 */
function stripJsonc(raw: string): string {
  let out = "";
  let i = 0;
  let inString = false;
  while (i < raw.length) {
    const ch = raw[i];
    const next = raw[i + 1];
    if (inString) {
      out += ch;
      if (ch === "\\") {
        out += next ?? "";
        i += 2;
        continue;
      }
      if (ch === '"') inString = false;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inString = true;
      out += ch;
      i += 1;
      continue;
    }
    if (ch === "/" && next === "/") {
      while (i < raw.length && raw[i] !== "\n") i += 1;
      continue;
    }
    if (ch === "/" && next === "*") {
      i += 2;
      while (i < raw.length && !(raw[i] === "*" && raw[i + 1] === "/")) i += 1;
      i += 2;
      continue;
    }
    if (ch === ",") {
      // Look ahead past whitespace for a closing brace/bracket → trailing comma.
      let j = i + 1;
      while (j < raw.length && /\s/.test(raw[j])) j += 1;
      if (raw[j] === "}" || raw[j] === "]") {
        i += 1;
        continue;
      }
    }
    out += ch;
    i += 1;
  }
  return out;
}

/**
 * Load the plugin config.
 *
 * - Default path: `~/.config/opencode/thoth-ddd.jsonc` (or
 *   `$XDG_CONFIG_HOME/opencode/thoth-ddd.jsonc` when XDG_CONFIG_HOME is set).
 * - `configPath` overrides the path entirely (tests inject temp files).
 * - Missing file, unreadable file, or parse failure → `{}`. Never throws.
 */
export async function loadPluginConfig(options?: {
  configPath?: string;
}): Promise<PluginConfig> {
  const path = options?.configPath ?? defaultConfigPath();
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    try {
      parsed = JSON.parse(stripJsonc(raw));
    } catch {
      return {};
    }
  }

  if (typeof parsed !== "object" || parsed === null) return {};

  const agents = (parsed as Record<string, unknown>).agents;
  if (typeof agents !== "object" || agents === null) return {};

  const thoth = (agents as Record<string, unknown>)["thoth-domain-scribe"];
  if (typeof thoth !== "object" || thoth === null) return {};

  const model = (thoth as Record<string, unknown>).model;
  if (typeof model !== "string" || model.length === 0) return {};

  return { agentModel: model };
}
/**
 * OpenCode agent definitions, derived from the canonical prompts at build time.
 * The `?raw` imports are inlined by bun, so dist/index.js is self-contained.
 */
import thothRaw from "../../00-DDD/DDD-Agent.md" with { type: "text" };
import opsxRaw from "../../00-DDD/agents/opsx-scribe.md" with { type: "text" };
import { frontmatterValue, splitFrontmatter } from "../canonical.js";
import type { Config } from "@opencode-ai/plugin";
import type { PluginConfig } from "../config.js";

type AgentConfig = NonNullable<Config["agent"]>[string];

export const THOTH_AGENT_NAME = "thoth-domain-scribe";
export const OPSX_AGENT_NAME = "opsx-scribe";

const thoth = splitFrontmatter(thothRaw);
const opsx = splitFrontmatter(opsxRaw);

/** Agents injected by the plugin. Keyed by OpenCode agent id. */
export function thothAgents(config: PluginConfig = {}): Record<string, AgentConfig> {
  return {
    [THOTH_AGENT_NAME]: {
      description: frontmatterValue(thoth.frontmatter, "description"),
      model: config.agentModel ?? frontmatterValue(thoth.frontmatter, "model"),
      mode: "all",
      color: "#D4A017",
      prompt: thoth.body,
      permission: {
        // The prompt enforces path scope; OpenCode's JSON API only accepts
        // coarse values here, so writes are confirmed rather than blocked.
        edit: "ask",
        bash: {
          "*": "deny",
          "git *": "allow",
          "ls*": "allow",
          "mkdir*": "allow",
          "cat *": "allow",
          "head *": "allow",
        },
        external_directory: "ask",
      },
    },
    [OPSX_AGENT_NAME]: {
      description: frontmatterValue(opsx.frontmatter, "description"),
      model: config.agentModel ?? frontmatterValue(opsx.frontmatter, "model"),
      mode: "subagent",
      color: "#8E44AD",
      prompt: opsx.body,
      permission: { edit: "allow", bash: "allow" },
    },
  };
}

/** Exposed for tests: body of the canonical Thoth prompt. */
export const thothPromptBody = thoth.body;

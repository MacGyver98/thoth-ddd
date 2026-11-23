# Target installation reference

All targets are generated from `00-DDD/` by `src/targets.ts`. Run `bun run generate` to
inspect every output tree under `generated/`, or `thoth-ddd install <tool> --target DIR`.

## Delivery modes

| Mode | Tools | Reason |
| --- | --- | --- |
| **Full prompt** | OpenCode, Claude Code, Google Antigravity | Native agent files have no documented hard size cap. The complete 44 KB prompt is embedded. |
| **Gateway + bundle** | Codex, Gemini CLI, Copilot, Cursor | Copilot caps custom-agent prompts at 30,000 chars; Codex caps `AGENTS.md` at 32 KiB; Cursor recommends rules under 500 lines. The native file is short and points to `documentation/thoth-ddd/THOTH.md`. |

Every non-OpenCode prompt gets an **adapter** preamble mapping:
`skill(name="opsx-X")`, `subagent(agent="opsx-scribe", …)`, `task(category=…)`, `bash`/`grep`/`glob`
and the permission model to generic equivalents.

## OpenCode

```bash
thoth-ddd install opencode --target /path/to/repo
```

Writes `.opencode/agents/{thoth-domain-scribe,opsx-scribe}.md`, five
`.opencode/commands/opsx-*.md`, four `.opencode/skills/openspec-*/SKILL.md`, plus the bundle.

Alternatively install the **plugin** (`plugins: ["thoth-ddd"]`) — it injects the two agents
through a merging config hook. Do not use both mechanisms in the same project (duplicate ids).

**Reference:** https://opencode.ai/docs/agents, https://opencode.ai/docs/commands,
https://opencode.ai/docs/skills

## Claude Code

```bash
thoth-ddd install claude-code --target /path/to/repo
```

Writes `.claude/agents/{thoth-domain-scribe,opsx-scribe}.md` (frontmatter translated to
`name`, `description`, `model: inherit`, `color`, `tools`), `.claude/commands/opsx-*.md`
and `.claude/skills/openspec-*/SKILL.md`.

Notes:
- `color` uses a supported name (`yellow` / `purple`), not the canonical hex value.
- Claude Code does not support path-scoped tool permissions; the prompt enforces the write scope.

**Reference:** https://code.claude.com/docs/en/sub-agents, https://code.claude.com/docs/en/skills

## Google Antigravity

```bash
thoth-ddd install antigravity --target /path/to/repo
```

Writes `.agents/agents/*.md` (frontmatter: `name`, `description`, `model`, `mainAgent`,
`subagent`, `commandExecutionPolicy`, `tools`), `.agents/rules/thoth-ddd-layout.md`
(`trigger: model_decision`) and skills under `.agents/skills/`. The five commands are also
emitted as skills so `/opsx-*` slash commands are available.

Antigravity scans one level deep, so all skill folders sit directly under `.agents/skills/`.

**Reference:** https://antigravity.google/docs/customization-discovery/,
https://antigravity.google/docs/subagents/, https://antigravity.google/docs/skills/

## OpenAI Codex

```bash
thoth-ddd install codex --target /path/to/repo
```

Appends a managed block to `AGENTS.md` and writes the bundle. The installer preserves any
existing instructions and replaces only the content between
`<!-- thoth-ddd:begin -->` / `<!-- thoth-ddd:end -->`.

Codex reads `AGENTS.md` from the git root down to the working directory, concatenating at
most one file per directory, with a 32 KiB default combined limit (`project_doc_max_bytes`).

**Reference:** https://learn.chatgpt.com/docs/agent-configuration/agents-md.md

## Gemini CLI

```bash
thoth-ddd install gemini-cli --target /path/to/repo
```

Appends a managed block to `GEMINI.md` that imports the bundled prompt with
`@./documentation/thoth-ddd/THOTH.md` (Gemini's Memory Import Processor). The import is a
pointer, not a copy, so regenerate the bundle after editing canonical sources.

**Reference:** https://geminicli.com/docs/cli/gemini-md/

## GitHub Copilot

```bash
thoth-ddd install copilot --target /path/to/repo
```

Writes `.github/agents/thoth-domain-scribe.agent.md` and
`.github/agents/opsx-scribe.agent.md` (custom agent profiles) plus a managed block in
`.github/copilot-instructions.md`. Profiles use `include-custom-instructions: true`.

The profiles are gateways: the 30,000-character prompt cap makes inlining the 44 KB prompt
impossible. Both profiles instruct the agent to read `documentation/thoth-ddd/THOTH.md`.

**Reference:** https://docs.github.com/en/copilot/reference/custom-agents-configuration

## Cursor

```bash
thoth-ddd install cursor --target /path/to/repo
```

Writes a single intelligent rule at `.cursor/rules/thoth-ddd.mdc`
(`alwaysApply: false` + `description`, so the agent pulls it in when relevant) plus the bundle.
Cursor ignores plain `.md` files in `.cursor/rules/`, hence the `.mdc` extension.

The rule is kept short per Cursor's "under 500 lines" guidance.

**Reference:** https://cursor.com/docs/context/rules

## Global scope

```bash
thoth-ddd install claude-code --scope global --target ~
```

Native files go to the tool's user-level config directory; the bundle is written to
`~/.config/thoth-ddd/bundle` and referenced by absolute path. Global installation does not
create the target repository layout — each repo you work on still needs `00-DDD/`,
`documentation/` and `openspec/`.

## Safety rules

- Existing `AGENTS.md`, `GEMINI.md` and `.github/copilot-instructions.md` are **merged**, never replaced.
- Other existing files are skipped unless `--force` is passed.
- `--dry-run` prints actions without writing.
- Re-running an install is idempotent.

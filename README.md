# thoth-ddd

**One DDD agent, installable everywhere.**

`thoth-ddd` publishes **Thoth — DDD Domain Scribe**: an agent that turns a free-form
business description into governed DDD artifacts — bounded contexts, ubiquitous language,
aggregates, invariants, ADRs, OpenSpec changes and user journeys.

The canonical sources live in [`00-DDD/`](00-DDD/). Everything else is generated from them.

## What ships

| Asset | Purpose |
| --- | --- |
| `thoth-domain-scribe` | Main agent. Strategic (7 tasks) and tactical (6 tasks) modes, Phase 0.5 integrity audit, DDD→ADR→SPEC→CODE cascade, V.2 anti-proliferation governance. |
| `opsx-scribe` | Sub-agent with exclusive ownership of the OpenSpec lifecycle. |
| 5 `opsx-*` commands | `explore`, `propose`, `apply`, `orchestrate`, `archive`. |
| 4 OpenSpec skills | `openspec-explore`, `openspec-propose`, `openspec-apply-change`, `openspec-archive-change`. |

## Supported tools

| Tool | Mode | Install target |
| --- | --- | --- |
| OpenCode | native agent + plugin | `.opencode/agents/`, `.opencode/commands/`, `.opencode/skills/` |
| Claude Code | native subagents | `.claude/agents/`, `.claude/commands/`, `.claude/skills/` |
| Google Antigravity | native agents + rules + skills | `.agents/` |
| OpenAI Codex | gateway | `AGENTS.md` + generated bundle |
| Gemini CLI | gateway + `@` import | `GEMINI.md` + generated bundle |
| GitHub Copilot | custom agent profiles | `.github/agents/` + `copilot-instructions.md` |
| Cursor | intelligent rule | `.cursor/rules/thoth-ddd.mdc` |

Full details: [docs/TARGETS.md](docs/TARGETS.md).

## Install

### As a CLI (any tool)

```bash
npm install -g thoth-ddd          # once published
# or from a clone:
bun install && bun run build
```

Preview what would be written:

```bash
node dist/cli.js install claude-code --target /path/to/repo --dry-run
```

Install into a repository:

```bash
node dist/cli.js install opencode    --target /path/to/repo
node dist/cli.js install claude-code --target /path/to/repo
node dist/cli.js install antigravity --target /path/to/repo
node dist/cli.js install codex       --target /path/to/repo
node dist/cli.js install gemini-cli  --target /path/to/repo
node dist/cli.js install copilot     --target /path/to/repo
node dist/cli.js install cursor      --target /path/to/repo
```

Use `--scope global` for user-wide config, `--force` to overwrite differing files, and
`--tool` in `generate` to render a single target.

### As an OpenCode plugin

Add to `opencode.json`:

```json
{
  "plugins": ["thoth-ddd"]
}
```

Or point at a local checkout from the consuming project:

```json
{
  "plugins": ["./path/to/thoth-ddd/dist"]
}
```

This repository intentionally has **no project-level `opencode.json`**; OpenCode is driven by
your local/global configuration. The plugin's `config` hook **merges** the two agents into
`config.agent`, so built-in agents
and other plugins are never displaced.

Override the model in `~/.config/opencode/thoth-ddd.jsonc` (see
[`config.example.jsonc`](config.example.jsonc)):

```jsonc
{
  "agents": {
    "thoth-domain-scribe": { "model": "opencode-go/qwen3.7-plus" }
  }
}
```

## Target-repository layout contract

Thoth is opinionated. It expects — and writes only to — this layout:

```
00-DDD/                      # strategic 01..07 + tactical subfolders
documentation/02-adr/        # ADRs
documentation/07-ux-ui/flows/
documentation/AGENTS.md
openspec/changes/<id>/       # opsx-scribe only
openspec/specs/              # opsx-scribe only
documentation/thoth-ddd/     # generated, read-only agent bundle
```

The full contract is [`00-DDD/LAYOUT.md`](00-DDD/LAYOUT.md). Missing directories are created
on demand; existing files are not silently overwritten.

## Why some tools get a gateway

The canonical prompt is ~44 KB. GitHub Copilot caps custom-agent prompts at 30,000 characters
and Codex caps `AGENTS.md` at 32 KiB by default; Cursor recommends rules under 500 lines.
Those targets receive a short **gateway** plus a read-only full prompt bundle at
`documentation/thoth-ddd/`. OpenCode, Claude Code and Antigravity embed the full prompt
directly. Every non-OpenCode prompt gets a short adapter that maps OpenCode tool calls
(`skill()`, `subagent()`, `task()`) to generic capabilities.

## Development

```bash
bun install
bun run build       # dist/index.js + dist/cli.js
bun run typecheck
bun test test/
bun run generate    # generated/ sample output for all targets
bun run doctor      # drift check against ~/.config/opencode + size gates
```

`bun run doctor` reports `OK` / `DRIFT` / `MISSING` for every canonical asset compared with
the previously working OpenCode config, then prints the largest rendered file per tool.

## Origin

Until 2026-11-22 the working agent lived in `~/.config/opencode` (repo
`MacGyver98/opencode-config`). All 11 assets were imported byte-identically; the Spanish v1
prompt is preserved in `00-DDD/legacy/`. From now on **this repository is the source of
truth**.

## License

MIT

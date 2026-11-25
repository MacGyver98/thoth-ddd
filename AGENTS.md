# PROJECT KNOWLEDGE BASE

**Updated:** 2026-11-22 (v3 — canonical source + multi-tool distribution)
**Repo:** https://github.com/MacGyver98/thoth-ddd

## OVERVIEW

**thoth-ddd** publishes one agent — **Thoth — DDD Domain Scribe** — to multiple coding
tools from a single canonical source in `00-DDD/`. Thoth transforms a free-form business
description into governed DDD artifacts (strategic/tactical models, ubiquitous language,
aggregates, ADRs and user journeys).

**Stack:** TypeScript (ESM), bun build, `@opencode-ai/plugin` SDK, `node:test`

## STRUCTURE

```
thoth-ddd/
├── 00-DDD/                      # CANONICAL SOURCE OF TRUTH (English v2)
│   ├── DDD-Agent.md             # Thoth master prompt (44 KB, frontmatter + body)
│   ├── LAYOUT.md                # Mandatory target-repo layout contract
│   ├── agent-naming.md          # Naming research → Thoth selected
│   └── legacy/DDD-Agent.v1.es.md# Archived Spanish v1 (do not use)
├── src/
│   ├── index.ts                 # PluginModule: merging `config` hook
│   ├── config.ts                # thoth-ddd.jsonc loader (model override)
│   ├── canonical.ts             # canonical asset loader (read-only)
│   ├── targets.ts               # pure renderers for all 7 tools
│   ├── install.ts               # idempotent, managed-block-safe writer
│   ├── cli.ts                   # generate | install | doctor | list
│   ├── agents/thoth.ts          # agent definitions from canonical prompts
│   └── types/assets.d.ts        # markdown import attributes
├── test/                        # node:test suite
├── docs/PLAN-v3.md              # Current work plan
├── docs/TARGETS.md              # Per-tool installation reference
├── generated/                   # gitignored sample output of all targets
└── dist/                        # gitignored build output
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Agent behavior | `00-DDD/DDD-Agent.md` | English v2; imported from the working `~/.config/opencode` agent |
| Layout contract | `00-DDD/LAYOUT.md` | Hardcoded paths adopters must provide |
| Generator | `src/targets.ts` | No I/O; returns `{path, content}` per tool |
| Installer | `src/install.ts` | Merge-safe, idempotent |
| Plugin entry | `src/index.ts` | `PluginModule.server` with merging config hook |
| Current plan | `docs/PLAN-v3.md` | Replaces the old `.omo/plans/thoth-ddd-plugin.md` |

## CODE MAP

| Symbol | Type | Location | Role |
|--------|------|----------|------|
| `loadCanonical` | fn | `src/canonical.ts` | Reads all canonical assets from `00-DDD/` |
| `splitFrontmatter` | fn | `src/canonical.ts` | Separates YAML frontmatter from Markdown body |
| `renderTarget` | fn | `src/targets.ts` | Canonical bundle → file set for one tool |
| `adapterFor` | fn | `src/targets.ts` | Tool-portability preamble for non-OpenCode targets |
| `managedBlock` | fn | `src/targets.ts` | Idempotent marker wrapper for user-owned files |
| `mergeManaged` | fn | `src/install.ts` | Replaces only the managed block, keeps user content |
| `thothAgents` | fn | `src/agents/thoth.ts` | OpenCode agent definitions (prompt inlined at build) |

## CONVENTIONS

- **Canonical language:** English (v2). Spanish v1 is archived for reference only.
- **Build:** `bun build src/index.ts src/cli.ts --outdir dist --target node --format esm`
- **Test:** `bun test test/`; **Typecheck:** `tsc --noEmit`
- **Prompt import:** ES import attributes `with { type: "text" }` — NOT `?raw` (bun could not
  resolve `?raw` for paths outside `src/`), and NOT a template literal (the prompt has backticks).
- **Plugin hook:** `config` hook MERGES agents into `config.agent`; never replaces.
- **Delivery modes:** full prompt for OpenCode/Claude Code/Antigravity; gateway + generated
  bundle for Codex/Gemini CLI/Copilot/Cursor (30k / 32 KiB / 500-line limits).

## ANTI-PATTERNS (THIS PROJECT)

- **NEVER** replace `config.agent` wholesale — built-in agents must survive.
- **NEVER** embed the prompt as a template literal — it contains backticks.
- **NEVER** hand-edit generated output in `generated/` or a consumer's
  `documentation/thoth-ddd/` — change `00-DDD/` and regenerate.
- **NEVER** overwrite a user-owned `AGENTS.md` / `GEMINI.md` / `copilot-instructions.md`;
  use the managed block markers.
- **NEVER** add runtime dependencies beyond `@opencode-ai/plugin`.
- **NEVER** modify oh-my-opencode, `oh-my-openagent.json`, or other plugins' files.
- **NEVER** use `--pure` in smoke tests (it disables plugins).
- **NEVER** commit `.env*`, `node_modules/`, `dist/`, `generated/`, or `.omo/`.

## UNIQUE STYLES

- Thoth color `#D4A017` (gold)
- OpenCode mode: `all` for Thoth
- Canonical default model in frontmatter: `opencode-go/qwen3.7-plus`
- Config override: `~/.config/opencode/thoth-ddd.jsonc`

## COMMANDS

```bash
bun install
bun run build       # dist/index.js + dist/cli.js
bun run typecheck
bun test test/
bun run generate    # sample output for all 7 tools -> generated/
bun run doctor      # canonical vs ~/.config/opencode drift + size gates
node dist/cli.js install claude-code --target /path/to/repo
node dist/cli.js install codex --target /path/to/repo --dry-run
```

## NOTES

- `~/.config/opencode` (repo `MacGyver98/opencode-config`) was the de-facto source until
  2026-11-22. This repo is now canonical; `bun run doctor` detects future drift.
- There is intentionally **no project-level `opencode.json`** in this repo — OpenCode uses
  the local/global configuration. Do not re-add one without an explicit decision.
- Re-export changes in `00-DDD/` must be followed by a re-sync of any installed target.
- The old plan at `.omo/plans/thoth-ddd-plugin.md` describes v2 OpenCode-only work; it is
  superseded by `docs/PLAN-v3.md`.

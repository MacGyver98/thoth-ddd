# PROJECT KNOWLEDGE BASE

**Generated:** 2026-08-09 13:52:58 UTC
**Branch:** none (not yet git-init'd)
**Commit:** none

## OVERVIEW

OpenCode plugin **thoth-ddd** — ships one agent (**Thoth — DDD Domain Scribe**) that transforms free-form business descriptions into structured DDD artifacts (bounded contexts, ubiquitous language, aggregates, invariants, ADRs) via seven sequential tasks.

**Stack:** TypeScript (ESM), bun build, `@opencode-ai/plugin` SDK, `node:test`

## STRUCTURE

```
thoth-ddd/
├── 00-DDD/              # Design docs (Spanish) — DDD agent prompt + naming decisions
│   ├── DDD-Agent.md     # 7-task DDD agent prompt (source of truth for agent behavior)
│   └── agent-naming.md  # Naming research → Thoth selected
├── .omo/                # OpenCode planning artifacts
│   ├── plans/           # Work plan for implementation
│   ├── drafts/          # Draft versions
│   └── run-continuation/
├── src/                 # (planned) Plugin source — not yet created
│   ├── index.ts         # PluginModule entry with merging config hook
│   ├── agents/          # Thoth agent factory + prompt asset
│   └── config.ts        # thoth-ddd.jsonc loader
├── commands/            # (planned) /thoth:* command placeholders
├── skills/              # (planned) Skill placeholders
├── test/                # (planned) node:test unit suite
├── dist/                # (planned) bun build output
├── package.json         # (planned) name: thoth-ddd, ESM, exports: ./dist/index.js
├── tsconfig.json        # (planned) NodeNext, strict, ES2022
└── README.md            # (planned)
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Agent behavior definition | `00-DDD/DDD-Agent.md` | 7-task DDD workflow, Spanish |
| Plugin naming/identity | `00-DDD/agent-naming.md` | Thoth — DDD Domain Scribe |
| Implementation plan | `.omo/plans/thoth-ddd-plugin.md` | Full 10-todo work plan with acceptance criteria |
| Plugin entry (when built) | `src/index.ts` | PluginModule default export |
| Agent config (when built) | `src/agents/thoth.ts` | thothAgent() factory |
| Config loader (when built) | `src/config.ts` | Reads `~/.config/opencode/thoth-ddd.jsonc` |

## CODE MAP

Greenfield — no source code exists yet. Design docs only.

| Symbol | Type | Location | Role |
|--------|------|----------|------|
| DDD-Agent.md | Markdown | `00-DDD/` | Agent prompt (7 DDD tasks) |
| agent-naming.md | Markdown | `00-DDD/` | Naming decisions |
| thoth-ddd-plugin.md | Markdown | `.omo/plans/` | Implementation plan |

## CONVENTIONS

- **Language:** Design docs are in Spanish; code will be English
- **Build:** `bun build src/index.ts --outdir dist --target node --format esm`
- **Test:** `node --test test/` (or `bun test test/`)
- **Typecheck:** `tsc --noEmit`
- **Plugin hook:** Config hook MERGES agent into `config.agent` (never replaces — built-in agents must survive)
- **Prompt import:** `?raw` import (NOT template literal — source has 9 backticks)

## ANTI-PATTERNS (THIS PROJECT)

- **NEVER** replace `config.agent` wholesale — must spread+merge or built-in agents (plan/build/general/explore) disappear
- **NEVER** embed prompt as template literal — the source file contains backticks that break compilation
- **NEVER** translate or edit the DDD-Agent.md prompt — byte-identical copy into `src/agents/thoth-prompt.md`
- **NEVER** add runtime dependencies beyond `@opencode-ai/plugin`
- **NEVER** modify oh-my-opencode, oh-my-openagent.json, or any other plugin's files
- **NEVER** use `--pure` flag (disables plugins) in smoke tests
- **NEVER** commit `.env*`, `node_modules/`, `dist/`, or `.omo/`

## UNIQUE STYLES

- Agent color: `#D4A017` (Thoth gold)
- Agent mode: `"all"` (TAB-visible + subagent-usable)
- Default model: `opencode/big-pickle`
- Config override path: `~/.config/opencode/thoth-ddd.jsonc`

## COMMANDS

```bash
bun run build      # bun build src/index.ts --outdir dist --target node --format esm
bun run typecheck  # tsc --noEmit
bun test test/     # node:test unit suite
```

## NOTES

- Plugin registers in observatorio-educativo's `opencode.json` via absolute path (not npm name)
- The work plan at `.omo/plans/thoth-ddd-plugin.md` has 10 implementation todos with full acceptance criteria
- `00-DDD/DDD-Agent.md` is the canonical agent prompt — any changes to agent behavior start there

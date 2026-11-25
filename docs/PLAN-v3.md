# thoth-ddd v3 — canonical source + multi-tool distribution

**Date:** 2026-11-22
**Status:** in progress

## Why

`~/.config/opencode` accumulated the real, working agent (44 KB English v2 prompt,
`opsx-scribe` sub-agent, 5 `opsx-*` commands, 4 OpenSpec skills). This repo is now the
source of truth and must publish the same agent to multiple coding tools.

## Decisions (confirmed with user)

1. English v2 prompt becomes canonical; Spanish v1 archived under `00-DDD/legacy/`.
2. Targets: OpenCode, Claude Code, Google Antigravity, Codex, Gemini CLI, GitHub Copilot, Cursor.
3. Scope: sync + generator + all targets (not only OpenCode).
4. Hardcoded target layout (`00-DDD/`, `documentation/02-adr/`, `openspec/`, `documentation/AGENTS.md`)
   stays; it is documented as the layout contract.

## Constraints discovered

- Copilot custom agent prompt limit: 30,000 chars.
- Codex `AGENTS.md` limit: 32 KiB default (`project_doc_max_bytes`).
- Cursor rules guidance: keep under 500 lines.
- Therefore: **full-prompt mode** for native agent targets (OpenCode, Claude Code, Antigravity),
  **gateway + bundled prompt** for size-capped targets (Codex, Gemini CLI, Copilot, Cursor).
- Gemini CLI `GEMINI.md` supports `@./file.md` imports → gateway can import the bundled prompt.

## Layout

```
00-DDD/                          # CANONICAL SOURCE (single source of truth)
  DDD-Agent.md                   # exact copy of config's thoth-domain-scribe.md (EN v2)
  legacy/DDD-Agent.v1.es.md      # archived Spanish v1
  agents/opsx-scribe.md
  commands/opsx-*.md             # 5 commands
  skills/openspec-*/SKILL.md     # 4 skills
  LAYOUT.md                      # declared target-repo layout contract
src/                             # plugin + generator + CLI
  index.ts, config.ts
  agents/thoth.ts                    # agents built from canonical text imports
  targets.ts                     # pure render functions per tool
  cli.ts                         # generate | install | doctor | list
test/                            # node:test suite
docs/                            # TARGETS.md, this plan
README.md, AGENTS.md
generated/                       # gitignored sample output of all targets
```

## Tasks

- [x] T1 Research target formats (done, 2026-11-22)
- [x] T2 Import canonical assets from `~/.config/opencode`; archive v1
- [x] T3 Write generator (`src/targets.ts`) + CLI (`src/cli.ts`) for all 7 targets
- [x] T4 Finish OpenCode plugin entry (`src/index.ts`, `src/agents/thoth.ts`)
- [x] T5 Tests: byte fidelity, all targets, no file exceeds tool limit, idempotent installer
- [x] T6 Build + typecheck + tests green
- [x] T7 Docs: README, TARGETS.md, AGENTS.md, package.json bin/files
- [x] T8 Generate sample output; no project-level `opencode.json` (local config used); final verification

## Verification gates

- `shasum` of imported files matches `~/.config/opencode` originals.
- `bun test test/` green.
- `bun run typecheck` and `bun run build` green.
- `bun run generate` produces all target trees with no prompt > 30,000 chars in Copilot
  agent files and no `AGENTS.md` > 32 KiB.
- `bun run doctor` reports canonical files present and (if config still exists) drift status.

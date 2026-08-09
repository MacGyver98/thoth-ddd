# thoth-ddd

OpenCode plugin **thoth-ddd** — ships one agent, **Thoth — DDD Domain Scribe**, that transforms free-form business descriptions into structured DDD artifacts (bounded contexts, ubiquitous language, aggregates, invariants, ADRs) via seven sequential tasks.

## Agent

- **Name:** Thoth — DDD Domain Scribe
- **Prompt source:** `00-DDD/DDD-Agent.md` (canonical, Spanish — byte-identical copy is loaded by the plugin)
- **Agent color:** `#D4A017` (Thoth gold)
- **Mode:** `all` (TAB-visible + subagent-usable)

## Configuration

Config override path: `~/.config/opencode/thoth-ddd.jsonc`

## Commands (planned)

Future work — planned `/thoth:*` commands:

- `/thoth:analyze` — transform a free-form description into DDD artifacts
- `/thoth:continue` — continue the seven-task DDD workflow
- `/thoth:review` — review generated DDD artifacts
- `/thoth:status` — show current DDD workflow state
- `/thoth:export` — export artifacts to a target format
- `/thoth:report` — generate a workflow report

## Development

```bash
bun install
bun run build       # bun build src/index.ts --outdir dist --target node --format esm
bun run typecheck   # tsc --noEmit
bun test test/      # node:test unit suite
```

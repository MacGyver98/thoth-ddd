# commands/

The canonical OpenSpec commands are no longer placeholders. They live in
[`00-DDD/commands/`](../00-DDD/commands/) and are the source of truth:

- `opsx-explore.md`
- `opsx-propose.md`
- `opsx-apply.md`
- `opsx-orchestrate.md`
- `opsx-archive.md`

The generator emits them to the correct location for each target tool
(`.opencode/commands/`, `.claude/commands/`, `.agents/skills/opsx-*/SKILL.md`).
See [`docs/TARGETS.md`](../docs/TARGETS.md).

The originally planned `/thoth:*` commands were never implemented; do not add them
here — add canonical assets under `00-DDD/` instead.

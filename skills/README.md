# skills/

The canonical Agent Skills are no longer placeholders. They live in
[`00-DDD/skills/`](../00-DDD/skills/):

- `openspec-explore`
- `openspec-propose`
- `openspec-apply-change`
- `openspec-archive-change`

The generator emits them to `.opencode/skills/`, `.claude/skills/` and
`.agents/skills/` as appropriate. See [`docs/TARGETS.md`](../docs/TARGETS.md).

Do not add new skills here — add a folder with `SKILL.md` under `00-DDD/skills/`.

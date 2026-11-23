# thoth-ddd — target repository layout contract

The Thoth agent is opinionated. A repository that installs it MUST use the following
artifact layout. This is intentional: the agent's governance model, inheritance rules
and ADR cross-references depend on these paths.

| Path | Contents | Owner |
| --- | --- | --- |
| `00-DDD/` | Strategic DDD documents `01..07` and tactical subfolders. Living constitution. | Thoth |
| `00-DDD/[subfolder]/` | Tactical deep-dive (`00-scope`, `03-glossary`, `04-aggregate-model`, `05-interactions-contracts`, `06-principles-constraints`, `07-specification-model`, `08-journeys`). | Thoth |
| `documentation/02-adr/` | ADRs, including Amendments. Decision log. | Thoth |
| `documentation/07-ux-ui/flows/` | UX flows referenced by journeys. | Thoth |
| `documentation/AGENTS.md` | Repository-level documentation conventions. | Repo owner |
| `openspec/changes/<id>/` | OpenSpec change artifacts (proposal, design, specs, tasks, journeys). | `opsx-scribe` only |
| `openspec/specs/` | Built/active specs. | `opsx-scribe` only |
| `documentation/thoth-ddd/` | Generated, read-only copy of the agent bundle. Do not edit by hand. | thoth-ddd generator |

## Hard rules

1. Thoth writes **only** under `00-DDD/`, `documentation/` and `openspec/`.
2. All SPEC / OpenSpec work is delegated to `opsx-scribe`; Thoth never edits specs directly.
3. `opsx-scribe` writes **only** under `openspec/`. It never touches `00-DDD/` or ADRs.
4. `documentation/thoth-ddd/` is generated. Regenerate instead of editing it.
5. A missing directory is created on demand; an existing file is never silently overwritten.

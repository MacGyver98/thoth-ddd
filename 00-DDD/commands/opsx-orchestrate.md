---
description: Orchestrate an OpenSpec change by dispatching scoped tasks to configured tier agents, verifying gates, and tracking accepted work
subagent: false
---

Orchestrate one OpenSpec change. The coordinator owns sequencing, dispatch, independent gate verification, and task-state updates. Tier agents execute only their assigned task blocks; they do not make design decisions or commit/push.

## 1. Select the change

Use the provided change ID. If omitted:

1. Infer it only when the conversation identifies one unambiguously.
2. Otherwise run `openspec list --json`.
3. If more than one eligible change remains, ask the user to select one.

Announce the selected change and the override syntax: `/opsx-orchestrate <change-id>`.

## 2. Inspect OpenSpec state and applicable rules

Run:

```bash
openspec status --change "<change-id>" --json
openspec instructions apply --change "<change-id>" --json
```

Read the returned `contextFiles` and status before dispatching. Determine the schema, task artifact, planning-complete state, progress, and dynamic instructions from the CLI output; do not assume fixed artifact names.

Stop and report:

- `blocked` or incomplete planning: identify the missing artifacts and suggest `/opsx-propose` or `/opsx-refine` as appropriate.
- `all_done`: report completion and suggest `/opsx-archive`.
- Any missing or contradictory instructions that prevent safe dispatch.

Read the applicable repository `AGENTS.md` files, the task artifact, and referenced design/specification sections. The task block and approved run-specific decisions govern scope and execution. Do not infer approval for migrations, deployment, merge, push, or other destructive/external actions.

If the project has a run-specific execution ledger or approved decisions, read and honor them for that run only. This includes approval walls, protected data, verification profiles, and sequential/unattended modes. Do not generalize run-specific decisions to other changes.

## 3. Report current progress

Before dispatching, show:

```text
## Orchestrating: <change-id> (schema: <schema>)

Progress: <complete>/<total> tasks
Remaining: <count>
Execution mode: <approved mode>

Starting dispatch...
```

## 4. Build the task queue

Parse the active task artifact. For each incomplete task, record its ID, verbatim task block, tier tag, dependencies, target files, and `gate:` command. Exclude completed tasks and any `DEFERRED` section.

Use the tier names defined by the current project instructions/configuration:

| Task tag | Configured agent |
|---|---|
| `[XS]` | `extra-small` |
| `[S]` | `small` |
| `[M]` | `medium` |
| `[L]` | `large` |

An untagged task defaults to `[S]` only if the task conventions do not specify another rule. Resolve model selection from the current configured agent; do not hardcode model IDs in this command. If the task tag, current agent configuration, or an approved run decision conflicts, stop and report the conflict rather than guessing.

## 5. Sequence and parallelize safely

Follow task groups and dependencies in the task artifact and any approved execution order. Groups run in order.

Parallelize tasks within a group only when all of the following hold:

- The approved run mode allows parallel dispatch.
- The tasks have no explicit or implicit dependency.
- Their target files and shared resources are disjoint.
- The configured OpenCode 2 native subagents are available.

Otherwise dispatch sequentially. A run-specific decision requiring foreground/sequential work overrides parallelization. Native subagents always run in the background; never use shell backgrounding as a substitute for the subagent tool.

## 6. Dispatch protocol

Before each dispatch, identify the task ID, tier, configured agent, and title.

Use OpenCode 2's native `subagent` tool, not an OMO `task` tool. For each task, call it with:

- `agent`: the configured tier agent name from the table above.
- `description`: a short 3-5 word task label.
- `prompt`: the complete task prompt below.

Do not pass OMO-only fields such as `category`, `subagent_type`, or `run_in_background`. Native child sessions start with fresh context and always run in the background. Include all relevant instructions and task context in every prompt. If the native `subagent` tool or configured agent is unavailable, report `BLOCKED` rather than silently substituting another executor.

Send exactly one task per agent. Include:

```text
You are executing ONE task from the active OpenSpec change.
Repository root: <the actual repository root>
Working directory: <the task's affected repo/submodule, determined from task paths and applicable AGENTS.md>

Read-only sources: the task's referenced design/spec sections and files listed by the task.

--- TASK BLOCK (verbatim) ---
<full task block, unchanged>
--- END TASK BLOCK ---

Follow the applicable AGENTS.md and run-specific decisions. Do not expand scope.
Do not stage, commit, or push. Return the required ## RESULT block.
```

Do not hardcode a frontend working directory: tasks may target the monorepo or different submodules. Determine the correct working directory from the task paths and repository guidance.

For parallel batches, call the native subagent once per task, record the returned session IDs, and collect each `<background-result kind="subagent">` before verifying the batch. Do not sleep, poll, or proactively inspect running child sessions. If the approved run mode is sequential, dispatch one task and wait for its result before starting the next.

## 7. Verify every task result

Treat agent reports as claims, not acceptance. For each returned task:

1. Confirm the reported files are within the assigned scope.
2. Independently rerun the task's `gate:` command from the correct working directory.
3. Check that the gate actually executed the expected checks and did not pass through skips, zero tests, or an invalid fallback.
4. Apply any required independent review from the approved run policy.
5. Accept the task only after all required gates and reviews pass.

If a gate fails, allow only the correction budget specified by the applicable project/run instructions. Keep each correction within the original task scope. On an unresolved failure, scope violation, baseline drift, unavailable agent/model, or required design decision, stop and report the evidence and safe next options. Do not skip ahead.

Use the result format required by the applicable project instructions. If none is defined, require:

```text
## RESULT
STATUS: DONE | GATE FAILED | BLOCKED
FILES TOUCHED: <paths>
DECISIONS: <decisions or none>
GATE COMMAND: <command>
GATE OUTPUT: <raw relevant output>
NOTES: <notes or none>
```

## 8. Task-state and Git policy

The coordinator alone updates task checkboxes, and only after verification. Do not edit proposal/design/spec artifacts to resolve a conflict without approval.

Workers never stage, commit, or push. The coordinator may commit only when the project's approved policy explicitly assigns commits to the coordinator and specifies the allowed paths. Never use `git add .`; otherwise, do not commit without explicit user approval.

Push, merge, migration execution, deployment, and worktree deletion require separate explicit approval. A commit approval is not push approval. Redact secrets and real student/customer data from committed evidence.

## 9. Stop conditions

Pause and report to the user when:

- Planning is incomplete or the change is blocked.
- Task instructions conflict with design/specifications, `AGENTS.md`, or approved decisions.
- A task is ambiguous, exceeds scope, or requires an unapproved action.
- A required reviewer, gate, configured agent, or execution tool is unavailable.
- A gate/review remains failed after the allowed correction budget.
- A run-specific approval wall is reached.

Do not invent a decision or mark a blocked task complete.

## 10. Progress and completion

After each verified group, summarize completed tasks, gates/reviews, remaining tasks, and any blocked work. Update `tasks.md` only after verification and under the applicable commit policy.

When all eligible tasks are verified, report the final count and remaining deferred items. Suggest `/opsx-archive <change-id>` only when the change is ready to archive.

For a pause, report the exact task, evidence, current progress, and the next safe options. Do not present an unverified run as complete.

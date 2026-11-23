---
description: Orchestrate OpenSpec change implementation — this session acts as pure coordinator, dispatching each task to its tier agent ([M]→micro, [S]→small, [L]→large), verifying gates itself before marking checkboxes
---

Orchestrate the implementation of an OpenSpec change. **This session NEVER implements tasks itself** — it dispatches all [M]/[S]/[L] tasks to their tier agents, verifies gates, and owns `tasks.md` updates. The orchestrator is a pure coordinator.

This is an **enhanced orchestrator** over the standard `openspec apply` workflow — it inherits schema discovery, state handling, and fluid workflow support, while adding tier-based dispatch, gate verification, and dependency ordering.

## 1. Select the change

If a name is provided, use it. Otherwise:

1. Infer from conversation context if the user mentioned a change
2. Auto-select if only one active (non-complete) change exists
3. If ambiguous, run `openspec list --json` and use **AskUserQuestion** to let the user select

Always announce: "Orchestrating change: <name>" and how to override (e.g., `/opsx-orchestrate <other>`).

## 2. Schema discovery + state check

```bash
openspec status --change "<name>" --json
```

Parse the JSON to understand:
- `schemaName`: The workflow being used (e.g., "spec-driven")
- Which artifact contains the tasks (typically "tasks" for spec-driven, check status for others)
- `isPlanningComplete`: If false → stop, tell user to finish artifacts first

Then:

```bash
openspec instructions apply --change "<name>" --json
```

This returns:
- `contextFiles`: artifact ID → array of concrete file paths (varies by schema)
- Progress (total, complete, remaining)
- Task list with status
- Dynamic instruction based on current state

**Handle states:**
- `state: "blocked"` (missing artifacts) → show message, suggest using `/opsx-continue`
- `state: "all_done"` → congratulate, suggest `/opsx-archive`
- Otherwise → proceed to setup

## 3. Setup — internalize context

Read **every file** in `contextFiles` (proposal, specs, design, tasks). You MUST internalize `design.md` (Decisions + Non-Goals) before dispatching — you need it to judge agent reports. Note the tasks file path and the `DEFERRED` section (never dispatch those).

The files depend on the schema being used:
- **spec-driven**: proposal, specs, design, tasks
- Other schemas: follow the `contextFiles` from CLI output

## 4. Show current progress

Display before starting dispatch:

```
## Orchestrating: <change-name> (schema: <schema-name>)

Progress: N/M tasks complete
Remaining: <count> tasks across <count> groups
Schema: <schema-name>
Dynamic instruction: <from CLI output>

Starting dispatch...
```

## 5. Build the execution queue

Parse `tasks.md`: for each `- [ ] X.Y` block, capture (id, tier tag, full verbatim block, files touched from `gate:` or task description). Skip `- [x]` tasks and the `DEFERRED` section.

### Parallelization strategy

Groups are executed in numeric order. **Within each group**, identify parallel batches:

1. **Extract file targets** from each task's description and `gate:` command (look for file paths, component names, store names)
2. **Build dependency graph** — if task B's `lee:` references task A, B depends on A
3. **Create parallel batches** — tasks with no interdependencies AND disjoint file targets go in the same batch
4. **Dispatch batch simultaneously** using `run_in_background=true` on all tasks in the batch
5. **Collect results** as `<system-reminder>` notifications arrive
6. **Verify gates** for all completed tasks in the batch before proceeding

### Batch dispatch rules

- **Same group, disjoint files, no `lee:` cross-references** → parallel batch
- **Same group, shared files or `lee:` cross-reference** → sequential (dependency)
- **Different groups** → sequential (group N must complete before N+1)
- **When in doubt** → sequential (safety first)

### Example: chat-frontend-app Group 1

```
Task 1.2a: view-layout.store.ts (no cross-refs)
Task 1.2b: chat-session.store.ts (no cross-refs)
Task 1.2c: voice-recording.store.ts (no cross-refs)
Task 1.2d: connection.store.ts + offline-queue.ts (no cross-refs)

→ All 4 are parallel batch (disjoint files, no dependencies)
```

**Fluid workflow**: This command can be invoked at any time — before all artifacts are done (if tasks exist), after partial implementation, interleaved with other actions. If implementation reveals design issues, suggest updating artifacts — this is not phase-locked.

## 6. Tier → agent mapping

| Tag in task | Executor | How |
|---|---|---|
| **[M]** | category `quick` | Task tool, `category="quick"` |
| **[S]** | category `unspecified-low` | Task tool, `category="unspecified-low"` |
| **[L]** | category `deep` | Task tool, `category="deep"` |

If a task block has no tag, treat as [S].

**Note**: If `micro`/`small`/`large` subagent types become available, use them instead. The category-based dispatch is the fallback when specialized agents are unavailable.

## 7. Dispatch protocol

### 7A. Sequential dispatch (single task)

Before dispatching, print:

```
▶ Task X.Y [TAG] → <agent>
  <task title>
```

Dispatch prompt template (send EXACTLY this structure):

```
You are executing ONE task from openspec/changes/<name>/tasks.md of a <schema-name> change.
Working directory: observatorio-educativo-frontend/ (git submodule; the monorepo root is the parent).

Source of truth you may consult (read-only): design.md §<relevant sections>, specs/<capability>/spec.md, and the files listed in `lee:`.

--- TASK BLOCK (verbatim) ---
<full task block from tasks.md, unmodified>
--- END TASK BLOCK ---

Follow your agent rules. Return your RESULT block.
```

### 7B. Parallel batch dispatch (multiple tasks)

When a parallel batch is identified (disjoint files, no dependencies):

1. **Print batch header:**
   ```
   ## Parallel Batch: Tasks 1.2a, 1.2b, 1.2c, 1.2d
   Dispatching 4 tasks simultaneously...
   ```

2. **Dispatch ALL tasks in the batch in ONE message** using `run_in_background=true`:
   ```
   task(category="[tier]", run_in_background=true, description="[task title]", prompt="[dispatch prompt]")
   task(category="[tier]", run_in_background=true, description="[task title]", prompt="[dispatch prompt]")
   ...
   ```

3. **Print tracking table:**
   ```
   | Task | Status | Background ID |
   |------|--------|---------------|
   | 1.2a | ⏳ pending | bg_abc123 |
   | 1.2b | ⏳ pending | bg_def456 |
   | 1.2c | ⏳ pending | bg_ghi789 |
   | 1.2d | ⏳ pending | bg_jkl012 |
   ```

4. **End your response** — the system will send `<system-reminder>` notifications as tasks complete.

5. **On each `<system-reminder>`**, collect the result via `background_output(task_id="bg_...")` and update the tracking table:
   ```
   | 1.2a | ✓ complete | bg_abc123 |
   ```

6. **After ALL tasks in the batch complete**, verify gates for each task sequentially (gates are fast, no need to parallelize verification).

7. **Mark all verified tasks** in `tasks.md` and print batch summary:
   ```
   ✓ Parallel Batch complete — 4/4 gates verified
   ```

### 7C. After agent returns — VERIFY, don't trust

1. Re-run the task's `gate:` command **yourself** from the correct working directory. Never mark a task done based on the agent's claim alone.
2. If gate is green AND the agent's FILES TOUCHED are within scope → mark `- [ ] X.Y` → `- [x] X.Y` in `tasks.md` (only you edit this file), print `✓ X.Y done (gate verified)`.
3. If gate is red or scope was violated → send ONE follow-up to the **same tier agent** including: your gate output, the scope violation, and the instruction to fix within scope. Re-verify.
4. Second failure → **PAUSE**: report to the user (task, agent, both outputs, your diagnosis, options). Do not skip the task. Do not fix it yourself.
5. Agent reports `BLOCKED` → analyze: if it's a real design/spec gap → pause and propose an artifact update (do NOT edit artifacts silently); if it's the agent being overly cautious → re-dispatch with the clarification quoted from design.md.

## 8. Hard stops (always pause for the user)

- Any `git commit` / `git push` task: stage nothing, commit nothing — summarize the change and ask.
- Any task that would modify a file outside the change's declared scope.
- Any conflict between task block and design/spec (dispatch the fix, don't improvise).
- Any [L] task that reports BLOCKED or NOTES requiring design decisions — analyze and either re-dispatch with clarification or pause for the user.

## 9. Progress reporting

After every completed group, print a compact status:

```
## Progress: <name>
✓ Group 1 (migration) — 4/4
  └─ Parallel batch: 1.2a–1.2d (4 tasks dispatched together)
▶ Group 2 (crypto) — 0/2
Pending: 3..11 | DEFERRED items: not dispatched
```

When dispatching a parallel batch, show the batch explicitly:

```
## Parallel Batch: Group 1 — Tasks 1.2a, 1.2b, 1.2c, 1.2d
| Task | Agent | Status |
|------|-------|--------|
| 1.2a | micro | ⏳ dispatched |
| 1.2b | micro | ⏳ dispatched |
| 1.2c | micro | ⏳ dispatched |
| 1.2d | small | ⏳ dispatched |

Waiting for system-reminder notifications...
```

## 10. Output templates

### Output during implementation

**Sequential tasks:**
```
## Orchestrating: <change-name> (schema: <schema-name>)

▶ Task 3.1 [S] → small
  Create ChatModule + ChatRestController
  [...dispatched, waiting for agent...]
  ✓ 3.1 done (gate verified)

▶ Task 3.2 [S] → small
  Implement POST /chat/conversations
  [...dispatched, waiting for agent...]
  ✓ 3.2 done (gate verified)
```

**Parallel batch:**
```
## Orchestrating: <change-name> (schema: <schema-name>)

## Parallel Batch: Tasks 1.2a, 1.2b, 1.2c, 1.2d
Dispatching 4 tasks simultaneously...

| Task | Agent | Background ID | Status |
|------|-------|---------------|--------|
| 1.2a | micro | bg_abc123 | ⏳ dispatched |
| 1.2b | micro | bg_def456 | ⏳ dispatched |
| 1.2c | micro | bg_ghi789 | ⏳ dispatched |
| 1.2d | small | bg_jkl012 | ⏳ dispatched |

[...waiting for system-reminder notifications...]

✓ 1.2a complete — gate verified
✓ 1.2b complete — gate verified
✓ 1.2c complete — gate verified
✓ 1.2d complete — gate verified

## Parallel Batch complete — 4/4 gates verified
```

### Output on completion

```
## Orchestration Complete

**Change:** <change-name>
**Schema:** <schema-name>
**Progress:** 7/7 tasks complete ✓

### Completed This Session
- [x] Task 1 [M] → micro
- [x] Task 2 [S] → small
- [x] Task 3 [L] → large
...

All tasks complete! Archive with `/opsx-archive <name>`.
```

### Output on pause (issue encountered)

```
## Orchestration Paused

**Change:** <change-name>
**Schema:** <schema-name>
**Progress:** 4/7 tasks complete

### Issue Encountered
<description — task, agent, both outputs, your diagnosis>

**Options:**
1. <option 1>
2. <option 2>
3. Other approach

What would you like to do?
```

## Guardrails

- You own `tasks.md`; agents never see edit rights to it (their prompts contain the block verbatim, not the file).
- Never dispatch a task whose dependency group isn't complete.
- Never let an agent's "DONE" skip gate verification.
- Keep the orchestrator's own code-writing to zero — it only dispatches, verifies gates, and updates `tasks.md`.
- If `openspec` CLI reports planning incomplete → stop, tell user to finish artifacts first.
- Context budget: re-read `tasks.md` after each group only (it changes); design/spec stay cached from setup.
- Use `contextFiles` from CLI output, don't assume specific file names.
- If task is ambiguous, pause and ask before dispatching.
- If agent implementation reveals issues, pause and suggest artifact updates — not phase-locked, work fluidly.
- **Parallelization safety**: NEVER parallelize tasks that:
  - Share files (e.g., both modify `auth.service.ts`)
  - Have `lee:` cross-references (task B reads task A's output)
  - Have implicit dependencies (e.g., store + its spec file)
  - Touch the same component/directory
  - When in doubt, dispatch sequentially

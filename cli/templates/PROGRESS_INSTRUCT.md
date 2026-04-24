# Ralph Progress Instructions

`progress.txt` is shared memory for fresh agents in the same Ralph run. Keep it concise, but record the details that matter for the next handoff.

## Top State

Keep the top state current. Do not let it become stale.

```text
# Ralph Progress

Goal: [one-line final success goal]
Branch: [branch]
Cycle: [N]
Status: [planning | assigned | blocked | complete]
Current agent: [planner | developer | uxui | documentation | WEB_BROWSER_SAFE | WEB_BROWSER_BYPASS]
Current objective: [one-line active objective]

Next:
- [most important next action]

Blockers:
- [none | current blocker]

Important patterns:
- [durable codebase/design/docs pattern only]
---
```

## Planner Entry

Append one planner entry per planner pass:

```text
## C[N] Planner
Assigned agent: [developer | uxui | documentation | WEB_BROWSER_SAFE | WEB_BROWSER_BYPASS]
Objective: [what the selected agent should accomplish]

Scope:
- In: [short scope]
- Out: [short exclusions]

Success criteria:
- [handoff-level criterion]
- [handoff-level criterion]

Planner notes:
- [why this agent was selected]
- [risk, dependency, or context the agent should know]
---
```

## Agent Entry

Append one agent entry per non-planner pass:

```text
## C[N] [Developer | UXUI | Documentation | WEB_BROWSER_SAFE | WEB_BROWSER_BYPASS]
Objective: [assigned objective]

Did:
- [specific thing completed]
- [specific thing completed]

Structural changes:
- [module/schema/component/docs structure changed]
- [important organization or architecture change]

Files touched:
- [key file/path]
- [key file/path]

Verification:
- [command/check and result]
- [browser/manual/docs review and result]

Problems:
- [none | issue encountered and how it was handled]

Notes for planner:
- [what planner should consider next]
- [recommended next agent or follow-up]
---
```

## Rules

- Write enough for the next agent to continue intelligently.
- Do not paste full diffs, long logs, or exhaustive file lists.
- Keep detailed acceptance criteria in `prd.json`.
- Keep detailed implementation history in commits.
- Add `Important patterns` only when future agents would benefit.
- If blocked, update top state to `Status: blocked` and make the blocker explicit.

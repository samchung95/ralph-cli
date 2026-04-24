---
name: ralph
description: "Set up Ralph's planner-routed agent loop. Use when starting a Ralph run, creating prd.json, expanding a feature idea into final success criteria, or preparing planner handoffs for developer, UXUI, documentation, and web browser agents. Triggers on: set up ralph, start ralph, create prd.json, plan this with ralph, ralph setup."
user-invocable: true
---

# Ralph Setup

Set up the first step for Ralph's planner-routed agent loop.

Ralph starts with the planner. The planner decides which focused agent should run next:

- `developer` for product/source implementation.
- `uxui` for UX/UI refinement and browser verification.
- `documentation` for docs, examples, and usage guidance.
- `WEB_BROWSER_SAFE` for read-only public web research and browser inspection without sign-in or form submission.
- `WEB_BROWSER_BYPASS` for authorized sign-in and form submission when explicitly required.

The setup skill should expand the user's rough prompt or thoughts into a clear global target, then create durable files that let the planner choose the first handoff.

---

## The Job

1. Understand and, when useful, expand the feature or outcome the user wants.
2. Ask only essential clarifying questions.
3. Create or update `prd.json` directly in the Ralph directory.
4. Create `progress.txt` if it does not exist.
5. Do not implement product code.

---

## Prompt Expansion

If the user's request is rough, convert it into:

- Intent: the real user/business outcome.
- In scope: what Ralph should be allowed to change.
- Out of scope: what Ralph should avoid.
- Assumptions: reasonable assumptions made from context.
- Final success criteria: concrete, verifiable global completion criteria.
- First planner objective: what the planner should decide first.

Ask 3-5 questions only when needed. Focus on:

- Final outcome: How do we know the whole run is done?
- Scope: What should be included or excluded?
- Agent needs: Does this likely need developer, UXUI, documentation, web browsing, authenticated browser actions, or multiple agents?
- Verification: What checks prove the work is correct?
- UI/browser needs: Does this require visual verification?

If the user's request already has enough detail, create the files without asking more.

---

## prd.json Format

Write valid JSON:

```json
{
  "project": "[Project Name]",
  "branchName": "ralph/[feature-name-kebab-case]",
  "description": "[Planner-routed Ralph run description]",
  "finalSuccessCriteria": {
    "description": "[Global outcome for the whole run]",
    "acceptanceCriteria": [
      "Final criterion 1",
      "Final criterion 2",
      "Typecheck passes"
    ],
    "passes": false,
    "notes": ""
  },
  "planning": {
    "cycle": 1,
    "currentObjective": "Planner reviews the expanded prompt and selects the first focused agent handoff",
    "promptExpansion": {
      "intent": "[Expanded user intent]",
      "inScope": ["Scope item"],
      "outOfScope": ["Excluded item"],
      "assumptions": ["Assumption"],
      "suggestedAgents": ["developer", "uxui", "documentation", "WEB_BROWSER_SAFE", "WEB_BROWSER_BYPASS"]
    }
  },
  "prdChain": [
    {
      "cycle": 1,
      "objective": "Planner selects the first focused handoff",
      "status": "active",
      "storyIds": [],
      "notes": "No agent handoff has run yet"
    }
  ],
  "userStories": []
}
```

Do not set `finalSuccessCriteria.passes` to `true` during setup.

`planning.activeHandoff` is optional during setup because Ralph starts with the planner. The planner will write it before the selected agent runs:

```json
"activeHandoff": {
  "agent": "developer",
  "objective": "Implement one focused slice",
  "scope": {
    "include": ["What this handoff should touch"],
    "exclude": ["What this handoff must not touch"]
  },
  "rules": ["Constraint the selected agent must follow"],
  "comments": "Planner context for this handoff.",
  "successCriteria": ["Verifiable handoff-level criterion"],
  "status": "ready"
}
```

Allowed `activeHandoff.agent` values are `"developer"`, `"uxui"`, `"documentation"`, `"WEB_BROWSER_SAFE"`, and `"WEB_BROWSER_BYPASS"`.

---

## Setup Rules

- Put the whole desired outcome in `finalSuccessCriteria`.
- Keep setup focused on the global goal and planner context, not a full backlog.
- Acceptance criteria must be concrete and verifiable.
- Include checks such as `Typecheck passes`, `Tests pass`, `Browser verification passes`, or `Documentation is updated` when relevant.
- Use `planning.promptExpansion` to preserve useful interpretation of the user's rough prompt.
- Let the first runtime planner decide the first agent handoff.

---

## progress.txt

If `progress.txt` does not exist, create:

```text
# Ralph Progress

Goal: [one-line final success goal]
Branch: [branch]
Cycle: 1
Status: planning
Current agent: planner
Current objective: Planner selects the first focused handoff

Next:
- Planner selects the first focused handoff.

Blockers:
- none

Important patterns:
- none yet
---

Started: [current date/time]
```

If `progress.txt` exists, append a short setup note instead of replacing the file.

---

## Archiving Previous Runs

Before writing a new `prd.json`, check if an existing one belongs to a different feature:

1. Read the current `prd.json` if it exists.
2. Compare its `branchName` with the new branch name.
3. If different and `progress.txt` has content beyond the header:
   - Create `archive/YYYY-MM-DD-feature-name/`.
   - Copy current `prd.json` and `progress.txt` into the archive.
   - Reset `progress.txt` for the new run.

The Ralph runner also archives when it detects a branch change, but the setup skill should avoid overwriting useful context.

---

## Example

Feature request:

```text
Add task priority so users can mark tasks high, medium, or low, see priority on cards, edit priority, filter by priority, and have relevant docs updated.
```

Initial `prd.json`:

```json
{
  "project": "TaskApp",
  "branchName": "ralph/task-priority",
  "description": "Task Priority System - planner-routed Ralph run",
  "finalSuccessCriteria": {
    "description": "Users can assign, view, edit, and filter task priority across the app, with priority persisted and relevant usage documentation updated.",
    "acceptanceCriteria": [
      "Tasks persist a priority value of high, medium, or low",
      "Users can see priority on task cards without opening details",
      "Users can edit priority from the task edit flow",
      "Users can filter the task list by priority",
      "Priority UI is verified in browser",
      "Relevant usage documentation is updated",
      "Typecheck passes"
    ],
    "passes": false,
    "notes": ""
  },
  "planning": {
    "cycle": 1,
    "currentObjective": "Planner reviews the expanded prompt and selects the first focused agent handoff",
    "promptExpansion": {
      "intent": "Add an end-to-end task priority feature with persisted data, usable UI, filtering, and docs.",
      "inScope": [
        "Task priority persistence",
        "Priority display and editing UI",
        "Priority filtering",
        "Relevant documentation"
      ],
      "outOfScope": [
        "Unrelated task redesign",
        "Authentication changes"
      ],
      "assumptions": [
        "Existing task creation and edit flows should remain intact"
      ],
      "suggestedAgents": [
        "developer",
        "uxui",
        "documentation"
      ]
    }
  },
  "prdChain": [
    {
      "cycle": 1,
      "objective": "Planner selects the first focused handoff",
      "status": "active",
      "storyIds": [],
      "notes": "No agent handoff has run yet"
    }
  ],
  "userStories": []
}
```

---

## Checklist

Before finishing:

- [ ] `prd.json` is valid JSON.
- [ ] `finalSuccessCriteria` describes the whole target outcome.
- [ ] `finalSuccessCriteria.passes` is `false`.
- [ ] `planning.cycle` is `1`.
- [ ] `planning.currentObjective` starts with planner handoff selection.
- [ ] `planning.promptExpansion` captures useful intent, scope, assumptions, and suggested agents.
- [ ] `prdChain` has one active cycle 1 entry.
- [ ] `userStories` is an array, usually empty at setup.
- [ ] `progress.txt` exists and uses the compact shared-memory format.
- [ ] No implementation work was started.

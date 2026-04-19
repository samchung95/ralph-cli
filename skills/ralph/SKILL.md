---
name: ralph
description: "Set up Ralph's first evolving PRD step. Use when starting a Ralph run, creating prd.json, planning a feature for Ralph, or preparing the initial develop/plan loop. Triggers on: set up ralph, start ralph, create prd.json, plan this with ralph, ralph setup."
user-invocable: true
---

# Ralph Setup

Set up the first step for Ralph's evolving develop/plan loop.

Ralph does not need a fully preplanned backlog. It needs:

1. A global `finalSuccessCriteria` that anchors the loop.
2. A first small implementation slice in `userStories`.
3. A `prdChain` entry for cycle 1.
4. A `progress.txt` file for durable context.

The planner agent will inspect work after each developer pass and write the next PRD slice until the final success criteria pass.

---

## The Job

1. Understand the feature or outcome the user wants.
2. Ask only the essential clarifying questions.
3. Create or update `prd.json` directly in the Ralph directory.
4. Create `progress.txt` if it does not exist.
5. Do not implement code.

---

## Clarifying Questions

Ask 3-5 questions only when needed. Focus on:

- Final outcome: How do we know the whole feature is done?
- Scope: What should be included or excluded?
- First slice: What is the smallest useful implementation step?
- Verification: What checks prove the work is correct?
- UI/browser needs: Does this require visual verification?

Use lettered options when helpful:

```text
1. What is the target scope?
   A. Minimal viable version
   B. Full end-to-end feature
   C. Backend/API only
   D. UI only

2. What should Ralph implement first?
   A. Data model foundation
   B. Core backend behavior
   C. First visible UI path
   D. Other: [please specify]
```

If the user's request already has enough detail, create the files without asking more.

---

## prd.json Format

Write valid JSON:

```json
{
  "project": "[Project Name]",
  "branchName": "ralph/[feature-name-kebab-case]",
  "description": "[First PRD slice description]",
  "finalSuccessCriteria": {
    "description": "[Global outcome for the whole feature]",
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
    "currentObjective": "[What the first PRD slice should accomplish]"
  },
  "prdChain": [
    {
      "cycle": 1,
      "objective": "[First PRD slice objective]",
      "status": "active",
      "storyIds": ["US-001"],
      "notes": ""
    }
  ],
  "userStories": [
    {
      "id": "US-001",
      "title": "[Story title]",
      "description": "As a [user], I want [feature] so that [benefit]",
      "acceptanceCriteria": [
        "Criterion 1",
        "Criterion 2",
        "Typecheck passes"
      ],
      "priority": 1,
      "passes": false,
      "notes": ""
    }
  ]
}
```

---

## First Slice Rules

- Prefer exactly one user story for cycle 1.
- Use at most three stories only if they are tiny and tightly coupled.
- The first story must be completable in one developer pass.
- Do not include the whole backlog in `userStories`.
- Put the whole desired outcome in `finalSuccessCriteria`.
- Acceptance criteria must be concrete and verifiable.
- Every story must include a quality check such as `Typecheck passes`.
- UI stories should include `Verify in browser using dev-browser skill` when browser tooling is available.

Right-sized first slices:

- Add a database column and migration.
- Add the first service function behind a feature.
- Add one UI component wired to existing data.
- Add one API endpoint with tests.

Too big for the first slice:

- Build an entire dashboard.
- Add full authentication.
- Implement every screen for a feature.
- Refactor an entire API.

---

## progress.txt

If `progress.txt` does not exist, create:

```text
# Ralph Progress Log
Started: [current date/time]
---

## Setup - Cycle 1
- Created initial evolving prd.json
- Final success criteria: [summary]
- First developer objective: [summary]
---
```

If `progress.txt` exists, append the setup entry instead of replacing the file.

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
Add task priority so users can mark tasks high, medium, or low, see priority on cards, edit priority, and filter by priority.
```

Initial `prd.json`:

```json
{
  "project": "TaskApp",
  "branchName": "ralph/task-priority",
  "description": "Task Priority System - first evolving PRD slice",
  "finalSuccessCriteria": {
    "description": "Users can assign, view, edit, and filter task priority across the app, with priority persisted between sessions.",
    "acceptanceCriteria": [
      "Tasks persist a priority value of high, medium, or low",
      "Users can see priority on task cards without opening details",
      "Users can edit priority from the task edit flow",
      "Users can filter the task list by priority",
      "Typecheck passes",
      "Relevant UI flows are verified in browser"
    ],
    "passes": false,
    "notes": ""
  },
  "planning": {
    "cycle": 1,
    "currentObjective": "Add the persisted priority field so later slices can build UI on top of it"
  },
  "prdChain": [
    {
      "cycle": 1,
      "objective": "Persist task priority in the data model",
      "status": "active",
      "storyIds": ["US-001"],
      "notes": ""
    }
  ],
  "userStories": [
    {
      "id": "US-001",
      "title": "Add priority field to database",
      "description": "As a developer, I need to store task priority so it persists across sessions.",
      "acceptanceCriteria": [
        "Add priority column to tasks table: high, medium, or low",
        "Default existing and new tasks to medium priority",
        "Generate and run migration successfully",
        "Typecheck passes"
      ],
      "priority": 1,
      "passes": false,
      "notes": ""
    }
  ]
}
```

---

## Checklist

Before finishing:

- [ ] `prd.json` is valid JSON.
- [ ] `finalSuccessCriteria` describes the whole target outcome.
- [ ] `finalSuccessCriteria.passes` is `false`.
- [ ] `planning.cycle` is `1`.
- [ ] `prdChain` has one active cycle 1 entry.
- [ ] `userStories` contains only the first small slice.
- [ ] Every story has `passes: false`.
- [ ] Every story has verifiable acceptance criteria.
- [ ] `progress.txt` exists and records the setup.
- [ ] No implementation work was started.

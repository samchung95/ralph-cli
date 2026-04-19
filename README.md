# Ralph

![Ralph](ralph.webp)

Ralph is an autonomous AI agent loop that runs AI coding tools ([Amp](https://ampcode.com), [Claude Code](https://docs.anthropic.com/en/docs/claude-code), [GitHub Copilot CLI](https://docs.github.com/copilot/concepts/agents/about-copilot-cli), or [ChatGPT Codex](https://developers.openai.com/codex/cli)) in alternating developer and planner phases until a global final success criteria is met. Each phase is a fresh instance with clean context. Memory persists via git history, `progress.txt`, and the evolving `prd.json`.

Based on [Geoffrey Huntley's Ralph pattern](https://ghuntley.com/ralph/).

[Read my in-depth article on how I use Ralph](https://x.com/ryancarson/status/2008548371712135632)

## Prerequisites

- One of the following AI coding tools installed and authenticated:
  - [Amp CLI](https://ampcode.com) (default)
  - [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (`npm install -g @anthropic-ai/claude-code`)
  - [GitHub Copilot CLI](https://docs.github.com/copilot/how-tos/set-up/install-copilot-cli) (`npm install -g @github/copilot`)
  - [ChatGPT Codex CLI](https://developers.openai.com/codex/cli) (`npm i -g @openai/codex`)
- `jq` installed (`brew install jq` on macOS)
- A git repository for your project

## Install

### Recommended: Node CLI

Install Ralph globally from this repo:

```bash
git clone https://github.com/samchung95/ralph-cli.git
cd ralph-cli/cli
npm install
npm run build
npm install -g .
```

The `ralph-cli` package name on npm is currently a placeholder and does not expose the `ralph` command. Until this CLI is published, install from the local `cli` package.

Initialize Ralph in your project:

```bash
cd your-project
ralph init
```

This creates:

- `DEVELOPER.md`
- `PLANNER.md`
- `prd.json.example`
- `progress.txt`

Install the `/ralph` setup skill into your AI tool:

```bash
# Claude Code (default)
ralph install

# Amp
ralph install --tool amp

# GitHub Copilot CLI
ralph install --tool copilot

# ChatGPT Codex
ralph install --tool codex
```

### Manual Script Mode

You can also copy the shell runner into a project:

```bash
# From your project root
mkdir -p scripts/ralph
cp /path/to/ralph/ralph.sh scripts/ralph/
cp /path/to/ralph/DEVELOPER.md scripts/ralph/DEVELOPER.md
cp /path/to/ralph/PLANNER.md scripts/ralph/PLANNER.md
cp /path/to/ralph/prd.json.example scripts/ralph/prd.json.example

chmod +x scripts/ralph/ralph.sh
```

### Manual Skill Install

If you are not using `ralph install`, copy the setup skill manually:

For Amp:
```bash
cp -r skills/ralph ~/.config/amp/skills/
```

For Claude Code:
```bash
cp -r skills/ralph ~/.claude/skills/
```

For GitHub Copilot CLI:
```bash
cp -r skills/ralph ~/.copilot/skills/
```

For ChatGPT Codex:
```bash
cp -r skills/ralph ~/.agents/skills/
```

### Claude Code Marketplace

Add the Ralph marketplace to Claude Code:

```bash
/plugin marketplace add snarktank/ralph
```

Then install the skill:

```bash
/plugin install ralph-skills@ralph-marketplace
```

The skill is automatically invoked when you ask Claude to:
- "set up ralph", "start ralph", "plan this with ralph"
- "create prd.json", "prepare the initial ralph step"

### Configure Amp auto-handoff (recommended)

Add to `~/.config/amp/settings.json`:

```json
{
  "amp.experimental.autoHandoff": { "context": 90 }
}
```

This enables automatic handoff when context fills up, allowing Ralph to handle large stories that exceed a single context window.

## Workflow

### 1. Set Up the First Ralph Step

Use the Ralph skill to create the initial evolving `prd.json`:

```
Load the ralph skill and set up Ralph for [your feature description]
```

Answer any clarifying questions. The skill creates `prd.json` with `finalSuccessCriteria`, a first small `userStories` slice, and a `prdChain`. The planner will evolve the next slice after each developer pass.

### 2. Run Ralph

With the Node CLI:

```bash
# Claude Code, 10 cycles by default
ralph run

# Claude Code, 20 cycles
ralph run 20

# Amp
ralph run --tool amp

# GitHub Copilot CLI
ralph run --tool copilot

# ChatGPT Codex
ralph run --tool codex

# Fully autonomous Claude Code mode
ralph run --dangerously-skip-permissions 15
```

With the copied shell script:

```bash
# Using Amp (default)
./scripts/ralph/ralph.sh [max_cycles]

# Using Claude Code
./scripts/ralph/ralph.sh --tool claude [max_cycles]

# Using GitHub Copilot CLI
./scripts/ralph/ralph.sh --tool copilot [max_cycles]

# Using ChatGPT Codex
./scripts/ralph/ralph.sh --tool codex [max_cycles]
```

Default is 10 cycles. Use `--tool amp`, `--tool claude`, `--tool copilot`, or `--tool codex` to select your AI coding tool.

Ralph will:
1. Create a feature branch (from PRD `branchName`)
2. Run a developer phase from `DEVELOPER.md`
3. Implement the highest priority story where `passes: false`
4. Commit if checks pass and mark the story complete in `prd.json`
5. Run a planner phase from `PLANNER.md`
6. Check `finalSuccessCriteria`
7. If success criteria pass, output `<promise>COMPLETE</promise>`
8. Otherwise, evolve `prd.json` with the next PRD slice and repeat

## Key Files

| File | Purpose |
|------|---------|
| `ralph.sh` | The bash loop that spawns fresh AI instances (supports `--tool amp`, `--tool claude`, `--tool copilot`, or `--tool codex`) |
| `DEVELOPER.md` | Source prompt for implementation phases |
| `PLANNER.md` | Source prompt for evaluation and next-PRD planning phases |
| `prompt.md` | Runtime prompt file generated for Amp |
| `CLAUDE.md` | Runtime prompt file generated for Claude Code |
| `AGENTS.md` | Runtime prompt file generated for GitHub Copilot CLI and ChatGPT Codex |
| `prd.json` | Evolving PRD chain with `finalSuccessCriteria`, active stories, and planning metadata |
| `prd.json.example` | Example evolving PRD format for reference |
| `progress.txt` | Append-only learnings for future iterations |
| `skills/ralph/` | Skill for setting up the initial evolving PRD chain (works with Amp, Claude Code, GitHub Copilot CLI, and ChatGPT Codex) |
| `.claude-plugin/` | Plugin manifest for Claude Code marketplace discovery |
| `flowchart/` | Interactive visualization of how Ralph works |

## Flowchart

[![Ralph Flowchart](ralph-flowchart.png)](https://snarktank.github.io/ralph/)

**[View Interactive Flowchart](https://snarktank.github.io/ralph/)** - Click through to see each step with animations.

The `flowchart/` directory contains the source code. To run locally:

```bash
cd flowchart
npm install
npm run dev
```

## Critical Concepts

### Each Phase = Fresh Context

Each developer or planner phase spawns a **new AI instance** (Amp, Claude Code, GitHub Copilot CLI, or ChatGPT Codex) with clean context. The only memory between phases is:
- Git history (commits from previous phases)
- `progress.txt` (learnings and context)
- `prd.json` (current slice, PRD chain, and final success criteria)

### Evolving PRDs

Ralph no longer needs a fully preplanned backlog. The first `prd.json` contains a global `finalSuccessCriteria` and a small first slice. After each developer phase, the planner checks the work so far. If the final criteria are not met, it writes the next small PRD slice into `userStories` and records the chain in `prdChain`.

### Small Tasks

Each PRD item should be small enough to complete in one context window. If a task is too big, the LLM runs out of context before finishing and produces poor code.

Right-sized stories:
- Add a database column and migration
- Add a UI component to an existing page
- Update a server action with new logic
- Add a filter dropdown to a list

Too big (split these):
- "Build the entire dashboard"
- "Add authentication"
- "Refactor the API"

### Agent Instruction Updates Are Critical

After each developer phase, Ralph can update relevant agent instruction files with learnings. This is key because AI coding tools automatically read these files, so future phases and future human developers benefit from discovered patterns, gotchas, and conventions.

Examples of what to add to agent instruction files:
- Patterns discovered ("this codebase uses X for Y")
- Gotchas ("do not forget to update Z when changing W")
- Useful context ("the settings panel is in component X")

### Feedback Loops

Ralph only works if there are feedback loops:
- Typecheck catches type errors
- Tests verify behavior
- CI must stay green (broken code compounds across iterations)

### Browser Verification for UI Stories

Frontend stories must include "Verify in browser using dev-browser skill" in acceptance criteria. Ralph will use the dev-browser skill to navigate to the page, interact with the UI, and confirm changes work.

### Stop Condition

When the planner verifies `finalSuccessCriteria.passes: true`, it outputs `<promise>COMPLETE</promise>` and the loop exits.

## Debugging

Check current state:

```bash
# See which stories are done
cat prd.json | jq '.userStories[] | {id, title, passes}'

# See global completion status
cat prd.json | jq '.finalSuccessCriteria'

# See learnings from previous iterations
cat progress.txt

# Check git history
git log --oneline -10
```

## Customizing the Prompt

After copying `DEVELOPER.md` and `PLANNER.md` to your project, customize them for your project:
- Add project-specific quality check commands
- Include codebase conventions
- Add common gotchas for your stack

## Archiving

Ralph automatically archives previous runs when you start a new feature (different `branchName`). Archives are saved to `archive/YYYY-MM-DD-feature-name/`.

## References

- [Geoffrey Huntley's Ralph article](https://ghuntley.com/ralph/)
- [Amp documentation](https://ampcode.com/manual)
- [Claude Code documentation](https://docs.anthropic.com/en/docs/claude-code)
- [GitHub Copilot CLI documentation](https://docs.github.com/copilot/concepts/agents/about-copilot-cli)
- [ChatGPT Codex CLI documentation](https://developers.openai.com/codex/cli)

# Ralph Repository Instructions

## Overview

Ralph is an autonomous AI agent loop that runs AI coding tools (Amp, Claude Code, GitHub Copilot CLI, or ChatGPT Codex) in alternating developer and planner phases until a global final success criteria is met. Each phase is a fresh instance with clean context.

## Commands

```bash
# Run the flowchart dev server
cd flowchart && npm run dev

# Build the flowchart
cd flowchart && npm run build

# Run Ralph with Amp (default)
./ralph.sh [max_cycles]

# Run Ralph with Claude Code
./ralph.sh --tool claude [max_cycles]

# Run Ralph with GitHub Copilot CLI
./ralph.sh --tool copilot [max_cycles]

# Run Ralph with ChatGPT Codex
./ralph.sh --tool codex [max_cycles]
```

## Key Files

- `ralph.sh` - The bash loop that alternates developer and planner agents.
- `DEVELOPER.md` - Source prompt for implementation phases.
- `PLANNER.md` - Source prompt for evaluation and next-PRD planning phases.
- `prompt.md` - Runtime prompt file generated for Amp.
- `CLAUDE.md` - Runtime prompt file generated for Claude Code.
- `AGENTS.md` - Runtime prompt file generated for GitHub Copilot CLI or ChatGPT Codex when Ralph runs.
- `prd.json.example` - Example evolving PRD format with `finalSuccessCriteria`, `planning`, `prdChain`, and active `userStories`.
- `flowchart/` - Interactive React Flow diagram explaining how Ralph works.

## Flowchart

The `flowchart/` directory contains an interactive visualization built with React Flow. It's designed for presentations - click through to reveal each step with animations.

To run locally:

```bash
cd flowchart
npm install
npm run dev
```

## Patterns

- Each cycle runs developer, then planner.
- The runner copies `DEVELOPER.md` or `PLANNER.md` into the selected tool's runtime prompt file before spawning the tool.
- Memory persists via git history, `progress.txt`, and the evolving `prd.json`.
- `prd.json` should keep a global `finalSuccessCriteria` so the planner can decide when to stop.
- Stories should be small enough to complete in one developer phase.
- Always update repository instructions with discovered patterns for future iterations.

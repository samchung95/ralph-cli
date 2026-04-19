# ralph-cli

CLI tool for [Ralph](https://github.com/snarktank/ralph) — an autonomous AI agent loop that runs AI coding tools (Claude Code, Amp, GitHub Copilot CLI, or ChatGPT Codex) in alternating developer and planner phases until final success criteria are met.

## Install

```bash
git clone https://github.com/samchung95/ralph-cli.git
cd ralph-cli/cli
npm install
npm run build
npm install -g .
```

The `ralph-cli` package name on npm is currently a placeholder and does not expose the `ralph` command. Until this CLI is published, install from the local package.

## Quick Start

```bash
# 1. Initialize Ralph in your project
cd your-project
ralph init

# 2. Install the /ralph setup skill for your AI tool
ralph install              # Claude Code
ralph install --tool amp
ralph install --tool copilot
ralph install --tool codex

# 3. Ask your AI tool to set up the first evolving prd.json
# "Use the /ralph skill to set up Ralph for [feature]"

# 4. Run the develop/plan loop
ralph run                  # Claude Code, 10 cycles
ralph run 20               # Claude Code, 20 cycles
ralph run --tool amp
ralph run --tool copilot
ralph run --tool codex
```

## Commands

### `ralph init`

Copies `DEVELOPER.md`, `PLANNER.md`, `prd.json.example`, and `progress.txt` into your project root so Ralph knows how to operate in your repo.

```bash
cd your-project
ralph init
```

Options:
- `-d, --dir <path>` — Target directory (default: cwd)
- `--force` — Overwrite existing files

### `ralph install`

Installs the Ralph setup skill (`/ralph`) into your AI tool's skills directory so it's available globally.

```bash
ralph install              # Claude Code (default)
ralph install --tool amp
ralph install --tool codex
ralph install --tool copilot
```

After installing, you can use this skill in the selected AI tool:
- `/ralph` — Set up the initial evolving `prd.json` and `progress.txt`

### `ralph run [cycles]`

Runs the Ralph autonomous agent loop — a TypeScript port of `ralph.sh`. Each cycle runs a developer phase from `DEVELOPER.md`, then a planner phase from `PLANNER.md`. Ralph writes the active phase prompt into the selected tool's runtime prompt file before spawning the tool.

```bash
ralph run                         # Claude Code, 10 cycles
ralph run 20                      # Claude Code, 20 cycles
ralph run --tool amp              # Amp
ralph run --tool copilot          # GitHub Copilot CLI
ralph run --tool codex            # ChatGPT Codex
ralph run --dangerously-skip-permissions 15
```

Options:
- `--tool <tool>` — AI tool to use: `claude`, `amp`, `copilot`, or `codex` (default: `claude`)
- `--dangerously-skip-permissions` — Pass `--dangerously-skip-permissions` to Claude Code
- `-d, --dir <path>` — Project directory containing `DEVELOPER.md`, `PLANNER.md`, and `prd.json` (default: cwd)

## What Happens During `ralph run`

1. Validates the AI tool is installed and required files exist (`DEVELOPER.md`, `PLANNER.md`, and `prd.json`)
2. Archives previous run if the branch in `prd.json` changed
3. Initializes `progress.txt` if it doesn't exist
4. For each cycle:
   - Copies `DEVELOPER.md` into the selected tool's runtime prompt file and runs a developer agent
   - Copies `PLANNER.md` into the selected tool's runtime prompt file and runs a planner agent
   - The planner checks `finalSuccessCriteria` and either writes the next PRD slice or emits `<promise>COMPLETE</promise>`
5. If max cycles are reached without completion, exits with error

## Development

```bash
cd cli
npm install
npm run build      # Build with tsup
npm run dev        # Build in watch mode
npm run typecheck  # Type check only
```

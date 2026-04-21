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

# Optional: remember full-access mode for Codex
ralph bypass on

# Optional: remember auto-approval for Copilot prompts
ralph auto-approve on

# 3. Ask your AI tool to set up the first evolving prd.json
# "Use the /ralph skill to set up Ralph for [feature]"

# 4. Run the develop/plan loop
ralph run                  # Claude Code, 10 cycles
ralph run 20               # Claude Code, 20 cycles
ralph run --tool amp
ralph run --tool copilot
ralph run --tool copilot --auto-approve
ralph run --tool codex
ralph run --tool codex --bypass

# Optional helpers
ralph validate             # Check prd.json structure
ralph reset                # Archive current run and restore fresh prd.json
ralph fix                  # Repair a broken prd.json in one doctor pass
```

## Commands

### `ralph init`

Copies `DEVELOPER.md`, `PLANNER.md`, `DOCTOR.md`, `prd.json.example`, and `progress.txt` into your project root so Ralph knows how to operate in your repo.

```bash
cd your-project
ralph init
```

Options:
- `-d, --dir <path>` — Target directory (default: cwd)
- `--force` — Overwrite existing files

### `ralph install`

Installs the Ralph setup skill (`/ralph`) into your AI tool's skills directory so it's available globally. If `/ralph` is already installed for the selected tool, Ralph removes the old skill folder first so stale files do not linger.

```bash
ralph install              # Claude Code (default)
ralph install --tool amp
ralph install --tool codex
ralph install --tool copilot
```

After installing, you can use this skill in the selected AI tool:
- `/ralph` — Set up the initial evolving `prd.json` and `progress.txt`

### `ralph bypass [on|off|status]`

Shows or changes the remembered bypass mode.

```bash
ralph bypass status
ralph bypass on
ralph bypass off
```

When bypass is on, Codex runs use `--dangerously-bypass-approvals-and-sandbox` for full access. When bypass is off, Codex uses sandboxed `--full-auto`.

### `ralph auto-approve [on|off|status]`

Shows or changes remembered auto-approval for Copilot prompts.

```bash
ralph auto-approve status
ralph auto-approve on
ralph auto-approve off
```

Copilot already runs with `--allow-all`, `--autopilot`, and `--no-ask-user`. If Copilot still shows an approval prompt, auto-approve watches its output and answers automatically.

### `ralph run [cycles]`

Runs the Ralph autonomous agent loop — a TypeScript port of `ralph.sh`. Each cycle runs a developer phase from `DEVELOPER.md`, then a planner phase from `PLANNER.md`. Ralph writes the active phase prompt into the selected tool's runtime prompt file before spawning the tool.

```bash
ralph run                         # Claude Code, 10 cycles
ralph run 20                      # Claude Code, 20 cycles
ralph run --tool amp              # Amp
ralph run --tool copilot          # GitHub Copilot CLI
ralph run --tool copilot --auto-approve
ralph run --tool copilot --no-auto-approve
ralph run --tool codex            # ChatGPT Codex
ralph run --tool codex --bypass   # Codex full access for this run
ralph run --tool codex --no-bypass
ralph run --dangerously-skip-permissions 15
```

Options:
- `--tool <tool>` — AI tool to use: `claude`, `amp`, `copilot`, or `codex` (default: `claude`)
- `--dangerously-skip-permissions` — Pass `--dangerously-skip-permissions` to Claude Code
- `--bypass` / `--no-bypass` — Override the remembered bypass setting for this run
- `--auto-approve` / `--no-auto-approve` — Override remembered Copilot auto-approval for this run
- `-d, --dir <path>` — Project directory containing `DEVELOPER.md`, `PLANNER.md`, and `prd.json` (default: cwd)

## What Happens During `ralph run`

1. Validates the AI tool is installed and required files exist (`DEVELOPER.md`, `PLANNER.md`, and `prd.json`)
2. Validates `prd.json` before the first cycle starts
3. Archives previous run if the branch in `prd.json` changed
4. Initializes `progress.txt` if it doesn't exist
5. For each cycle:
   - Validates `prd.json` before the developer phase starts
   - Copies `DEVELOPER.md` into the selected tool's runtime prompt file and runs a developer agent
   - Validates `prd.json` after the developer phase
   - Copies `PLANNER.md` into the selected tool's runtime prompt file and runs a planner agent
   - Validates `prd.json` after the planner phase
   - The planner checks `finalSuccessCriteria` and either writes the next PRD slice or emits `<promise>COMPLETE</promise>`
6. If max cycles are reached without completion, exits with error

If an agent leaves the PRD in an invalid shape at any checkpoint, the run stops immediately instead of continuing with a broken plan state.

### `ralph validate`

Validates the structure and Ralph-specific consistency of `prd.json`, including required sections, field types, and active cycle alignment.

```bash
ralph validate
ralph validate --silent
ralph validate -d path/to/project
```

### `ralph reset`

Archives the current `prd.json` and `progress.txt` into `archive/<timestamp>-<branch>/`, restores `prd.json` from `prd.json.example`, resets `progress.txt`, and clears `.last-branch` so you can author a fresh PRD before the next run.

```bash
ralph reset
ralph reset -d path/to/project
```

### `ralph fix`

Runs a single PRD doctor pass to repair a broken `prd.json`. Before invoking the AI tool, it detects current validation errors and injects them into the `DOCTOR.md` prompt. If `prd.json` is already valid, it exits cleanly without calling the AI tool.

```bash
ralph fix                       # Claude Code (default)
ralph fix --tool amp
ralph fix --tool copilot
ralph fix --tool codex
ralph fix -d path/to/project
```

Options:
- `--tool <tool>` — AI tool to use (default: `claude`)
- `-d, --dir <path>` — Project directory containing `DOCTOR.md` and `prd.json` (default: cwd)
- `--bypass` / `--no-bypass` — Override bypass mode for Codex
- `--auto-approve` / `--no-auto-approve` — Override Copilot auto-approval

## Development

```bash
cd cli
npm install
npm run build      # Build with tsup
npm run dev        # Build in watch mode
npm run typecheck  # Type check only
npm install -g .   # Update the globally installed ralph command from this checkout
```

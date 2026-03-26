# ralph-cli

CLI tool for [Ralph](https://github.com/snarktank/ralph) — an autonomous AI agent loop that runs AI coding tools (Claude Code or Amp) repeatedly until all PRD items are complete.

## Install

```bash
npm install -g ralph-cli
```

## Commands

### `ralph init`

Copies `CLAUDE.md` and `prd.json.example` into your project root so Ralph knows how to operate in your repo.

```bash
cd your-project
ralph init
```

Options:
- `-d, --dir <path>` — Target directory (default: cwd)
- `--force` — Overwrite existing files

### `ralph install`

Installs the Ralph skills (`/prd` and `/ralph`) into Claude Code's `~/.claude/skills/` directory so they're available globally.

```bash
ralph install
```

After installing, you can use these skills in Claude Code:
- `/prd` — Generate a Product Requirements Document
- `/ralph` — Convert a PRD into `prd.json` format

### `ralph run [iterations]`

Runs the Ralph autonomous agent loop — a TypeScript port of `ralph.sh`. Spawns a fresh Claude Code (or Amp) instance per iteration, feeding it the `CLAUDE.md` prompt. Loops until all PRD stories pass or max iterations reached.

```bash
# Run with Claude Code, 10 iterations (default)
ralph run

# Run with 20 iterations
ralph run 20

# Run with Amp instead of Claude
ralph run --tool amp

# Run with dangerous permissions skip (for fully autonomous mode)
ralph run --dangerously-skip-permissions 15
```

Options:
- `--tool <tool>` — AI tool to use: `claude` or `amp` (default: `claude`)
- `--dangerously-skip-permissions` — Pass `--dangerously-skip-permissions` to Claude Code
- `-d, --dir <path>` — Project directory containing `CLAUDE.md` and `prd.json` (default: cwd)

## Typical Workflow

```bash
# 1. Install Ralph globally
npm install -g ralph-cli

# 2. Install skills into Claude Code
ralph install

# 3. Set up a project
cd your-project
ralph init

# 4. Create a PRD (use the /prd skill in Claude Code, or write one manually)
#    Then convert it to prd.json (use the /ralph skill, or create manually)

# 5. Run the loop
ralph run --dangerously-skip-permissions 15
```

## What Happens During `ralph run`

1. Validates the AI tool is installed and required files exist (`CLAUDE.md`, `prd.json`)
2. Archives previous run if the branch in `prd.json` changed
3. Initializes `progress.txt` if it doesn't exist
4. For each iteration:
   - Spawns a fresh AI instance with the `CLAUDE.md` prompt
   - Streams output to the terminal in real-time
   - Checks for the `<promise>COMPLETE</promise>` signal
   - If all stories are done, exits successfully
5. If max iterations reached without completion, exits with error

## Development

```bash
cd cli
npm install
npm run build      # Build with tsup
npm run dev        # Build in watch mode
npm run typecheck  # Type check only
```

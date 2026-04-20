#!/bin/bash
# Ralph Wiggum - Long-running AI agent loop
# Usage: ./ralph.sh [--tool amp|claude|copilot|codex] [max_cycles]

set -e

# Parse arguments
TOOL="amp"  # Default to amp for backwards compatibility
MAX_CYCLES=10

while [[ $# -gt 0 ]]; do
  case $1 in
    --tool)
      TOOL="$2"
      shift 2
      ;;
    --tool=*)
      TOOL="${1#*=}"
      shift
      ;;
    *)
      # Assume it's max_cycles if it's a number
      if [[ "$1" =~ ^[0-9]+$ ]]; then
        MAX_CYCLES="$1"
      fi
      shift
      ;;
  esac
done

# Validate tool choice
if [[ "$TOOL" != "amp" && "$TOOL" != "claude" && "$TOOL" != "copilot" && "$TOOL" != "codex" ]]; then
  echo "Error: Invalid tool '$TOOL'. Must be one of: amp, claude, copilot, codex."
  exit 1
fi
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRD_FILE="$SCRIPT_DIR/prd.json"
PROGRESS_FILE="$SCRIPT_DIR/progress.txt"
ARCHIVE_DIR="$SCRIPT_DIR/archive"
LAST_BRANCH_FILE="$SCRIPT_DIR/.last-branch"
DEVELOPER_PROMPT="$SCRIPT_DIR/DEVELOPER.md"
PLANNER_PROMPT="$SCRIPT_DIR/PLANNER.md"

if [ ! -f "$DEVELOPER_PROMPT" ]; then
  echo "Error: DEVELOPER.md not found in $SCRIPT_DIR"
  exit 1
fi

if [ ! -f "$PLANNER_PROMPT" ]; then
  echo "Error: PLANNER.md not found in $SCRIPT_DIR"
  exit 1
fi

if [ ! -f "$PRD_FILE" ]; then
  echo "Error: prd.json not found in $SCRIPT_DIR"
  echo "Create a prd.json with finalSuccessCriteria and the first PRD slice."
  exit 1
fi

if ! jq -e '.finalSuccessCriteria' "$PRD_FILE" >/dev/null 2>&1; then
  echo "Warning: prd.json has no finalSuccessCriteria. The planner phase should migrate it before the loop can complete."
fi

runtime_prompt_file() {
  if [[ "$TOOL" == "amp" ]]; then
    echo "$SCRIPT_DIR/prompt.md"
  elif [[ "$TOOL" == "claude" ]]; then
    echo "$SCRIPT_DIR/CLAUDE.md"
  else
    echo "$SCRIPT_DIR/AGENTS.md"
  fi
}

run_phase() {
  local phase="$1"
  local source_prompt
  local runtime_prompt

  if [[ "$phase" == "developer" ]]; then
    source_prompt="$DEVELOPER_PROMPT"
  else
    source_prompt="$PLANNER_PROMPT"
  fi

  runtime_prompt="$(runtime_prompt_file)"
  cp "$source_prompt" "$runtime_prompt"
  echo "Loaded $(basename "$source_prompt") into $(basename "$runtime_prompt")" >&2

  if [[ "$TOOL" == "amp" ]]; then
    amp --dangerously-allow-all < "$runtime_prompt" 2>&1 | tee /dev/stderr
  elif [[ "$TOOL" == "claude" ]]; then
    claude --dangerously-skip-permissions --print < "$runtime_prompt" 2>&1 | tee /dev/stderr
  elif [[ "$TOOL" == "copilot" ]]; then
    copilot --allow-all --autopilot --no-ask-user < "$runtime_prompt" 2>&1 | tee /dev/stderr
  else
    codex exec --full-auto - < "$runtime_prompt" 2>&1 | tee /dev/stderr
  fi
}

# Archive previous run if branch changed
if [ -f "$PRD_FILE" ] && [ -f "$LAST_BRANCH_FILE" ]; then
  CURRENT_BRANCH=$(jq -r '.branchName // empty' "$PRD_FILE" 2>/dev/null || echo "")
  LAST_BRANCH=$(cat "$LAST_BRANCH_FILE" 2>/dev/null || echo "")
  
  if [ -n "$CURRENT_BRANCH" ] && [ -n "$LAST_BRANCH" ] && [ "$CURRENT_BRANCH" != "$LAST_BRANCH" ]; then
    # Archive the previous run
    DATE=$(date +%Y-%m-%d)
    # Strip "ralph/" prefix from branch name for folder
    FOLDER_NAME=$(echo "$LAST_BRANCH" | sed 's|^ralph/||')
    ARCHIVE_FOLDER="$ARCHIVE_DIR/$DATE-$FOLDER_NAME"
    
    echo "Archiving previous run: $LAST_BRANCH"
    mkdir -p "$ARCHIVE_FOLDER"
    [ -f "$PRD_FILE" ] && cp "$PRD_FILE" "$ARCHIVE_FOLDER/"
    [ -f "$PROGRESS_FILE" ] && cp "$PROGRESS_FILE" "$ARCHIVE_FOLDER/"
    echo "   Archived to: $ARCHIVE_FOLDER"
    
    # Reset progress file for new run
    echo "# Ralph Progress Log" > "$PROGRESS_FILE"
    echo "Started: $(date)" >> "$PROGRESS_FILE"
    echo "---" >> "$PROGRESS_FILE"
  fi
fi

# Track current branch
if [ -f "$PRD_FILE" ]; then
  CURRENT_BRANCH=$(jq -r '.branchName // empty' "$PRD_FILE" 2>/dev/null || echo "")
  if [ -n "$CURRENT_BRANCH" ]; then
    echo "$CURRENT_BRANCH" > "$LAST_BRANCH_FILE"
  fi
fi

# Initialize progress file if it doesn't exist
if [ ! -f "$PROGRESS_FILE" ]; then
  echo "# Ralph Progress Log" > "$PROGRESS_FILE"
  echo "Started: $(date)" >> "$PROGRESS_FILE"
  echo "---" >> "$PROGRESS_FILE"
fi

echo "Starting Ralph - Tool: $TOOL - Max cycles: $MAX_CYCLES"

for i in $(seq 1 $MAX_CYCLES); do
  echo ""
  echo "==============================================================="
  echo "  Ralph Cycle $i of $MAX_CYCLES ($TOOL developer)"
  echo "==============================================================="

  OUTPUT=$(run_phase developer) || true
  
  if echo "$OUTPUT" | grep -q "<promise>COMPLETE</promise>"; then
    echo "Warning: Developer phase emitted the completion signal. Ignoring it; only the planner can complete Ralph."
  fi

  echo "Developer phase $i complete. Planning next..."

  echo ""
  echo "==============================================================="
  echo "  Ralph Cycle $i of $MAX_CYCLES ($TOOL planner)"
  echo "==============================================================="

  OUTPUT=$(run_phase planner) || true

  if echo "$OUTPUT" | grep -q "<promise>COMPLETE</promise>"; then
    echo ""
    echo "Ralph completed the final success criteria!"
    echo "Completed during planner phase of cycle $i of $MAX_CYCLES"
    exit 0
  fi

  echo "Planner phase $i complete. Continuing..."
  sleep 2
done

echo ""
echo "Ralph reached max cycles ($MAX_CYCLES) without meeting the final success criteria."
echo "Check $PROGRESS_FILE for status."
exit 1

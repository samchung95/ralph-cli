export function initialProgressText(
  options: {
    goal?: string;
    branch?: string;
    cycle?: number;
    currentAgent?: string;
    currentObjective?: string;
    startedAt?: Date;
  } = {}
): string {
  const startedAt = options.startedAt ?? new Date();
  const cycle = options.cycle ?? 1;

  return `# Ralph Progress

Goal: ${options.goal ?? "[one-line final success goal]"}
Branch: ${options.branch ?? "[branch]"}
Cycle: ${cycle}
Status: planning
Current agent: ${options.currentAgent ?? "planner"}
Current objective: ${options.currentObjective ?? "[planner selects first handoff]"}

Next:
- Planner selects the next focused handoff.

Blockers:
- none

Important patterns:
- none yet
---

Started: ${startedAt}
`;
}

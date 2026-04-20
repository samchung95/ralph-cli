import { resolve, join } from "path";
import { log } from "../utils/log.js";
import { fileExists, readText, writeText, copyFileSafe } from "../utils/files.js";
import { exec, commandExists } from "../utils/exec.js";
import { readConfig } from "../utils/config.js";
import { normalizeTool, TOOL_NAMES } from "../types.js";
import type { RunOptions, Tool } from "../types.js";

const COMPLETION_SIGNAL = "<promise>COMPLETE</promise>";
type Phase = "developer" | "planner";

const PHASE_PROMPTS: Record<Phase, string> = {
  developer: "DEVELOPER.md",
  planner: "PLANNER.md",
};

interface ToolConfig {
  binary: string;
  runtimePromptFile: string;
  args: (dangerouslySkipPermissions: boolean, bypass: boolean) => string[];
}

const TOOL_CONFIG: Record<Tool, ToolConfig> = {
  claude: {
    binary: "claude",
    runtimePromptFile: "CLAUDE.md",
    args: (dangerouslySkipPermissions) => {
      const args: string[] = [];
      if (dangerouslySkipPermissions) {
        args.push("--dangerously-skip-permissions");
      }
      args.push("--print");
      return args;
    },
  },
  amp: {
    binary: "amp",
    runtimePromptFile: "prompt.md",
    args: () => ["--dangerously-allow-all"],
  },
  copilot: {
    binary: "copilot",
    runtimePromptFile: "AGENTS.md",
    args: () => [
      "--allow-all",
      "--autopilot",
      "--no-ask-user",
      "--prompt",
      "Read AGENTS.md in the current directory and execute its Ralph phase instructions.",
    ],
  },
  codex: {
    binary: "codex",
    runtimePromptFile: "AGENTS.md",
    args: (_dangerouslySkipPermissions, bypass) =>
      bypass
        ? ["exec", "--dangerously-bypass-approvals-and-sandbox", "-"]
        : ["exec", "--full-auto", "-"],
  },
};

/**
 * `ralph run [cycles]` — TypeScript port of ralph.sh.
 *
 * Spawns fresh AI tool instances in alternating developer/planner phases.
 * The phase source prompt is written to the tool-specific runtime prompt file
 * before each run. Loops until the planner emits the completion promise.
 */
export async function runCommand(
  cycles: string,
  options: RunOptions
): Promise<void> {
  const maxCycles = parseInt(cycles, 10);
  const tool = normalizeTool(options.tool);
  const dir = resolve(options.dir);
  const dangerouslySkipPermissions = options.dangerouslySkipPermissions;
  const config = await readConfig();
  const bypass = options.bypass ?? config.bypass;
  const copilotAutoApprove =
    options.autoApprove ?? config.copilotAutoApprove;

  if (!tool) {
    log.error(`Invalid tool '${options.tool}'. Must be one of: ${TOOL_NAMES}.`);
    process.exit(1);
  }

  if (Number.isNaN(maxCycles) || maxCycles < 1) {
    log.error("Cycles must be a positive number.");
    process.exit(1);
  }

  const toolConfig = TOOL_CONFIG[tool];

  // ── Validate tool is installed ──────────────────────────────────────────
  if (!(await commandExists(toolConfig.binary))) {
    log.error(
      `${toolConfig.binary} is not installed or not on PATH. Install it first.`
    );
    process.exit(1);
  }

  // ── Validate required files exist ──────────────────────────────────────
  const prdPath = join(dir, "prd.json");
  const progressPath = join(dir, "progress.txt");
  const lastBranchPath = join(dir, ".last-branch");

  for (const promptFile of Object.values(PHASE_PROMPTS)) {
    const promptPath = join(dir, promptFile);
    if (!(await fileExists(promptPath))) {
      log.error(`${promptFile} not found in ${dir}`);
      log.info('Run "ralph init" first to set up the project.');
      process.exit(1);
    }
  }

  if (!(await fileExists(prdPath))) {
    log.error(`prd.json not found in ${dir}`);
    log.info("Create a prd.json with finalSuccessCriteria and the first PRD slice.");
    process.exit(1);
  }

  await warnIfMissingFinalSuccessCriteria(prdPath);

  // ── Archive previous run if branch changed ─────────────────────────────
  if (await fileExists(lastBranchPath)) {
    try {
      const prdContent = JSON.parse(await readText(prdPath));
      const currentBranch: string = prdContent.branchName ?? "";
      const lastBranch = (await readText(lastBranchPath)).trim();

      if (currentBranch && lastBranch && currentBranch !== lastBranch) {
        const date = new Date().toISOString().split("T")[0];
        const folderName = lastBranch.replace(/^ralph\//, "");
        const archiveDir = join(dir, "archive", `${date}-${folderName}`);

        log.info(`Archiving previous run: ${lastBranch}`);
        if (await fileExists(prdPath)) {
          await copyFileSafe(prdPath, join(archiveDir, "prd.json"));
        }
        if (await fileExists(progressPath)) {
          await copyFileSafe(progressPath, join(archiveDir, "progress.txt"));
        }
        log.info(`   Archived to: ${archiveDir}`);

        // Reset progress file for new run
        await writeText(
          progressPath,
          `# Ralph Progress Log\nStarted: ${new Date()}\n---\n`
        );
      }
    } catch {
      // prd.json parse error — skip archiving
    }
  }

  // ── Track current branch ──────────────────────────────────────────────
  try {
    const prdContent = JSON.parse(await readText(prdPath));
    const currentBranch: string = prdContent.branchName ?? "";
    if (currentBranch) {
      await writeText(lastBranchPath, currentBranch);
    }
  } catch {
    // prd.json parse error — skip branch tracking
  }

  // ── Initialize progress file if it doesn't exist ──────────────────────
  if (!(await fileExists(progressPath))) {
    await writeText(
      progressPath,
      `# Ralph Progress Log\nStarted: ${new Date()}\n---\n`
    );
  }

  // ── Run the loop ──────────────────────────────────────────────────────
  log.header(`Starting Ralph — Tool: ${tool} — Max cycles: ${maxCycles}`);
  if (bypass) {
    if (tool === "codex") {
      log.warn("Bypass is on: Codex will run with full access and no approvals.");
    } else {
      log.info(`Bypass is on, but it only changes Codex runs. Current tool: ${tool}`);
    }
  }
  if (copilotAutoApprove) {
    if (tool === "copilot") {
      log.warn("Copilot auto-approve is on: approval prompts will be answered automatically.");
    } else {
      log.info(`Copilot auto-approve is on, but current tool is ${tool}.`);
    }
  }

  for (let i = 1; i <= maxCycles; i++) {
    log.iteration(i, maxCycles, `${tool} developer`);

    const developResult = await runPhase(
      tool,
      dir,
      "developer",
      dangerouslySkipPermissions,
      bypass,
      copilotAutoApprove
    );

    if (developResult.includes(COMPLETION_SIGNAL)) {
      log.warn(
        "Developer phase emitted the completion signal. Ignoring it; only the planner can complete Ralph."
      );
    }

    log.info(`Developer phase ${i} complete. Planning next...`);

    log.iteration(i, maxCycles, `${tool} planner`);

    const planResult = await runPhase(
      tool,
      dir,
      "planner",
      dangerouslySkipPermissions,
      bypass,
      copilotAutoApprove
    );

    if (planResult.includes(COMPLETION_SIGNAL)) {
      console.log("");
      log.success("Ralph completed the final success criteria!");
      log.info(`Completed during planner phase of cycle ${i} of ${maxCycles}`);
      process.exit(0);
    }

    log.info(`Planner phase ${i} complete. Continuing...`);

    // Small pause between cycles
    if (i < maxCycles) {
      await sleep(2000);
    }
  }

  console.log("");
  log.warn(
    `Ralph reached max cycles (${maxCycles}) without meeting the final success criteria.`
  );
  log.info(`Check ${progressPath} for status.`);
  process.exit(1);
}

/**
 * Run a single phase — write the source phase prompt to the tool's expected
 * runtime prompt file, then spawn the AI tool with that prompt piped to stdin.
 * Streams output to the terminal in real-time and returns the full output.
 */
async function runPhase(
  tool: Tool,
  dir: string,
  phase: Phase,
  dangerouslySkipPermissions: boolean,
  bypass: boolean,
  copilotAutoApprove: boolean
): Promise<string> {
  const toolConfig = TOOL_CONFIG[tool];
  const phasePromptPath = join(dir, PHASE_PROMPTS[phase]);
  const runtimePromptPath = join(dir, toolConfig.runtimePromptFile);
  const prompt = await readText(phasePromptPath);

  await writeText(runtimePromptPath, prompt);
  log.info(`Loaded ${PHASE_PROMPTS[phase]} into ${toolConfig.runtimePromptFile}`);

  const result = await exec(
    toolConfig.binary,
    toolConfig.args(dangerouslySkipPermissions, bypass),
    {
      cwd: dir,
      stdin: tool === "copilot" ? undefined : prompt,
      autoApprove:
        tool === "copilot"
          ? {
              enabled: copilotAutoApprove,
              label: "Copilot",
            }
          : undefined,
    }
  );

  return result.stdout + result.stderr;
}

async function warnIfMissingFinalSuccessCriteria(prdPath: string): Promise<void> {
  try {
    const prd = JSON.parse(await readText(prdPath));
    if (!prd.finalSuccessCriteria) {
      log.warn(
        "prd.json has no finalSuccessCriteria. The planner phase should migrate it before the loop can complete."
      );
    }
  } catch {
    log.warn("Could not parse prd.json. The agent will need to fix it before continuing.");
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

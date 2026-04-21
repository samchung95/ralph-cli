import { resolve, join } from "path";
import { log } from "../utils/log.js";
import { fileExists, readText, writeText, getPackageDir, removePathIfExists } from "../utils/files.js";
import { exec, commandExists } from "../utils/exec.js";
import { readConfig } from "../utils/config.js";
import { normalizeTool, TOOL_NAMES } from "../types.js";
import { archiveLabelFromBranch, archiveRunFiles } from "../utils/archive.js";
import { validatePrdFile } from "../utils/prd.js";
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
      "Read_AGENTS.md_and_execute_the_Ralph_phase_instructions.",
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
  const templateDir = join(getPackageDir(), "templates");
  const phasePrompts = {} as Record<Phase, string>;

  for (const [phase, promptFile] of Object.entries(PHASE_PROMPTS) as [
    Phase,
    string
  ][]) {
    const templatePath = join(templateDir, promptFile);
    if (!(await fileExists(templatePath))) {
      log.error(`Template ${promptFile} not found in Ralph package at ${templatePath}`);
      process.exit(1);
    }
    phasePrompts[phase] = await readText(templatePath);
  }

  if (!(await fileExists(prdPath))) {
    log.error(`prd.json not found in ${dir}`);
    log.info("Create a prd.json with finalSuccessCriteria and the first PRD slice.");
    process.exit(1);
  }

  await warnIfMissingFinalSuccessCriteria(prdPath);
  await validatePrdOrExit(prdPath, "run startup");

  // ── Archive previous run if branch changed ─────────────────────────────
  if (await fileExists(lastBranchPath)) {
    try {
      const prdContent = JSON.parse(await readText(prdPath));
      const currentBranch: string = prdContent.branchName ?? "";
      const lastBranch = (await readText(lastBranchPath)).trim();

      if (currentBranch && lastBranch && currentBranch !== lastBranch) {
        log.info(`Archiving previous run: ${lastBranch}`);
        const archiveDir = await archiveRunFiles(dir, archiveLabelFromBranch(lastBranch), [
          prdPath,
          progressPath,
        ]);
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
    await validatePrdOrExit(prdPath, `cycle ${i} start`);

    log.iteration(i, maxCycles, `${tool} developer`);

    const developResult = await runPhase(
      tool,
      dir,
      "developer",
      phasePrompts.developer,
      dangerouslySkipPermissions,
      bypass,
      copilotAutoApprove
    );

    if (hasCompletionSignalLine(developResult)) {
      log.warn(
        "Developer phase emitted the completion signal. Ignoring it; only the planner can complete Ralph."
      );
    }

    await validatePrdOrExit(prdPath, `developer phase ${i}`);

    log.info(`Developer phase ${i} complete. Planning next...`);

    log.iteration(i, maxCycles, `${tool} planner`);

    const planResult = await runPhase(
      tool,
      dir,
      "planner",
      phasePrompts.planner,
      dangerouslySkipPermissions,
      bypass,
      copilotAutoApprove
    );

    await validatePrdOrExit(prdPath, `planner phase ${i}`);

    if (await plannerCompleted(prdPath, planResult)) {
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
 * Cleans up or restores the runtime prompt file after execution.
 */
async function runPhase(
  tool: Tool,
  dir: string,
  phase: Phase,
  prompt: string,
  dangerouslySkipPermissions: boolean,
  bypass: boolean,
  copilotAutoApprove: boolean
): Promise<string> {
  const toolConfig = TOOL_CONFIG[tool];
  const runtimePromptPath = join(dir, toolConfig.runtimePromptFile);

  const previousContent = (await fileExists(runtimePromptPath))
    ? await readText(runtimePromptPath)
    : null;

  await writeText(runtimePromptPath, prompt);
  log.info(`Loaded ${PHASE_PROMPTS[phase]} into ${toolConfig.runtimePromptFile}`);

  let result: { stdout: string; stderr: string };
  try {
    result = await exec(
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
  } finally {
    await restoreOrRemovePromptFile(runtimePromptPath, previousContent);
  }

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

async function validatePrdOrExit(prdPath: string, context: string): Promise<void> {
  const validation = await validatePrdFile(prdPath);
  if (validation.valid) {
    return;
  }

  log.error(`prd.json failed validation after ${context}.`);
  for (const error of validation.errors) {
    log.step(error);
  }
  process.exit(1);
}

async function plannerCompleted(prdPath: string, output: string): Promise<boolean> {
  if (!hasCompletionSignalLine(output)) {
    return false;
  }

  try {
    const prd = JSON.parse(await readText(prdPath));
    if (prd.finalSuccessCriteria?.passes === true) {
      return true;
    }

    log.warn(
      "Planner emitted the completion signal, but prd.json still has finalSuccessCriteria.passes != true. Ignoring completion."
    );
    return false;
  } catch {
    log.warn(
      "Planner emitted the completion signal, but prd.json could not be parsed afterward. Ignoring completion."
    );
    return false;
  }
}

function hasCompletionSignalLine(output: string): boolean {
  return stripAnsi(output)
    .split(/\r?\n/)
    .some((line) => line.trim() === COMPLETION_SIGNAL);
}

function stripAnsi(text: string): string {
  return text.replace(/\u001B\[[0-9;]*m/g, "");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * After a phase, restore the runtime prompt file to its previous content
 * (if it existed before) or delete it (if Ralph created it).
 */
async function restoreOrRemovePromptFile(
  runtimePromptPath: string,
  previousContent: string | null
): Promise<void> {
  if (previousContent !== null) {
    await writeText(runtimePromptPath, previousContent);
  } else {
    await removePathIfExists(runtimePromptPath);
  }
}

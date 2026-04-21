import { resolve, join } from "path";
import { log } from "../utils/log.js";
import { fileExists, readText, writeText } from "../utils/files.js";
import { exec, commandExists } from "../utils/exec.js";
import { readConfig } from "../utils/config.js";
import { normalizeTool, TOOL_NAMES } from "../types.js";
import { validatePrdFile } from "../utils/prd.js";
import type { FixOptions, Tool } from "../types.js";

const DOCTOR_PROMPT_FILE = "DOCTOR.md";
const ERRORS_HEADING = "## Current prd.json Validation Errors";

interface ToolConfig {
  binary: string;
  runtimePromptFile: string;
  args: (dangerouslySkipPermissions: boolean, bypass: boolean) => string[];
}

const TOOL_CONFIG: Record<Tool, ToolConfig> = {
  claude: {
    binary: "claude",
    runtimePromptFile: "CLAUDE.md",
    args: () => ["--print"],
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
 * `ralph fix` — Single-pass PRD doctor flow.
 *
 * Detects current prd.json validation errors, injects them into the DOCTOR.md
 * prompt, invokes the selected AI tool once, then revalidates. Exits cleanly
 * without invoking the AI tool if prd.json is already valid.
 */
export async function fixCommand(options: FixOptions): Promise<void> {
  const tool = normalizeTool(options.tool);
  const dir = resolve(options.dir);
  const config = await readConfig();
  const bypass = options.bypass ?? config.bypass;
  const copilotAutoApprove = options.autoApprove ?? config.copilotAutoApprove;

  if (!tool) {
    log.error(`Invalid tool '${options.tool}'. Must be one of: ${TOOL_NAMES}.`);
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

  // ── Validate DOCTOR.md exists ──────────────────────────────────────────
  const doctorPath = join(dir, DOCTOR_PROMPT_FILE);
  if (!(await fileExists(doctorPath))) {
    log.error(`${DOCTOR_PROMPT_FILE} not found in ${dir}`);
    log.info('Run "ralph init" first to set up the project.');
    process.exit(1);
  }

  // ── Validate prd.json exists ───────────────────────────────────────────
  const prdPath = join(dir, "prd.json");
  if (!(await fileExists(prdPath))) {
    log.error(`prd.json not found in ${dir}`);
    process.exit(1);
  }

  log.header("Ralph Fix — PRD Doctor");

  // ── Run initial validation ─────────────────────────────────────────────
  const initial = await validatePrdFile(prdPath);

  if (initial.valid) {
    log.success("prd.json is already valid. No doctor pass needed.");
    return;
  }

  log.warn(`prd.json has ${initial.errors.length} validation error(s):`);
  for (const err of initial.errors) {
    log.step(err);
  }

  // ── Build doctor prompt with injected errors ───────────────────────────
  const doctorPrompt = await readText(doctorPath);
  const errorBlock = buildErrorBlock(initial.errors);
  const fullPrompt = `${doctorPrompt}\n\n${errorBlock}`;

  // ── Write prompt to tool runtime file and invoke tool ──────────────────
  const runtimePromptPath = join(dir, toolConfig.runtimePromptFile);
  await writeText(runtimePromptPath, fullPrompt);
  log.info(`Loaded ${DOCTOR_PROMPT_FILE} (with errors injected) into ${toolConfig.runtimePromptFile}`);
  log.info(`Invoking ${tool} for a single doctor pass…`);

  await exec(
    toolConfig.binary,
    toolConfig.args(false, bypass),
    {
      cwd: dir,
      stdin: tool === "copilot" ? undefined : fullPrompt,
      autoApprove:
        tool === "copilot"
          ? {
              enabled: copilotAutoApprove,
              label: "Copilot",
            }
          : undefined,
    }
  );

  // ── Revalidate after doctor pass ──────────────────────────────────────
  const recheck = await validatePrdFile(prdPath);

  if (recheck.valid) {
    log.success("prd.json is now valid. Doctor pass succeeded.");
    return;
  }

  log.error(`prd.json still has ${recheck.errors.length} error(s) after the doctor pass:`);
  for (const err of recheck.errors) {
    log.step(err);
  }
  process.exit(1);
}

function buildErrorBlock(errors: string[]): string {
  const lines = errors.map((e) => `- ${e}`).join("\n");
  return `${ERRORS_HEADING}\n\nThe following errors were detected in prd.json. Fix only these issues:\n\n${lines}`;
}

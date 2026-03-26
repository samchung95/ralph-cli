import { resolve, join } from "path";
import { log } from "../utils/log.js";
import { fileExists, readText, writeText, copyFileSafe } from "../utils/files.js";
import { exec, commandExists } from "../utils/exec.js";
import type { RunOptions, Tool } from "../types.js";

const COMPLETION_SIGNAL = "<promise>COMPLETE</promise>";

/**
 * `ralph run [iterations]` — TypeScript port of ralph.sh.
 *
 * Spawns a fresh Claude Code (or Amp) instance per iteration, feeding it the
 * CLAUDE.md prompt. Loops until all PRD stories pass or max iterations reached.
 */
export async function runCommand(
  iterations: string,
  options: RunOptions
): Promise<void> {
  const maxIterations = parseInt(iterations, 10);
  const tool: Tool = options.tool;
  const dir = resolve(options.dir);
  const dangerouslySkipPermissions = options.dangerouslySkipPermissions;

  // ── Validate tool is installed ──────────────────────────────────────────
  const toolBinary = tool === "claude" ? "claude" : "amp";
  if (!(await commandExists(toolBinary))) {
    log.error(
      `${toolBinary} is not installed or not on PATH. Install it first.`
    );
    process.exit(1);
  }

  // ── Validate required files exist ──────────────────────────────────────
  const promptFile = tool === "claude" ? "CLAUDE.md" : "prompt.md";
  const promptPath = join(dir, promptFile);
  const prdPath = join(dir, "prd.json");
  const progressPath = join(dir, "progress.txt");
  const lastBranchPath = join(dir, ".last-branch");

  if (!(await fileExists(promptPath))) {
    log.error(`${promptFile} not found in ${dir}`);
    log.info('Run "ralph init" first to set up the project.');
    process.exit(1);
  }

  if (!(await fileExists(prdPath))) {
    log.error(`prd.json not found in ${dir}`);
    log.info("Create a prd.json with your user stories first.");
    process.exit(1);
  }

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
  log.header(`Starting Ralph — Tool: ${tool} — Max iterations: ${maxIterations}`);

  for (let i = 1; i <= maxIterations; i++) {
    log.iteration(i, maxIterations, tool);

    const result = await runIteration(tool, dir, dangerouslySkipPermissions);

    // Check for completion signal
    if (result.includes(COMPLETION_SIGNAL)) {
      console.log("");
      log.success("Ralph completed all tasks!");
      log.info(`Completed at iteration ${i} of ${maxIterations}`);
      process.exit(0);
    }

    log.info(`Iteration ${i} complete. Continuing...`);

    // Small pause between iterations
    if (i < maxIterations) {
      await sleep(2000);
    }
  }

  console.log("");
  log.warn(
    `Ralph reached max iterations (${maxIterations}) without completing all tasks.`
  );
  log.info(`Check ${progressPath} for status.`);
  process.exit(1);
}

/**
 * Run a single iteration — spawn the AI tool with the prompt piped to stdin.
 * Streams output to the terminal in real-time and returns the full output.
 */
async function runIteration(
  tool: Tool,
  dir: string,
  dangerouslySkipPermissions: boolean
): Promise<string> {
  if (tool === "claude") {
    const promptPath = join(dir, "CLAUDE.md");
    const prompt = await readText(promptPath);

    const args: string[] = [];
    if (dangerouslySkipPermissions) {
      args.push("--dangerously-skip-permissions");
    }
    args.push("--print");

    const result = await exec("claude", args, {
      cwd: dir,
      stdin: prompt,
    });

    return result.stdout + result.stderr;
  } else {
    const promptPath = join(dir, "prompt.md");
    const prompt = await readText(promptPath);

    const result = await exec("amp", ["--dangerously-allow-all"], {
      cwd: dir,
      stdin: prompt,
    });

    return result.stdout + result.stderr;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

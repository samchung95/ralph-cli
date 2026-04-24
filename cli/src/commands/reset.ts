import { join, resolve } from "path";
import { log } from "../utils/log.js";
import {
  copyFileSafe,
  fileExists,
  getPackageDir,
  readText,
  removePathIfExists,
  writeText,
} from "../utils/files.js";
import { archiveLabelFromBranch, archiveRunFiles } from "../utils/archive.js";
import { validatePrdFile } from "../utils/prd.js";
import { initialProgressText } from "../utils/progress.js";
import type { ResetOptions } from "../types.js";

/**
 * `ralph reset` — Archive the current run and restore a fresh prd.json.
 */
export async function resetCommand(options: ResetOptions): Promise<void> {
  await resetRalphState(options.dir, { showNextSteps: true });
}

export async function resetRalphState(
  targetDir: string,
  options: { showNextSteps?: boolean } = {}
): Promise<void> {
  const dir = resolve(targetDir);
  const prdPath = join(dir, "prd.json");
  const prdExamplePath = join(dir, "prd.json.example");
  const progressPath = join(dir, "progress.txt");
  const lastBranchPath = join(dir, ".last-branch");
  const fallbackExamplePath = join(getPackageDir(), "templates", "prd.json.example");

  log.header("Ralph Reset");
  log.info(`Target directory: ${dir}`);

  const examplePath = (await fileExists(prdExamplePath))
    ? prdExamplePath
    : fallbackExamplePath;

  if (!(await fileExists(examplePath))) {
    log.error("Could not find prd.json.example in the target directory or CLI templates.");
    process.exit(1);
  }

  const resolvedExistingFiles: string[] = [];
  for (const filePath of [prdPath, progressPath]) {
    if (await fileExists(filePath)) {
      resolvedExistingFiles.push(filePath);
    }
  }

  if (resolvedExistingFiles.length > 0) {
    const archiveLabel = archiveLabelFromBranch(await readBranchName(prdPath));
    const archiveDir = await archiveRunFiles(dir, archiveLabel, resolvedExistingFiles);
    log.success(`Archived current Ralph state to ${archiveDir}`);
  } else {
    log.info("No existing prd.json or progress.txt found, so nothing needed archiving.");
  }

  await copyFileSafe(examplePath, prdPath);
  await writeText(progressPath, initialProgressText(await readProgressSeed(prdPath)));
  await removePathIfExists(lastBranchPath);

  const validation = await validatePrdFile(prdPath);
  if (!validation.valid) {
    log.error("Fresh prd.json.example failed validation after reset.");
    for (const error of validation.errors) {
      log.step(error);
    }
    process.exit(1);
  }

  log.success("Restored prd.json from prd.json.example");
  log.success("Reset progress.txt");
  log.success("Cleared .last-branch");

  if (!options.showNextSteps) {
    return;
  }

  console.log("");
  log.info("Next steps:");
  log.step("1. Update prd.json with the new feature's final success criteria and planner context");
  log.step("2. Run `ralph validate` if you want a manual PRD shape check");
  log.step("3. Run `ralph run [cycles]` when the fresh PRD is ready");
}

async function readBranchName(prdPath: string): Promise<string | undefined> {
  if (!(await fileExists(prdPath))) {
    return undefined;
  }

  try {
    const prd = JSON.parse(await readText(prdPath)) as { branchName?: string };
    return prd.branchName;
  } catch {
    return undefined;
  }
}

async function readProgressSeed(prdPath: string): Promise<{
  goal?: string;
  branch?: string;
  cycle?: number;
  currentObjective?: string;
}> {
  try {
    const prd = JSON.parse(await readText(prdPath)) as {
      branchName?: string;
      finalSuccessCriteria?: { description?: string };
      planning?: { cycle?: number; currentObjective?: string };
    };
    return {
      goal: prd.finalSuccessCriteria?.description,
      branch: prd.branchName,
      cycle: prd.planning?.cycle,
      currentObjective: prd.planning?.currentObjective,
    };
  } catch {
    return {};
  }
}

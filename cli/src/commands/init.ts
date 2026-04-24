import { join, resolve } from "path";
import { fileExists, writeText } from "../utils/files.js";
import { log } from "../utils/log.js";
import { initialProgressText } from "../utils/progress.js";
import type { InitOptions } from "../types.js";

/**
 * `ralph init` — Create progress.txt in the target project directory.
 */
export async function initCommand(options: InitOptions): Promise<void> {
  const dir = resolve(options.dir);

  log.header("Ralph Init");
  log.info(`Target directory: ${dir}`);

  const progressPath = join(dir, "progress.txt");
  if ((await fileExists(progressPath)) && !options.force) {
    log.warn("progress.txt already exists. Use --force to overwrite.");
  } else {
    await writeText(progressPath, initialProgressText());
    log.success("Created progress.txt");
  }

  console.log("");
  log.info("Next steps:");
  log.step("1. Create prd.json with finalSuccessCriteria and planner context (the /ralph skill can scaffold it)");
  log.step("2. Run `ralph run [cycles]` to start the planner-routed agent loop");
}

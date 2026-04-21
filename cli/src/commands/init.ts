import { join, resolve } from "path";
import { copyFileSafe, fileExists, getPackageDir, writeText } from "../utils/files.js";
import { log } from "../utils/log.js";
import type { InitOptions } from "../types.js";

/**
 * `ralph init` — Copy phase prompts and prd.json.example into the target project directory.
 */
export async function initCommand(options: InitOptions): Promise<void> {
  const dir = resolve(options.dir);
  const templateDir = join(getPackageDir(), "templates");

  log.header("Ralph Init");
  log.info(`Target directory: ${dir}`);

  const promptFiles = ["DEVELOPER.md", "PLANNER.md", "DOCTOR.md"];
  for (const promptFile of promptFiles) {
    const src = join(templateDir, promptFile);
    const dest = join(dir, promptFile);

    if ((await fileExists(dest)) && !options.force) {
      log.warn(`${promptFile} already exists. Use --force to overwrite.`);
    } else {
      await copyFileSafe(src, dest);
      log.success(`Copied ${promptFile}`);
    }
  }

  // Copy prd.json.example
  const prdExampleSrc = join(templateDir, "prd.json.example");
  const prdExampleDest = join(dir, "prd.json.example");

  if ((await fileExists(prdExampleDest)) && !options.force) {
    log.warn("prd.json.example already exists. Use --force to overwrite.");
  } else {
    await copyFileSafe(prdExampleSrc, prdExampleDest);
    log.success("Copied prd.json.example");
  }

  const progressPath = join(dir, "progress.txt");
  if ((await fileExists(progressPath)) && !options.force) {
    log.warn("progress.txt already exists. Use --force to overwrite.");
  } else {
    await writeText(
      progressPath,
      `# Ralph Progress Log\nStarted: ${new Date()}\n---\n`
    );
    log.success("Created progress.txt");
  }

  console.log("");
  log.info("Next steps:");
  log.step("1. Create prd.json from the example with finalSuccessCriteria");
  log.step("2. Run `ralph run [cycles]` to start the develop/plan loop");
}

import { join, resolve } from "path";
import { copyFileSafe, fileExists, getPackageDir } from "../utils/files.js";
import { log } from "../utils/log.js";
import type { InitOptions } from "../types.js";

/**
 * `ralph init` — Copy CLAUDE.md and prd.json.example into the target project directory.
 */
export async function initCommand(options: InitOptions): Promise<void> {
  const dir = resolve(options.dir);
  const templateDir = join(getPackageDir(), "templates");

  log.header("Ralph Init");
  log.info(`Target directory: ${dir}`);

  // Copy CLAUDE.md
  const claudeSrc = join(templateDir, "CLAUDE.md");
  const claudeDest = join(dir, "CLAUDE.md");

  if ((await fileExists(claudeDest)) && !options.force) {
    log.warn("CLAUDE.md already exists. Use --force to overwrite.");
  } else {
    await copyFileSafe(claudeSrc, claudeDest);
    log.success("Copied CLAUDE.md");
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

  console.log("");
  log.info("Next steps:");
  log.step("1. Create a prd.json from the example (or use `ralph install` to get the PRD skill)");
  log.step("2. Run `ralph run [iterations]` to start the agent loop");
}

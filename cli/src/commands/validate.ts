import { join, resolve } from "path";
import { log } from "../utils/log.js";
import { validatePrdFile } from "../utils/prd.js";
import type { ValidateOptions } from "../types.js";

/**
 * `ralph validate` — Validate the structure of prd.json.
 */
export async function validateCommand(options: ValidateOptions): Promise<void> {
  const dir = resolve(options.dir);
  const prdPath = join(dir, "prd.json");
  const result = await validatePrdFile(prdPath);

  if (result.valid) {
    if (!options.silent) {
      log.success(`prd.json is valid: ${prdPath}`);
    }
    return;
  }

  log.error(`prd.json failed validation: ${prdPath}`);
  for (const error of result.errors) {
    log.step(error);
  }
  process.exit(1);
}

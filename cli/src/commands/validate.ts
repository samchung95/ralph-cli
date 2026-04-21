import { join, resolve } from "path";
import chalk from "chalk";
import { log } from "../utils/log.js";
import { validatePrdFile } from "../utils/prd.js";
import { readText } from "../utils/files.js";
import type { ValidateOptions } from "../types.js";

const PRIORITY_TAG: Record<string, string> = {
  high: chalk.red.bold("[HIGH]"),
  medium: chalk.yellow("[MEDIUM]"),
  low: chalk.green("[LOW]"),
};

const VALID_FILTER_PRIORITIES = ["high", "medium", "low"];

/**
 * `ralph validate` — Validate the structure of prd.json.
 */
export async function validateCommand(options: ValidateOptions): Promise<void> {
  const dir = resolve(options.dir);
  const prdPath = join(dir, "prd.json");

  if (options.priority && !VALID_FILTER_PRIORITIES.includes(options.priority)) {
    log.error(
      `Invalid --priority '${options.priority}'. Must be one of: ${VALID_FILTER_PRIORITIES.join(", ")}.`
    );
    process.exit(1);
  }

  const result = await validatePrdFile(prdPath);

  if (result.valid) {
    if (!options.silent) {
      log.success(`prd.json is valid: ${prdPath}`);
      await printStoryList(prdPath, options.priority);
    }
    return;
  }

  log.error(`prd.json failed validation: ${prdPath}`);
  for (const error of result.errors) {
    log.step(error);
  }
  process.exit(1);
}

async function printStoryList(prdPath: string, priorityFilter?: string): Promise<void> {
  try {
    const content = await readText(prdPath);
    const prd = JSON.parse(content) as {
      userStories?: Array<{ id: string; title: string; storyPriority?: string }>;
    };
    const allStories = prd.userStories ?? [];
    const stories = priorityFilter
      ? allStories.filter((s) => s.storyPriority === priorityFilter)
      : allStories;

    if (priorityFilter && stories.length === 0) {
      console.log("");
      console.log(
        chalk.dim(`No stories with priority '${priorityFilter}'.`)
      );
      return;
    }

    if (stories.length === 0) return;

    console.log("");
    console.log(
      chalk.bold(priorityFilter ? `User Stories [${priorityFilter.toUpperCase()}]:` : "User Stories:")
    );
    for (const story of stories) {
      const tag =
        story.storyPriority != null
          ? (PRIORITY_TAG[story.storyPriority] ?? `[${story.storyPriority.toUpperCase()}]`)
          : "[?]";
      console.log(`  ${tag} ${chalk.bold(story.id)} — ${story.title}`);
    }
  } catch {
    // prd was already validated; parse errors here are unexpected — skip silently
  }
}

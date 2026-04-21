import { join, resolve } from "path";
import { log } from "../utils/log.js";
import { readText, writeText } from "../utils/files.js";
import { validatePrdFile } from "../utils/prd.js";

const VALID_PRIORITIES = ["high", "medium", "low"] as const;
type Priority = (typeof VALID_PRIORITIES)[number];

/**
 * `ralph priority <storyId> <high|medium|low>` — Update the storyPriority field
 * for the given story in prd.json.
 */
export async function priorityCommand(
  storyId: string,
  priority: string,
  options: { dir: string }
): Promise<void> {
  const dir = resolve(options.dir);
  const prdPath = join(dir, "prd.json");

  if (!(VALID_PRIORITIES as readonly string[]).includes(priority)) {
    log.error(
      `Invalid priority '${priority}'. Must be one of: ${VALID_PRIORITIES.join(", ")}.`
    );
    process.exit(1);
  }

  let prd: Record<string, unknown>;
  try {
    const content = await readText(prdPath);
    prd = JSON.parse(content) as Record<string, unknown>;
  } catch {
    log.error(`Could not read or parse prd.json at ${prdPath}`);
    process.exit(1);
  }

  const userStories = prd["userStories"];
  if (!Array.isArray(userStories)) {
    log.error("prd.json has no userStories array.");
    process.exit(1);
  }

  const story = userStories.find(
    (s): s is Record<string, unknown> =>
      typeof s === "object" && s !== null && (s as Record<string, unknown>)["id"] === storyId
  );

  if (!story) {
    log.error(`Story '${storyId}' not found in prd.json.`);
    process.exit(1);
  }

  const previous = story["storyPriority"] as string | undefined;
  story["storyPriority"] = priority as Priority;

  const updated = JSON.stringify(prd, null, 2);
  await writeText(prdPath, updated);

  const validation = await validatePrdFile(prdPath);
  if (!validation.valid) {
    log.error("prd.json failed validation after priority update. Rolling back.");
    await writeText(prdPath, JSON.stringify({ ...prd, userStories: userStories.map((s) => s === story ? { ...story, storyPriority: previous } : s) }, null, 2));
    for (const error of validation.errors) {
      log.step(error);
    }
    process.exit(1);
  }

  log.success(
    `Updated '${storyId}' storyPriority: ${previous ?? "?"} → ${priority}`
  );
}

import { readText } from "./files.js";

export interface PrdValidationResult {
  valid: boolean;
  errors: string[];
}

type JsonObject = Record<string, unknown>;

export async function validatePrdFile(prdPath: string): Promise<PrdValidationResult> {
  try {
    const content = await readText(prdPath);
    const parsed = JSON.parse(content) as unknown;
    return validatePrdData(parsed);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return {
        valid: false,
        errors: [`prd.json is not valid JSON: ${error.message}`],
      };
    }

    return {
      valid: false,
      errors: [`Could not read prd.json: ${error instanceof Error ? error.message : String(error)}`],
    };
  }
}

export function validatePrdData(data: unknown): PrdValidationResult {
  const errors: string[] = [];

  if (!isObject(data)) {
    return { valid: false, errors: ["Root must be a JSON object."] };
  }

  requireString(data, "project", "project", errors);
  requireString(data, "branchName", "branchName", errors);
  requireString(data, "description", "description", errors);

  const finalSuccessCriteria = requireObject(
    data,
    "finalSuccessCriteria",
    "finalSuccessCriteria",
    errors
  );
  if (finalSuccessCriteria) {
    requireString(
      finalSuccessCriteria,
      "description",
      "finalSuccessCriteria.description",
      errors
    );
    requireStringArray(
      finalSuccessCriteria,
      "acceptanceCriteria",
      "finalSuccessCriteria.acceptanceCriteria",
      errors
    );
    requireBoolean(finalSuccessCriteria, "passes", "finalSuccessCriteria.passes", errors);
    requireString(finalSuccessCriteria, "notes", "finalSuccessCriteria.notes", errors);
  }

  const planning = requireObject(data, "planning", "planning", errors);
  if (planning) {
    requirePositiveInteger(planning, "cycle", "planning.cycle", errors);
    requireString(planning, "currentObjective", "planning.currentObjective", errors);
  }

  const prdChain = requireObjectArray(data, "prdChain", "prdChain", errors);
  if (prdChain) {
    if (prdChain.length === 0) {
      errors.push("prdChain must contain at least one cycle entry.");
    }

    prdChain.forEach((entry, index) => {
      const path = `prdChain[${index}]`;
      requirePositiveInteger(entry, "cycle", `${path}.cycle`, errors);
      requireString(entry, "objective", `${path}.objective`, errors);
      requireString(entry, "status", `${path}.status`, errors);
      requireStringArray(entry, "storyIds", `${path}.storyIds`, errors);
      requireString(entry, "notes", `${path}.notes`, errors);
    });
  }

  const userStories = requireObjectArray(data, "userStories", "userStories", errors);
  const storyIds = new Set<string>();
  if (userStories) {
    userStories.forEach((story, index) => {
      const path = `userStories[${index}]`;
      const id = requireString(story, "id", `${path}.id`, errors);
      if (id) {
        if (storyIds.has(id)) {
          errors.push(`Duplicate userStories id '${id}'.`);
        }
        storyIds.add(id);
      }

      requireString(story, "title", `${path}.title`, errors);
      requireString(story, "description", `${path}.description`, errors);
      requireStringArray(story, "acceptanceCriteria", `${path}.acceptanceCriteria`, errors);
      requirePositiveNumber(story, "priority", `${path}.priority`, errors);
      requireBoolean(story, "passes", `${path}.passes`, errors);
      requireString(story, "notes", `${path}.notes`, errors);
    });
  }

  if (planning && prdChain) {
    const activeEntries = prdChain.filter((entry) => entry.status === "active");
    if (activeEntries.length > 1) {
      errors.push("prdChain must not contain more than one active entry.");
    }

    if (activeEntries.length === 1 && activeEntries[0].cycle !== planning.cycle) {
      errors.push(
        `planning.cycle (${planning.cycle}) must match the active prdChain cycle (${activeEntries[0].cycle}).`
      );
    }

    if (activeEntries.length === 1 && userStories) {
      const activeStoryIds = requireStringArray(
        activeEntries[0],
        "storyIds",
        "prdChain active entry.storyIds",
        errors
      ) ?? [];
      for (const storyId of activeStoryIds) {
        if (!storyIds.has(storyId)) {
          errors.push(
            `Active prdChain storyId '${storyId}' is missing from userStories.`
          );
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireObject(
  parent: JsonObject,
  key: string,
  path: string,
  errors: string[]
): JsonObject | null {
  const value = parent[key];
  if (!isObject(value)) {
    errors.push(`${path} must be an object.`);
    return null;
  }
  return value;
}

function requireObjectArray(
  parent: JsonObject,
  key: string,
  path: string,
  errors: string[]
): JsonObject[] | null {
  const value = parent[key];
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array.`);
    return null;
  }

  const objects: JsonObject[] = [];
  value.forEach((item, index) => {
    if (!isObject(item)) {
      errors.push(`${path}[${index}] must be an object.`);
      return;
    }
    objects.push(item);
  });

  return objects;
}

function requireString(
  parent: JsonObject,
  key: string,
  path: string,
  errors: string[]
): string | null {
  const value = parent[key];
  if (typeof value !== "string") {
    errors.push(`${path} must be a string.`);
    return null;
  }
  return value;
}

function requireStringArray(
  parent: JsonObject,
  key: string,
  path: string,
  errors: string[]
): string[] | null {
  const value = parent[key];
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array of strings.`);
    return null;
  }

  const strings: string[] = [];
  value.forEach((item, index) => {
    if (typeof item !== "string") {
      errors.push(`${path}[${index}] must be a string.`);
      return;
    }
    strings.push(item);
  });

  return strings;
}

function requireBoolean(
  parent: JsonObject,
  key: string,
  path: string,
  errors: string[]
): boolean | null {
  const value = parent[key];
  if (typeof value !== "boolean") {
    errors.push(`${path} must be a boolean.`);
    return null;
  }
  return value;
}

function requirePositiveInteger(
  parent: JsonObject,
  key: string,
  path: string,
  errors: string[]
): number | null {
  const value = parent[key];
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    errors.push(`${path} must be a positive integer.`);
    return null;
  }
  return value;
}

function requirePositiveNumber(
  parent: JsonObject,
  key: string,
  path: string,
  errors: string[]
): number | null {
  const value = parent[key];
  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
    errors.push(`${path} must be a positive number.`);
    return null;
  }
  return value;
}

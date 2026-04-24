import { createHash } from "crypto";
import { join } from "path";
import { fileExists, readText, removePathIfExists } from "./files.js";

export const PHASE_PROMPT_FILES = [
  "DEVELOPER.md",
  "UXUI.md",
  "DOCUMENTATION.md",
  "WEB_BROWSER_SAFE.md",
  "WEB_BROWSER_BYPASS.md",
  "PLANNER.md",
  "DOCTOR.md",
  "PROGRESS_INSTRUCT.md",
] as const;

export const RUNTIME_PROMPT_FILES = [
  "prompt.md",
  "CLAUDE.md",
  "AGENTS.md",
] as const;

export const ROOT_RALPH_ARTIFACTS = [
  ...PHASE_PROMPT_FILES,
  "prd.json.example",
  ...RUNTIME_PROMPT_FILES,
] as const;

type PhasePromptFile = (typeof PHASE_PROMPT_FILES)[number];
export type RalphArtifactFile = (typeof ROOT_RALPH_ARTIFACTS)[number];

interface CleanupStaleRalphArtifactsOptions {
  dir: string;
  templateDir: string;
  doctorRuntimePrompt?: string;
}

export interface CleanupStaleRalphArtifactsResult {
  removed: RalphArtifactFile[];
  preserved: RalphArtifactFile[];
}

const HISTORICAL_PROMPT_HASHES: Record<PhasePromptFile, readonly string[]> = {
  "DEVELOPER.md": [
    "fa4c6d968bb54d6f1e1f909282bd74655def589ec74073ea0408b0c146521ea4",
  ],
  "UXUI.md": [],
  "DOCUMENTATION.md": [],
  "WEB_BROWSER_SAFE.md": [],
  "WEB_BROWSER_BYPASS.md": [],
  "PLANNER.md": [],
  "DOCTOR.md": [],
  "PROGRESS_INSTRUCT.md": [],
};

const HISTORICAL_PRD_EXAMPLE_HASHES = [
  "f684305a94b0b591d88976779b64361c4ddf6427665451e1f8bfb9d6f7bcc1c8",
  "f2f1507223dbf20cceb9bc267fef82268b2c2ecdbec5f4db48eb9cbdafcca377",
] as const;

export async function cleanupStaleRalphArtifacts(
  options: CleanupStaleRalphArtifactsOptions
): Promise<CleanupStaleRalphArtifactsResult> {
  const knownHashes = await buildKnownArtifactHashes(options);
  const removed: RalphArtifactFile[] = [];
  const preserved: RalphArtifactFile[] = [];

  for (const artifact of ROOT_RALPH_ARTIFACTS) {
    const artifactPath = join(options.dir, artifact);
    if (!(await fileExists(artifactPath))) {
      continue;
    }

    const content = await readText(artifactPath);
    const contentHash = hashNormalizedContent(content);
    if (knownHashes[artifact].has(contentHash)) {
      await removePathIfExists(artifactPath);
      removed.push(artifact);
      continue;
    }

    preserved.push(artifact);
  }

  return { removed, preserved };
}

export function hashNormalizedContent(content: string): string {
  return createHash("sha256")
    .update(normalizeGeneratedArtifactContent(content), "utf8")
    .digest("hex");
}

function normalizeGeneratedArtifactContent(content: string): string {
  return content.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
}

async function buildKnownArtifactHashes(
  options: CleanupStaleRalphArtifactsOptions
): Promise<Record<RalphArtifactFile, Set<string>>> {
  const developerPrompt = await readText(join(options.templateDir, "DEVELOPER.md"));
  const uxuiPrompt = await readText(join(options.templateDir, "UXUI.md"));
  const documentationPrompt = await readText(join(options.templateDir, "DOCUMENTATION.md"));
  const webBrowserSafePrompt = await readText(join(options.templateDir, "WEB_BROWSER_SAFE.md"));
  const webBrowserBypassPrompt = await readText(join(options.templateDir, "WEB_BROWSER_BYPASS.md"));
  const plannerPrompt = await readText(join(options.templateDir, "PLANNER.md"));
  const doctorPrompt = await readText(join(options.templateDir, "DOCTOR.md"));
  const progressInstructions = await readText(join(options.templateDir, "PROGRESS_INSTRUCT.md"));
  const prdExample = await readText(join(options.templateDir, "prd.json.example"));

  const developerHashes = new Set<string>([
    hashNormalizedContent(developerPrompt),
    ...HISTORICAL_PROMPT_HASHES["DEVELOPER.md"],
  ]);
  const plannerHashes = new Set<string>([
    hashNormalizedContent(plannerPrompt),
    ...HISTORICAL_PROMPT_HASHES["PLANNER.md"],
  ]);
  const uxuiHashes = new Set<string>([
    hashNormalizedContent(uxuiPrompt),
    ...HISTORICAL_PROMPT_HASHES["UXUI.md"],
  ]);
  const documentationHashes = new Set<string>([
    hashNormalizedContent(documentationPrompt),
    ...HISTORICAL_PROMPT_HASHES["DOCUMENTATION.md"],
  ]);
  const webBrowserSafeHashes = new Set<string>([
    hashNormalizedContent(webBrowserSafePrompt),
    ...HISTORICAL_PROMPT_HASHES["WEB_BROWSER_SAFE.md"],
  ]);
  const webBrowserBypassHashes = new Set<string>([
    hashNormalizedContent(webBrowserBypassPrompt),
    ...HISTORICAL_PROMPT_HASHES["WEB_BROWSER_BYPASS.md"],
  ]);
  const doctorHashes = new Set<string>([
    hashNormalizedContent(doctorPrompt),
    ...HISTORICAL_PROMPT_HASHES["DOCTOR.md"],
  ]);
  const progressInstructionHashes = new Set<string>([
    hashNormalizedContent(progressInstructions),
    ...HISTORICAL_PROMPT_HASHES["PROGRESS_INSTRUCT.md"],
  ]);
  const prdExampleHashes = new Set<string>([
    hashNormalizedContent(prdExample),
    ...HISTORICAL_PRD_EXAMPLE_HASHES,
  ]);

  const runtimeHashes = new Set<string>([
    ...developerHashes,
    ...uxuiHashes,
    ...documentationHashes,
    ...webBrowserSafeHashes,
    ...webBrowserBypassHashes,
    ...plannerHashes,
    ...doctorHashes,
    ...progressInstructionHashes,
  ]);

  for (const rolePrompt of [
    developerPrompt,
    uxuiPrompt,
    documentationPrompt,
    webBrowserSafePrompt,
    webBrowserBypassPrompt,
    plannerPrompt,
  ]) {
    runtimeHashes.add(
      hashNormalizedContent(composeGeneratedRuntimePrompt(rolePrompt, progressInstructions))
    );
  }

  if (options.doctorRuntimePrompt) {
    runtimeHashes.add(hashNormalizedContent(options.doctorRuntimePrompt));
  }

  return {
    "DEVELOPER.md": developerHashes,
    "UXUI.md": uxuiHashes,
    "DOCUMENTATION.md": documentationHashes,
    "WEB_BROWSER_SAFE.md": webBrowserSafeHashes,
    "WEB_BROWSER_BYPASS.md": webBrowserBypassHashes,
    "PLANNER.md": plannerHashes,
    "DOCTOR.md": doctorHashes,
    "PROGRESS_INSTRUCT.md": progressInstructionHashes,
    "prd.json.example": prdExampleHashes,
    "prompt.md": new Set(runtimeHashes),
    "CLAUDE.md": new Set(runtimeHashes),
    "AGENTS.md": new Set(runtimeHashes),
  };
}

function composeGeneratedRuntimePrompt(
  rolePrompt: string,
  progressInstructions: string
): string {
  return `${rolePrompt.trimEnd()}\n\n---\n\n${progressInstructions.trimEnd()}\n`;
}

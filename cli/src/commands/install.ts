import { join } from "path";
import { homedir } from "os";
import { copyFileSafe, fileExists, getPackageDir } from "../utils/files.js";
import { log } from "../utils/log.js";
import { mkdir, readdir } from "fs/promises";

/**
 * `ralph install` — Install Ralph skills into Claude Code's ~/.claude/skills/ directory.
 */
export async function installCommand(): Promise<void> {
  log.header("Ralph Install Skills");

  const templateDir = join(getPackageDir(), "templates", "skills");
  const claudeSkillsDir = join(homedir(), ".claude", "skills");

  // Ensure ~/.claude/skills/ exists
  await mkdir(claudeSkillsDir, { recursive: true });

  // Read available skills from the templates
  const skills = await readdir(templateDir, { withFileTypes: true });

  for (const entry of skills) {
    if (!entry.isDirectory()) continue;

    const skillName = entry.name;
    const srcSkillDir = join(templateDir, skillName);
    const destSkillDir = join(claudeSkillsDir, skillName);

    // Copy SKILL.md from each skill directory
    const srcSkillFile = join(srcSkillDir, "SKILL.md");
    const destSkillFile = join(destSkillDir, "SKILL.md");

    if (await fileExists(srcSkillFile)) {
      await copyFileSafe(srcSkillFile, destSkillFile);
      log.success(`Installed skill: ${skillName} → ${destSkillDir}`);
    }
  }

  console.log("");
  log.info("Skills installed to ~/.claude/skills/");
  log.info("Available skills:");
  log.step("/prd — Generate Product Requirements Documents");
  log.step("/ralph — Convert PRDs to prd.json format");
}

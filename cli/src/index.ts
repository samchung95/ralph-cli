#!/usr/bin/env node

import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { installCommand } from "./commands/install.js";
import { runCommand } from "./commands/run.js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(join(__dirname, "..", "package.json"), "utf-8")
);

const program = new Command();

program
  .name("ralph")
  .description(
    "Ralph - Autonomous AI agent loop that runs AI coding tools until all PRD items are complete"
  )
  .version(pkg.version);

program
  .command("init")
  .description(
    "Initialize Ralph in a project (copies CLAUDE.md and prd.json.example into the project root)"
  )
  .option("-d, --dir <path>", "Target project directory", process.cwd())
  .option("--force", "Overwrite existing files", false)
  .action(initCommand);

program
  .command("install")
  .description("Install Ralph skills into Claude Code (~/.claude/skills/)")
  .action(installCommand);

program
  .command("run")
  .description("Run the Ralph autonomous agent loop")
  .argument("[iterations]", "Maximum number of iterations", "10")
  .option(
    "--tool <tool>",
    "AI tool to use (claude or amp)",
    "claude"
  )
  .option(
    "--dangerously-skip-permissions",
    "Pass --dangerously-skip-permissions to Claude Code",
    false
  )
  .option("-d, --dir <path>", "Project directory containing CLAUDE.md and prd.json", process.cwd())
  .action(runCommand);

program.parse();

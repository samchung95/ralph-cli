#!/usr/bin/env node

import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { installCommand } from "./commands/install.js";
import { runCommand } from "./commands/run.js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { TOOL_NAMES } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(join(__dirname, "..", "package.json"), "utf-8")
);

const program = new Command();

program
  .name("ralph")
  .description(
    "Ralph - Autonomous AI agent loop that alternates developer and planner phases until final success criteria pass"
  )
  .version(pkg.version);

program
  .command("init")
  .description(
    "Initialize Ralph in a project (copies phase prompts and prd.json.example into the project root)"
  )
  .option("-d, --dir <path>", "Target project directory", process.cwd())
  .option("--force", "Overwrite existing files", false)
  .action(initCommand);

program
  .command("install")
  .description("Install the Ralph setup skill into an AI tool's skills directory")
  .option(
    "--tool <tool>",
    `AI tool to install skills for (${TOOL_NAMES})`,
    "claude"
  )
  .action(installCommand);

program
  .command("run")
  .description("Run the Ralph develop/plan agent loop")
  .argument("[cycles]", "Maximum number of develop/plan cycles", "10")
  .option(
    "--tool <tool>",
    `AI tool to use (${TOOL_NAMES})`,
    "claude"
  )
  .option(
    "--dangerously-skip-permissions",
    "Pass --dangerously-skip-permissions to Claude Code",
    false
  )
  .option("-d, --dir <path>", "Project directory containing DEVELOPER.md, PLANNER.md, and prd.json", process.cwd())
  .action(runCommand);

program.parse();

#!/usr/bin/env node

import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { installCommand } from "./commands/install.js";
import { runCommand } from "./commands/run.js";
import { bypassCommand } from "./commands/bypass.js";
import { autoApproveCommand } from "./commands/auto-approve.js";
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
  .command("bypass")
  .description("Show or set the remembered bypass mode for Codex runs")
  .argument("[value]", "on, off, or status", "status")
  .action(bypassCommand);

program
  .command("auto-approve")
  .description("Show or set remembered auto-approval for Copilot prompts")
  .argument("[value]", "on, off, or status", "status")
  .action(autoApproveCommand);

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
  .option(
    "--bypass",
    "Use bypass mode for this run (Codex uses full access)",
    undefined
  )
  .option(
    "--no-bypass",
    "Disable bypass mode for this run",
    undefined
  )
  .option(
    "--auto-approve",
    "Auto-approve Copilot prompts for this run",
    undefined
  )
  .option(
    "--no-auto-approve",
    "Disable Copilot auto-approval for this run",
    undefined
  )
  .option("-d, --dir <path>", "Project directory containing DEVELOPER.md, PLANNER.md, and prd.json", process.cwd())
  .action(runCommand);

program.parse();

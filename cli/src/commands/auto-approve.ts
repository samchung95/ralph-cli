import { getConfigPath, readConfig, writeConfig } from "../utils/config.js";
import { log } from "../utils/log.js";

export async function autoApproveCommand(value?: string): Promise<void> {
  const normalized = value?.trim().toLowerCase() ?? "status";
  const config = await readConfig();

  if (normalized === "status") {
    log.info(`Copilot auto-approve is ${config.copilotAutoApprove ? "on" : "off"}`);
    log.info(`Config: ${getConfigPath()}`);
    return;
  }

  if (normalized !== "on" && normalized !== "off") {
    log.error("Invalid auto-approve value. Use: ralph auto-approve on, off, or status.");
    process.exit(1);
  }

  const nextConfig = {
    ...config,
    copilotAutoApprove: normalized === "on",
  };

  await writeConfig(nextConfig);
  log.success(`Copilot auto-approve is now ${nextConfig.copilotAutoApprove ? "on" : "off"}`);
  log.info(`Config: ${getConfigPath()}`);

  if (nextConfig.copilotAutoApprove) {
    log.warn("Copilot approval prompts will be answered automatically during Ralph runs.");
  }
}

import { getConfigPath, readConfig, writeConfig } from "../utils/config.js";
import { log } from "../utils/log.js";

export async function bypassCommand(value?: string): Promise<void> {
  const normalized = value?.trim().toLowerCase() ?? "status";
  const config = await readConfig();

  if (normalized === "status") {
    log.info(`Bypass is ${config.bypass ? "on" : "off"}`);
    log.info(`Config: ${getConfigPath()}`);
    return;
  }

  if (normalized !== "on" && normalized !== "off") {
    log.error("Invalid bypass value. Use: ralph bypass on, off, or status.");
    process.exit(1);
  }

  const nextConfig = {
    ...config,
    bypass: normalized === "on",
  };

  await writeConfig(nextConfig);
  log.success(`Bypass is now ${nextConfig.bypass ? "on" : "off"}`);
  log.info(`Config: ${getConfigPath()}`);

  if (nextConfig.bypass) {
    log.warn("Codex runs will use --dangerously-bypass-approvals-and-sandbox.");
  }
}

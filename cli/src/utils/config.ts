import { homedir } from "os";
import { dirname, join } from "path";
import { mkdir, readFile, writeFile } from "fs/promises";

export interface RalphConfig {
  bypass: boolean;
}

const DEFAULT_CONFIG: RalphConfig = {
  bypass: false,
};

export function getConfigPath(): string {
  return join(homedir(), ".ralph-cli", "config.json");
}

export async function readConfig(): Promise<RalphConfig> {
  try {
    const config = JSON.parse(await readFile(getConfigPath(), "utf-8"));
    return {
      ...DEFAULT_CONFIG,
      ...config,
      bypass: Boolean(config.bypass),
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function writeConfig(config: RalphConfig): Promise<void> {
  const configPath = getConfigPath();
  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf-8");
}

export const TOOLS = ["claude", "amp", "copilot", "codex"] as const;
export type Tool = (typeof TOOLS)[number];

export const TOOL_ALIASES: Partial<Record<string, Tool>> = {
  "github-copilot": "copilot",
  "chatgpt-codex": "codex",
  chatgpt: "codex",
};

export const TOOL_NAMES = TOOLS.join(", ");

export function normalizeTool(tool: string): Tool | undefined {
  const normalized = tool.trim().toLowerCase();
  if ((TOOLS as readonly string[]).includes(normalized)) {
    return normalized as Tool;
  }
  return TOOL_ALIASES[normalized];
}

export interface RunOptions {
  tool: string;
  dangerouslySkipPermissions: boolean;
  bypass?: boolean;
  autoApprove?: boolean;
  dir: string;
}

export interface InitOptions {
  dir: string;
  force: boolean;
}

export interface InstallOptions {
  tool: string;
}

export interface ValidateOptions {
  dir: string;
  silent?: boolean;
  priority?: string;
}

export interface ResetOptions {
  dir: string;
}


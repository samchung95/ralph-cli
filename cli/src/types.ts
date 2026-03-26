export type Tool = "claude" | "amp";

export interface RunOptions {
  tool: Tool;
  dangerouslySkipPermissions: boolean;
  dir: string;
}

export interface InitOptions {
  dir: string;
  force: boolean;
}


import { spawn } from "child_process";

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Execute a command and return its output.
 * Streams stdout/stderr to the console in real-time.
 */
export function exec(
  command: string,
  args: string[],
  options?: {
    cwd?: string;
    stdin?: string;
    silent?: boolean;
  }
): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options?.cwd,
      shell: true,
      stdio: options?.stdin ? ["pipe", "pipe", "pipe"] : ["inherit", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (data: Buffer) => {
      const text = data.toString();
      stdout += text;
      if (!options?.silent) {
        process.stdout.write(text);
      }
    });

    child.stderr?.on("data", (data: Buffer) => {
      const text = data.toString();
      stderr += text;
      if (!options?.silent) {
        process.stderr.write(text);
      }
    });

    if (options?.stdin && child.stdin) {
      child.stdin.write(options.stdin);
      child.stdin.end();
    }

    child.on("error", (err) => {
      reject(err);
    });

    child.on("close", (code) => {
      resolve({
        stdout,
        stderr,
        exitCode: code ?? 1,
      });
    });
  });
}

/**
 * Check if a command is available on the system
 */
export async function commandExists(command: string): Promise<boolean> {
  try {
    const isWindows = process.platform === "win32";
    const checkCmd = isWindows ? "where" : "which";
    const result = await exec(checkCmd, [command], { silent: true });
    return result.exitCode === 0;
  } catch {
    return false;
  }
}

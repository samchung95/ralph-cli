import { readFile, writeFile, access, mkdir, copyFile, rm } from "fs/promises";
import { dirname } from "path";
import { constants } from "fs";
import { fileURLToPath } from "url";

/**
 * Check if a file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read a text file
 */
export async function readText(filePath: string): Promise<string> {
  return readFile(filePath, "utf-8");
}

/**
 * Write text to a file, creating parent directories as needed
 */
export async function writeText(
  filePath: string,
  content: string
): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf-8");
}

/**
 * Copy a file, creating parent directories as needed
 */
export async function copyFileSafe(
  src: string,
  dest: string
): Promise<void> {
  await mkdir(dirname(dest), { recursive: true });
  await copyFile(src, dest);
}

/**
 * Remove a file or directory if it exists
 */
export async function removePathIfExists(filePath: string): Promise<void> {
  await rm(filePath, { recursive: true, force: true });
}

/**
 * Get the directory where the ralph-cli package is installed
 * (for accessing templates)
 */
export function getPackageDir(): string {
  // tsup bundles everything into dist/index.js
  // import.meta.url → file:///path/to/dist/index.js
  // We need to go up one level to the package root
  const currentFile = fileURLToPath(import.meta.url);
  // Go up from dist/index.js -> package root
  return dirname(dirname(currentFile));
}

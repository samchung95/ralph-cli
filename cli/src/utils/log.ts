import chalk from "chalk";

export const log = {
  info: (msg: string) => console.log(chalk.blue("ℹ"), msg),
  success: (msg: string) => console.log(chalk.green("✔"), msg),
  warn: (msg: string) => console.log(chalk.yellow("⚠"), msg),
  error: (msg: string) => console.error(chalk.red("✖"), msg),
  step: (msg: string) => console.log(chalk.cyan("→"), msg),
  header: (msg: string) => {
    console.log("");
    console.log(chalk.bold.white("═".repeat(60)));
    console.log(chalk.bold.white(`  ${msg}`));
    console.log(chalk.bold.white("═".repeat(60)));
  },
  iteration: (current: number, max: number, tool: string) => {
    console.log("");
    console.log(chalk.bold.cyan("═".repeat(60)));
    console.log(
      chalk.bold.cyan(
        `  Ralph Cycle ${current} of ${max} (${tool})`
      )
    );
    console.log(chalk.bold.cyan("═".repeat(60)));
  },
};

import chalk from "chalk";
import ora from "ora";
import { getRecentCommits, isGitRepo } from "../git.js";
import { askAI } from "../ai.js";

export async function summaryCommand(options) {
  if (!(await isGitRepo())) {
    console.log(chalk.red("❌ Not a git repository."));
    process.exit(1);
  }

  const n = options.last || 5;
  const spinner = ora(`Fetching last ${n} commits...`).start();
  const commits = await getRecentCommits(n);

  if (!commits.length) {
    spinner.fail("No commits found.");
    process.exit(1);
  }
  spinner.succeed(`Found ${commits.length} commits.`);

  const aiSpinner = ora("Generating summary with AI...").start();

  const prompt = `Summarize these git commits in plain English for a developer.
  
Rules:
- Group related changes together
- Use bullet points
- Be concise but informative
- Highlight the most important changes
- Use past tense

Commits:
${commits.join("\n")}`;

  try {
    const summary = await askAI(prompt);
    aiSpinner.succeed("Summary ready!\n");
    console.log(chalk.bold(`📋 Summary of last ${n} commits:\n`));
    console.log(chalk.white(summary));
    console.log("");
  } catch (err) {
    aiSpinner.fail(chalk.red(`AI Error: ${err.message}`));
    process.exit(1);
  }
}

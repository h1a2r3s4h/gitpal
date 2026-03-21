import chalk from "chalk";
import ora from "ora";
import { getBranchDiff, getCurrentBranch, isGitRepo } from "../git.js";
import { askAI } from "../ai.js";

export async function prCommand(options) {
  if (!(await isGitRepo())) {
    console.log(chalk.red("❌ Not a git repository."));
    process.exit(1);
  }

  const baseBranch = options.base || "main";
  const currentBranch = await getCurrentBranch();

  console.log(
    chalk.dim(
      `Comparing ${chalk.cyan(currentBranch)} → ${chalk.cyan(baseBranch)}\n`,
    ),
  );

  const spinner = ora("Reading branch diff...").start();
  let diff;
  try {
    diff = await getBranchDiff(baseBranch);
  } catch {
    spinner.fail(
      `Could not diff against "${baseBranch}". Is the branch name correct?`,
    );
    process.exit(1);
  }

  if (!diff || diff.trim() === "") {
    spinner.warn("No differences found between branches.");
    process.exit(0);
  }
  spinner.succeed("Diff ready.");

  const aiSpinner = ora("Generating PR description with AI...").start();

  const prompt = `You are a senior developer. Write a professional GitHub Pull Request description based on this git diff.

Format it exactly like this:
## What changed
(bullet points of main changes)

## Why
(brief reason for the change)

## Type of change
(Bug fix / New feature / Refactor / Documentation)

## Testing
(what to test or how it was tested)

Git Diff:
${diff.slice(0, 4000)}`;

  try {
    const prDesc = await askAI(prompt);
    aiSpinner.succeed("PR description ready!\n");

    console.log(chalk.bold("📝 Pull Request Description:\n"));
    console.log(chalk.white(prDesc));
    console.log("");
    console.log(
      chalk.dim("💡 Copy the above and paste into your GitHub PR description."),
    );
  } catch (err) {
    aiSpinner.fail(chalk.red(`AI Error: ${err.message}`));
    process.exit(1);
  }
}

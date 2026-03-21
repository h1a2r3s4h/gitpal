import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";
import { getStagedDiff, doCommit, isGitRepo } from "../git.js";
import { askAI } from "../ai.js";

export async function commitCommand(options) {
  // 1. Guard: must be inside a git repo
  if (!(await isGitRepo())) {
    console.log(chalk.red("❌ Not a git repository."));
    process.exit(1);
  }

  // 2. Get staged diff
  const spinner = ora("Reading your staged changes...").start();
  const diff = await getStagedDiff();

  if (!diff || diff.trim() === "") {
    spinner.fail(chalk.yellow("No staged changes found. Run: git add <files>"));
    process.exit(1);
  }
  spinner.succeed("Staged changes found.");

  // 3. Ask AI to generate commit message
  const aiSpinner = ora("Generating commit message with AI...").start();

  const prompt = `You are an expert developer. Analyze this git diff and write a concise, conventional commit message.

Rules:
- Use conventional commits format: type(scope): description
- Types: feat, fix, docs, style, refactor, test, chore
- Keep it under 72 characters
- Be specific about what changed
- Return ONLY the commit message, nothing else

Git Diff:
${diff.slice(0, 3000)}`; // Limit diff size to avoid token limits

  let message;
  try {
    message = await askAI(prompt);
    aiSpinner.succeed(chalk.green("Commit message generated!"));
  } catch (err) {
    aiSpinner.fail(chalk.red(`AI Error: ${err.message}`));
    process.exit(1);
  }

  // 4. Show the message
  console.log("\n" + chalk.bold("Suggested commit message:"));
  console.log(chalk.cyan(`  ${message}\n`));

  // 5. Confirm or skip
  if (options.yes) {
    await doCommit(message);
    console.log(chalk.green.bold("✅ Committed successfully!"));
    return;
  }

  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "What would you like to do?",
      choices: [
        { name: "✅ Use this message and commit", value: "commit" },
        { name: "✏️  Edit the message", value: "edit" },
        { name: "❌ Cancel", value: "cancel" },
      ],
    },
  ]);

  if (action === "cancel") {
    console.log(chalk.yellow("Cancelled."));
    return;
  }

  if (action === "edit") {
    const { edited } = await inquirer.prompt([
      {
        type: "input",
        name: "edited",
        message: "Edit commit message:",
        default: message,
      },
    ]);
    message = edited;
  }

  await doCommit(message);
  console.log(chalk.green.bold("\n✅ Committed successfully!"));
}

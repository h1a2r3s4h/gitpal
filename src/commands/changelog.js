import chalk from "chalk";
import ora from "ora";
import { getRecentCommits, isGitRepo } from "../git.js";
import { askAI } from "../ai.js";

export async function changelogCommand(options) {
  if (!(await isGitRepo())) {
    console.log(chalk.red("❌ Not a git repository."));
    process.exit(1);
  }

  const version = options.version || "1.0.0";
  const n = options.last || 20;

  const spinner = ora(`Fetching last ${n} commits for changelog...`).start();
  const commits = await getRecentCommits(n);

  if (!commits.length) {
    spinner.fail("No commits found.");
    process.exit(1);
  }
  spinner.succeed(`Found ${commits.length} commits.`);

  const aiSpinner = ora("Generating changelog with AI...").start();

  const date = new Date().toISOString().split("T")[0];

  const prompt = `Generate a professional CHANGELOG entry from these git commits.

Format exactly like this:
## [${version}] - ${date}

### Features
- (new features added)

### Bug Fixes
- (bugs fixed)

### Improvements
- (improvements/refactors)

### Documentation
- (doc changes if any)

Rules:
- Only include sections that have relevant commits
- Be concise and user-friendly
- Skip merge commits
- Group similar changes

Commits:
${commits.join("\n")}`;

  try {
    const changelog = await askAI(prompt);
    aiSpinner.succeed("Changelog ready!\n");

    console.log(chalk.bold(`📄 CHANGELOG v${version}:\n`));
    console.log(chalk.white(changelog));
    console.log("");
    console.log(chalk.dim("💡 Add this to your CHANGELOG.md file."));
  } catch (err) {
    aiSpinner.fail(chalk.red(`AI Error: ${err.message}`));
    process.exit(1);
  }
}

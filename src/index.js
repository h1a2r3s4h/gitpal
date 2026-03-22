import { Command } from 'commander';
import chalk from 'chalk';
import { commitCommand } from './commands/commit.js';
import { summaryCommand } from './commands/summary.js';
import { prCommand } from './commands/pr.js';
import { changelogCommand } from './commands/changelog.js';
import { configCommand } from './commands/config.js';
import { reviewCommand } from './commands/review.js';
import { explainCommand } from './commands/explain.js';
import { issueCommand, saveGithubToken } from './commands/issue.js';
const program = new Command();

console.log(chalk.cyan.bold('\n🤖 GitPal — Your AI Git Assistant\n'));

program
  .name('gitpal')
  .description('AI-powered Git CLI — commit messages, PR descriptions, summaries & changelogs')
  .version('1.0.0');

program
  .command('commit')
  .description('Auto-generate a commit message from your staged changes')
  .option('-y, --yes', 'Skip confirmation and commit directly')
  .action(commitCommand);

program
  .command('summary')
  .description('Summarize recent commits in plain English')
  .option('-n, --last <number>', 'Number of commits to summarize', '5')
  .action(summaryCommand);

program
  .command('pr')
  .description('Generate a pull request description from branch diff')
  .option('-b, --base <branch>', 'Base branch to compare against', 'main')
  .option('-c, --copy', 'Copy output to clipboard')
  .action(prCommand);

program
  .command('changelog')
  .description('Generate a changelog from commit history')
  .option('-v, --version <version>', 'Version number for changelog', '1.0.0')
  .option('-n, --last <number>', 'Number of commits to include', '20')
  .action(changelogCommand);

program
  .command('config')
  .description('Configure your AI provider and API key')
  .action(configCommand);

program
  .command('review')
  .description('AI reviews your code for bugs and issues before committing')
  .option('-r, --review-only', 'Only review, do not commit')
  .action(reviewCommand);
  
program
  .command('explain <target>')
  .description('Explain any file or commit in plain English')
  .option('-f, --function <name>', 'Explain a specific function')
  .action(explainCommand);

program
  .command('issue <number>')
  .description('Fetch and fix any GitHub issue with AI guidance')
  .option('-r, --repo <repo>', 'GitHub repo (owner/repo)')
  .option('-t, --github-token <token>', 'GitHub personal access token')
  .action(issueCommand);
program.parse(process.argv);

// Show help if no command given
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

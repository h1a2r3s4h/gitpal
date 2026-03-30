import { Command } from 'commander';
import chalk from 'chalk';
import { commitCommand } from './commands/commit.js';
import { summaryCommand } from './commands/summary.js';
import { prCommand } from './commands/pr.js';
import { changelogCommand } from './commands/changelog.js';
import { configCommand } from './commands/config.js';
import { reviewCommand } from './commands/review.js';
import { explainCommand } from './commands/explain.js';
import { learnCommand } from './commands/learn.js';
import { scanCommand } from './commands/scan.js';
import { watchCommand } from './commands/watch.js';
import { prepCommand } from './commands/prep.js';
import { apiCommand } from './commands/api.js';
import { deployCommand } from './commands/deploy.js';
import { statsCommand } from './commands/stats.js';
import { testgenCommand } from './commands/testgen.js';
import { issueCommand } from './commands/issue.js';
import { askCommand } from './commands/ask.js';

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
  .command('ask <query...>')
  .description('Ask questions about your codebase using AI + retrieval')
  .action((queryParts) => askCommand(queryParts.join(' ')));

program
  .command('issue <number>')
  .description('Fetch and fix any GitHub issue with AI guidance')
  .option('--repo <repo>', 'Specify repo (owner/repo)')
  .option('-o, --oss', 'Enable OSS Copilot mode')
  .action(issueCommand);

program
  .command('learn [target]')
  .description('Learn and understand your own code with AI')
  .option('-q, --quiz', 'Take a quiz to test your knowledge')
  .option('-c, --challenge', 'Get a coding challenge')
  .action(learnCommand);

program
  .command('scan')
  .description('Scan entire codebase for security issues and bugs')
  .option('--fix', 'Auto-fix safe issues')
  .option('--security', 'Security issues only')
  .option('--report', 'Save report to file')
  .action(scanCommand);

program
  .command('watch <command...>')
  .description('Watch your app and auto-detect errors')
  .action((args) => watchCommand(args[0], args.slice(1), {}));

program
  .command('prep')
  .description('AI-powered interview preparation')
  .option('-c, --company <name>', 'Company name (google/amazon/startup)')
  .action(prepCommand);

program
  .command('api')
  .description('Test and document your API endpoints')
  .action(apiCommand);

program
  .command('deploy')
  .description('Run pre-deployment checks and deploy')
  .option('--skip-tests', 'Skip running tests')
  .option('--vercel', 'Deploy to Vercel')
  .option('--netlify', 'Deploy to Netlify')
  .option('--heroku', 'Deploy to Heroku')
  .option('--npm', 'Publish to npm')
  .action(deployCommand);

program
  .command('stats')
  .description('View your coding statistics and patterns')
  .option('--save', 'Save stats to file')
  .action(statsCommand);

program
  .command('testgen [target]')
  .description('Auto-generate tests for any file')
  .action(testgenCommand);
  


program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
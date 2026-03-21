import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { getStagedDiff, doCommit, isGitRepo } from '../git.js';
import { askAI } from '../ai.js';

export async function reviewCommand(options) {
  // 1. Guard: must be inside a git repo
  if (!(await isGitRepo())) {
    console.log(chalk.red('❌ Not a git repository.'));
    process.exit(1);
  }

  // 2. Get staged diff
  const spinner = ora('Reading your staged changes...').start();
  const diff = await getStagedDiff();

  if (!diff || diff.trim() === '') {
    spinner.fail(chalk.yellow('No staged changes found. Run: git add <files>'));
    process.exit(1);
  }
  spinner.succeed('Staged changes found.');

  // 3. Send to AI for review
  const aiSpinner = ora('AI is reviewing your code...').start();

  const prompt = `You are a senior software engineer doing a code review. Analyze this git diff carefully.

Review the code for:
1. Bugs or logic errors
2. Security issues (SQL injection, plain text passwords, exposed keys, etc.)
3. Missing error handling
4. Performance issues
5. Bad practices or code smells
6. Suggestions for improvement

Format your response EXACTLY like this:
BUGS:
- (list any bugs found, or "None found")

SECURITY:
- (list any security issues, or "None found")

IMPROVEMENTS:
- (list suggestions, or "None found")

VERDICT: (one of: "Good to commit", "Commit with caution", "Do not commit")

Be specific — mention file names and line numbers when possible.
Keep each point short and clear.

Git Diff:
${diff.slice(0, 4000)}`;

  let review;
  try {
    review = await askAI(prompt);
    aiSpinner.succeed(chalk.green('Code review complete!\n'));
  } catch (err) {
    aiSpinner.fail(chalk.red(`AI Error: ${err.message}`));
    process.exit(1);
  }

  // 4. Parse and display review nicely
  const lines = review.split('\n');
  
  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    if (trimmed.startsWith('BUGS:')) {
      console.log(chalk.red.bold('\n🐛 Bugs Found:'));
    } else if (trimmed.startsWith('SECURITY:')) {
      console.log(chalk.yellow.bold('\n🔒 Security Issues:'));
    } else if (trimmed.startsWith('IMPROVEMENTS:')) {
      console.log(chalk.blue.bold('\n💡 Improvements:'));
    } else if (trimmed.startsWith('VERDICT:')) {
      const verdict = trimmed.replace('VERDICT:', '').trim();
      console.log('');
      if (verdict.includes('Good to commit')) {
        console.log(chalk.green.bold(`✅ Verdict: ${verdict}`));
      } else if (verdict.includes('caution')) {
        console.log(chalk.yellow.bold(`⚠️  Verdict: ${verdict}`));
      } else {
        console.log(chalk.red.bold(`❌ Verdict: ${verdict}`));
      }
    } else if (trimmed.startsWith('-')) {
      // Check content to pick color
      const lower = trimmed.toLowerCase();
      if (lower.includes('none found')) {
        console.log(chalk.green(`  ${trimmed}`));
      } else if (
        lower.includes('bug') || lower.includes('error') ||
        lower.includes('crash') || lower.includes('undefined')
      ) {
        console.log(chalk.red(`  ${trimmed}`));
      } else if (
        lower.includes('security') || lower.includes('password') ||
        lower.includes('injection') || lower.includes('exposed')
      ) {
        console.log(chalk.yellow(`  ${trimmed}`));
      } else {
        console.log(chalk.cyan(`  ${trimmed}`));
      }
    } else {
      console.log(chalk.white(`  ${trimmed}`));
    }
  });

  console.log('');

  // 5. Ask what to do next
  if (options.reviewOnly) return;

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: '✅ Looks good — generate commit message and commit', value: 'commit' },
        { name: '👀 Review looks fine — just show me the diff again', value: 'diff' },
        { name: '❌ I will fix the issues first', value: 'cancel' },
      ],
    },
  ]);

  if (action === 'cancel') {
    console.log(chalk.yellow('\nSmart choice! Fix the issues and run gitpal review again.'));
    return;
  }

  if (action === 'diff') {
    console.log(chalk.dim('\n--- Staged Diff ---'));
    console.log(chalk.white(diff.slice(0, 2000)));
    return;
  }

  if (action === 'commit') {
    // Auto generate commit message after review
    const commitSpinner = ora('Generating commit message...').start();

    const commitPrompt = `You are an expert developer. Analyze this git diff and write a concise conventional commit message.

Rules:
- Use conventional commits format: type(scope): description
- Types: feat, fix, docs, style, refactor, test, chore
- Keep it under 72 characters
- Return ONLY the commit message, nothing else

Git Diff:
${diff.slice(0, 3000)}`;

    try {
      const message = await askAI(commitPrompt);
      commitSpinner.succeed(chalk.green('Commit message generated!'));

      console.log('\n' + chalk.bold('Suggested commit message:'));
      console.log(chalk.cyan(`  ${message}\n`));

      const { confirm } = await inquirer.prompt([
        {
          type: 'list',
          name: 'confirm',
          message: 'Commit with this message?',
          choices: [
            { name: '✅ Yes, commit', value: 'yes' },
            { name: '✏️  Edit message', value: 'edit' },
            { name: '❌ Cancel', value: 'cancel' },
          ],
        },
      ]);

      if (confirm === 'cancel') {
        console.log(chalk.yellow('Cancelled.'));
        return;
      }

      let finalMessage = message;
      if (confirm === 'edit') {
        const { edited } = await inquirer.prompt([
          {
            type: 'input',
            name: 'edited',
            message: 'Edit commit message:',
            default: message,
          },
        ]);
        finalMessage = edited;
      }

      await doCommit(finalMessage);
      console.log(chalk.green.bold('\n✅ Reviewed and committed successfully!'));

    } catch (err) {
      commitSpinner.fail(chalk.red(`Error: ${err.message}`));
    }
  }
}

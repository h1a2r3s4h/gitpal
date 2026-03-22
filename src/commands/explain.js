import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import path from 'path';
import { isGitRepo } from '../git.js';
import { askAI } from '../ai.js';
import simpleGit from 'simple-git';

const git = simpleGit();

export async function explainCommand(target, options) {
  // 1. Guard: must be inside a git repo
  if (!(await isGitRepo())) {
    console.log(chalk.red('❌ Not a git repository.'));
    process.exit(1);
  }

  // 2. Decide what to explain
  if (!target) {
    console.log(chalk.red('❌ Please provide something to explain.'));
    console.log(chalk.dim('\nExamples:'));
    console.log(chalk.cyan('  gitpal explain a3f2c1              ') + chalk.dim('← explain a commit'));
    console.log(chalk.cyan('  gitpal explain src/auth.js         ') + chalk.dim('← explain a file'));
    console.log(chalk.cyan('  gitpal explain src/auth.js --function login') + chalk.dim('← explain a function'));
    process.exit(1);
  }

  // 3. Check if target is a file or a commit hash
  const isFile = fs.existsSync(target);
  const isCommitHash = /^[0-9a-f]{6,40}$/i.test(target);

  if (isFile) {
    await explainFile(target, options);
  } else if (isCommitHash) {
    await explainCommit(target);
  } else {
    console.log(chalk.red(`❌ "${target}" is not a valid file or commit hash.`));
    process.exit(1);
  }
}

// ─── EXPLAIN FILE ─────────────────────────────────────────────────────────────

async function explainFile(filePath, options) {
  const spinner = ora(`Reading ${filePath}...`).start();

  let code;
  try {
    code = fs.readFileSync(filePath, 'utf-8');
  } catch {
    spinner.fail(chalk.red(`Cannot read file: ${filePath}`));
    process.exit(1);
  }

  if (!code.trim()) {
    spinner.fail(chalk.yellow('File is empty.'));
    process.exit(1);
  }

  spinner.succeed(`Read ${path.basename(filePath)} successfully.`);

  const aiSpinner = ora('AI is analyzing the code...').start();

  let prompt;

  if (options.function) {
    // Explain a specific function
    prompt = `You are a senior developer explaining code to a junior developer.

Analyze this code and explain ONLY the function named "${options.function}".

Explain:
1. What this function does in simple words
2. What inputs it takes
3. What it returns
4. Step by step what happens inside it
5. Any important things to know

Use simple language. No jargon. Maximum 10 lines.
End with: "Depends on: X, Y, Z" (list any libraries or functions it uses)

File: ${filePath}
Code:
${code.slice(0, 4000)}`;
  } else {
    // Explain the entire file
    prompt = `You are a senior developer explaining code to a junior developer.

Analyze this entire file and explain it clearly.

Tell me:
1. What is the PURPOSE of this file in one sentence
2. What are the MAIN functions/classes (list each with one line description)
3. How does it FIT into a typical project
4. Any IMPORTANT patterns or techniques used

Use simple language. Be concise. Maximum 15 lines.
End with: "Depends on: X, Y, Z" (list key imports/dependencies)

File: ${filePath}
Code:
${code.slice(0, 4000)}`;
  }

  try {
    const explanation = await askAI(prompt);
    aiSpinner.succeed('Explanation ready!\n');

    const title = options.function
      ? `📖 Explaining function: ${chalk.cyan(options.function)}() in ${chalk.dim(filePath)}`
      : `📖 Explaining file: ${chalk.cyan(path.basename(filePath))}`;

    console.log(chalk.bold(title));
    console.log(chalk.dim('─'.repeat(50)));
    console.log(chalk.white(explanation));
    console.log('');

  } catch (err) {
    aiSpinner.fail(chalk.red(`AI Error: ${err.message}`));
    process.exit(1);
  }
}

// ─── EXPLAIN COMMIT ───────────────────────────────────────────────────────────

async function explainCommit(hash) {
  const spinner = ora(`Fetching commit ${hash}...`).start();

  let diff, log;
  try {
    diff = await git.show([hash, '--stat', '--patch']);
    log = await git.log({ from: `${hash}^`, to: hash, maxCount: 1 });
  } catch {
    spinner.fail(chalk.red(`Commit "${hash}" not found.`));
    process.exit(1);
  }

  spinner.succeed('Commit found.');

  const aiSpinner = ora('AI is analyzing the commit...').start();

  const commitMessage = log.all[0]?.message || 'No message';
  const commitDate = log.all[0]?.date || '';
  const commitAuthor = log.all[0]?.author_name || '';

  const prompt = `You are a senior developer explaining a git commit to a junior developer.

Explain this commit in plain English.

Tell me:
1. WHAT changed — what was added, removed or modified
2. WHY it was likely changed — what problem it solves
3. FILES affected — list each file and what changed in it
4. IMPACT — how does this affect the overall project

Use simple language. Be specific. Maximum 15 lines.

Commit: ${hash}
Message: ${commitMessage}
Author: ${commitAuthor}
Date: ${commitDate}

Diff:
${diff.slice(0, 4000)}`;

  try {
    const explanation = await askAI(prompt);
    aiSpinner.succeed('Explanation ready!\n');

    console.log(chalk.bold(`📖 Explaining commit: ${chalk.cyan(hash)}`));
    console.log(chalk.dim(`Message: ${commitMessage}`));
    console.log(chalk.dim(`Author: ${commitAuthor}  |  Date: ${commitDate}`));
    console.log(chalk.dim('─'.repeat(50)));
    console.log(chalk.white(explanation));
    console.log('');

  } catch (err) {
    aiSpinner.fail(chalk.red(`AI Error: ${err.message}`));
    process.exit(1);
  }
}

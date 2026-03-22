import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import simpleGit from 'simple-git';
import { isGitRepo, getCurrentBranch } from '../git.js';
import { askAI, loadConfig, saveConfig } from '../ai.js';

const git = simpleGit();

// ─── GITHUB API ───────────────────────────────────────────────────────────────

async function fetchIssue(repo, issueNumber, token) {
  const url = `https://api.github.com/repos/${repo}/issues/${issueNumber}`;
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'gitpal-cli',
  };
  if (token) headers['Authorization'] = `token ${token}`;

  const res = await fetch(url, { headers });
  if (!res.ok) {
    if (res.status === 404) throw new Error(`Issue #${issueNumber} not found in ${repo}`);
    if (res.status === 401) throw new Error('Invalid GitHub token. Run: gitpal config --github-token YOUR_TOKEN');
    throw new Error(`GitHub API error: ${res.status}`);
  }
  return res.json();
}

async function fetchRepoFiles(repo, token) {
  const url = `https://api.github.com/repos/${repo}/git/trees/HEAD?recursive=1`;
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'gitpal-cli',
  };
  if (token) headers['Authorization'] = `token ${token}`;

  const res = await fetch(url, { headers });
  if (!res.ok) return [];
  const data = await res.json();
  return data.tree?.filter(f => f.type === 'blob').map(f => f.path) || [];
}

// ─── READ LOCAL FILES ─────────────────────────────────────────────────────────

function readLocalFiles(maxFiles = 10) {
  const extensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go'];
  const ignore = ['node_modules', '.git', 'dist', 'build', 'coverage'];

  const files = [];

  function walk(dir) {
    if (files.length >= maxFiles) return;
    try {
      const entries = fs.readdirSync(dir);
      for (const entry of entries) {
        if (ignore.includes(entry)) continue;
        const fullPath = path.join(dir, entry);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          walk(fullPath);
        } else if (extensions.includes(path.extname(entry))) {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            files.push({ path: fullPath, content: content.slice(0, 1000) });
            if (files.length >= maxFiles) return;
          } catch {}
        }
      }
    } catch {}
  }

  walk(process.cwd());
  return files;
}

// ─── MAIN COMMAND ─────────────────────────────────────────────────────────────

export async function issueCommand(issueNumber, options) {
  if (!(await isGitRepo())) {
    console.log(chalk.red('❌ Not a git repository. Clone the repo first.'));
    process.exit(1);
  }

  const config = loadConfig();

  // Get GitHub token
  let token = options.githubToken || config.githubToken;
  if (!token) {
    console.log(chalk.yellow('⚠️  No GitHub token found. Using public API (rate limited).'));
    console.log(chalk.dim('Add token: gitpal config --github-token YOUR_TOKEN\n'));
  }

  // Get repo
  let repo = options.repo;
  if (!repo) {
    try {
      const remotes = await git.getRemotes(true);
      const origin = remotes.find(r => r.name === 'origin');
      if (origin) {
        const match = origin.refs.fetch.match(/github\.com[:/](.+?)(?:\.git)?$/);
        if (match) repo = match[1];
      }
    } catch {}
  }

  if (!repo) {
    console.log(chalk.red('❌ Could not detect repo. Use: gitpal issue 234 --repo owner/repo'));
    process.exit(1);
  }

  console.log(chalk.dim(`\nRepo: ${repo} | Issue: #${issueNumber}\n`));

  // ── Step 1: Fetch Issue ──────────────────────────────────────────────────

  const issueSpinner = ora(`Fetching issue #${issueNumber} from GitHub...`).start();
  let issue;
  try {
    issue = await fetchIssue(repo, issueNumber, token);
    issueSpinner.succeed(`Issue found: "${issue.title}"`);
  } catch (err) {
    issueSpinner.fail(chalk.red(`Failed: ${err.message}`));
    process.exit(1);
  }

  // ── Step 2: Read local codebase ──────────────────────────────────────────

  const codeSpinner = ora('Reading your local codebase...').start();
  const localFiles = readLocalFiles(10);
  codeSpinner.succeed(`Read ${localFiles.length} files from codebase.`);

  // ── Step 3: AI Analysis ──────────────────────────────────────────────────

  const aiSpinner = ora('AI is analyzing the issue and your codebase...').start();

  const codeContext = localFiles
    .map(f => `File: ${f.path}\n${f.content}`)
    .join('\n\n---\n\n');

  const prompt = `You are a senior developer helping a junior developer fix a GitHub issue.

GITHUB ISSUE:
Title: ${issue.title}
Description: ${issue.body || 'No description'}
Labels: ${issue.labels?.map(l => l.name).join(', ') || 'None'}

LOCAL CODEBASE (first 10 files):
${codeContext.slice(0, 5000)}

Based on the issue and codebase, provide:

1. UNDERSTANDING (2-3 lines explaining the bug simply)

2. FILES TO CHANGE (list exact file paths that need changes)

3. HOW TO FIX (step by step, simple language, include code snippets)

4. DIFFICULTY: Easy / Medium / Hard

5. ESTIMATED TIME: X minutes/hours

6. COMMIT MESSAGE (conventional commit format)

7. PR TITLE (clear and professional)

8. PR DESCRIPTION (What changed, Why, How to test)

Be specific and practical. Junior developers should understand this.`;

  let analysis;
  try {
    analysis = await askAI(prompt);
    aiSpinner.succeed('Analysis complete!\n');
  } catch (err) {
    aiSpinner.fail(chalk.red(`AI Error: ${err.message}`));
    process.exit(1);
  }

  // ── Step 4: Display Analysis ─────────────────────────────────────────────

  console.log(chalk.bold.cyan(`\n🔍 Issue #${issueNumber}: ${issue.title}\n`));
  console.log(chalk.dim('─'.repeat(60)));
  console.log(chalk.white(analysis));
  console.log(chalk.dim('─'.repeat(60)));

  // ── Step 5: Ask what to do ───────────────────────────────────────────────

  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: '\nWhat would you like to do?',
    choices: [
      { name: '🌿 Create a new branch for this fix', value: 'branch' },
      { name: '📋 Generate full PR description', value: 'pr' },
      { name: '👀 I will fix it manually', value: 'manual' },
      { name: '❌ Exit', value: 'exit' },
    ],
  }]);

  if (action === 'exit' || action === 'manual') {
    console.log(chalk.yellow('\nGood luck with the fix! Run gitpal commit when done.'));
    return;
  }

  // ── Step 6: Create Branch ────────────────────────────────────────────────

  if (action === 'branch' || action === 'pr') {
    const branchName = `fix/issue-${issueNumber}-${issue.title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 30)}`;

    const { confirmBranch } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirmBranch',
      message: `Create branch: ${chalk.cyan(branchName)}?`,
      default: true,
    }]);

    if (confirmBranch) {
      const branchSpinner = ora('Creating branch...').start();
      try {
        await git.checkoutLocalBranch(branchName);
        branchSpinner.succeed(chalk.green(`Branch created: ${branchName}`));
      } catch (err) {
        branchSpinner.fail(chalk.red(`Branch error: ${err.message}`));
      }
    }
  }

  // ── Step 7: Generate PR Description ─────────────────────────────────────

  if (action === 'pr') {
    const prSpinner = ora('Generating PR description...').start();

    const prPrompt = `Write a professional GitHub Pull Request description for fixing issue #${issueNumber}.

Issue Title: ${issue.title}
Issue Description: ${issue.body?.slice(0, 500) || 'No description'}

Format exactly like this:
## Fixes
Closes #${issueNumber}

## What changed
(bullet points)

## Why
(brief reason)

## How to test
(testing steps)

## Type of change
(Bug fix / Feature / etc)`;

    try {
      const prDesc = await askAI(prPrompt);
      prSpinner.succeed('PR description ready!\n');
      console.log(chalk.bold('\n📝 Pull Request Description:\n'));
      console.log(chalk.dim('─'.repeat(60)));
      console.log(chalk.white(prDesc));
      console.log(chalk.dim('─'.repeat(60)));
      console.log(chalk.dim('\n💡 Copy the above and paste into your GitHub PR.\n'));
    } catch (err) {
      prSpinner.fail(chalk.red(`Error: ${err.message}`));
    }
  }

  // ── Step 8: Final instructions ───────────────────────────────────────────

  console.log(chalk.bold.green('\n✅ You are ready to contribute!\n'));
  console.log(chalk.white('Next steps:'));
  console.log(chalk.cyan('  1.') + chalk.white(' Fix the issue in your editor'));
  console.log(chalk.cyan('  2.') + chalk.white(' git add .'));
  console.log(chalk.cyan('  3.') + chalk.white(' gitpal commit'));
  console.log(chalk.cyan('  4.') + chalk.white(` git push origin fix/issue-${issueNumber}`));
  console.log(chalk.cyan('  5.') + chalk.white(' Open PR on GitHub\n'));
}

// ─── CONFIG GITHUB TOKEN ──────────────────────────────────────────────────────

export function saveGithubToken(token) {
  const config = loadConfig();
  config.githubToken = token;
  saveConfig(config);
  console.log(chalk.green('\n✅ GitHub token saved!'));
  console.log(chalk.dim('You can now use: gitpal issue 234 --repo owner/repo\n'));
}
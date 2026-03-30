import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import simpleGit from 'simple-git';
import { isGitRepo } from '../git.js';
import { askAI, loadConfig, saveConfig } from '../ai.js';

const git = simpleGit();

// ─────────────────────────────────────────────────────────────────────────────
// GITHUB HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function getGitHubHeaders(token) {
  const headers = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'gitpal-cli',
  };

  if (token) {
    headers.Authorization = `token ${token}`;
  }

  return headers;
}

function parseGitHubRepoFromRemote(remoteUrl) {
  if (!remoteUrl) return null;

  const cleaned = remoteUrl.trim();

  const sshMatch = cleaned.match(/github\.com[:/](.+?)\/(.+?)(?:\.git)?$/);
  if (!sshMatch) return null;

  return `${sshMatch[1]}/${sshMatch[2]}`;
}

async function detectRepo(optionsRepo) {
  if (optionsRepo) return optionsRepo;

  try {
    const remotes = await git.getRemotes(true);
    const origin = remotes.find((r) => r.name === 'origin');

    if (!origin) return null;

    const remoteUrl = origin.refs.fetch || origin.refs.push;
    return parseGitHubRepoFromRemote(remoteUrl);
  } catch {
    return null;
  }
}

async function fetchIssue(repo, issueNumber, token) {
  const url = `https://api.github.com/repos/${repo}/issues/${issueNumber}`;
  const res = await fetch(url, { headers: getGitHubHeaders(token) });

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`Issue #${issueNumber} not found in ${repo}`);
    }
    if (res.status === 401) {
      throw new Error(
        'Invalid GitHub token. Run: gitpal config --github-token YOUR_TOKEN'
      );
    }
    throw new Error(`GitHub API error: ${res.status}`);
  }

  const data = await res.json();

  if (data.pull_request) {
    throw new Error(`#${issueNumber} is a pull request, not an issue`);
  }

  return data;
}

async function fetchRepoFiles(repo, token) {
  const url = `https://api.github.com/repos/${repo}/git/trees/HEAD?recursive=1`;
  const res = await fetch(url, { headers: getGitHubHeaders(token) });

  if (!res.ok) return [];

  const data = await res.json();
  return data.tree?.filter((f) => f.type === 'blob').map((f) => f.path) || [];
}

async function fetchFileFromBranch(repo, branch, filePath, token) {
  const url = `https://raw.githubusercontent.com/${repo}/${branch}/${filePath}`;
  const res = await fetch(url, {
    headers: token ? { Authorization: `token ${token}` } : {},
  });

  if (!res.ok) return null;
  return res.text();
}

async function fetchRepoDoc(repo, filePath, token) {
  const branchesToTry = ['main', 'master'];

  for (const branch of branchesToTry) {
    try {
      const content = await fetchFileFromBranch(repo, branch, filePath, token);
      if (content) return content;
    } catch {
      // ignore and continue
    }
  }

  return '';
}

async function fetchContributionDocs(repo, token) {
  const candidates = [
    'README.md',
    'CONTRIBUTING.md',
    '.github/CONTRIBUTING.md',
    '.github/pull_request_template.md',
    '.github/ISSUE_TEMPLATE/bug_report.md',
  ];

  const docs = {};

  for (const file of candidates) {
    docs[file] = await fetchRepoDoc(repo, file, token);
  }

  return docs;
}

// ─────────────────────────────────────────────────────────────────────────────
// LOCAL CODE READING
// ─────────────────────────────────────────────────────────────────────────────

function readLocalFiles(maxFiles = 12) {
  const extensions = [
    '.js',
    '.ts',
    '.jsx',
    '.tsx',
    '.py',
    '.java',
    '.go',
    '.rs',
    '.cpp',
    '.c',
    '.cs',
  ];

  const ignore = [
    'node_modules',
    '.git',
    'dist',
    'build',
    'coverage',
    '.next',
    'out',
    '.turbo',
  ];

  const files = [];

  function walk(dir) {
    if (files.length >= maxFiles) return;

    let entries = [];
    try {
      entries = fs.readdirSync(dir);
    } catch {
      return;
    }

    for (const entry of entries) {
      if (files.length >= maxFiles) return;
      if (ignore.includes(entry)) continue;

      const fullPath = path.join(dir, entry);

      let stat;
      try {
        stat = fs.statSync(fullPath);
      } catch {
        continue;
      }

      if (stat.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (!extensions.includes(path.extname(entry))) continue;

      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        files.push({
          path: path.relative(process.cwd(), fullPath),
          content: content.slice(0, 1800),
        });
      } catch {
        // ignore unreadable files
      }
    }
  }

  walk(process.cwd());
  return files;
}

function buildCodeContext(localFiles) {
  if (!localFiles.length) return 'No local source files found.';

  return localFiles
    .map((file) => `File: ${file.path}\n${file.content}`)
    .join('\n\n---\n\n')
    .slice(0, 12000);
}

function buildDocsContext(docs) {
  return Object.entries(docs)
    .filter(([, content]) => content && content.trim())
    .map(([name, content]) => `# ${name}\n${content.slice(0, 2500)}`)
    .join('\n\n---\n\n')
    .slice(0, 10000);
}

function createBranchName(issueNumber, title) {
  const slug = String(title || 'issue')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 35);

  return `fix/issue-${issueNumber}-${slug || 'update'}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// AI HELPERS
// ─────────────────────────────────────────────────────────────────────────────

async function generateIssueAnalysis({
  repo,
  issue,
  repoFiles,
  docsContext,
  codeContext,
  ossMode,
}) {
  const prompt = `
You are a senior open-source engineer and code mentor.

Repository:
${repo}

GitHub Issue:
Title: ${issue.title}
Description: ${issue.body || 'No description'}
Labels: ${issue.labels?.map((l) => l.name).join(', ') || 'None'}

Repository File Paths:
${repoFiles.slice(0, 250).join('\n') || 'No file paths found'}

Contribution Docs:
${docsContext || 'No contribution docs found'}

Local Code Context:
${codeContext}

Task:
Help a junior developer solve this issue.

Return the answer in this exact structure:

1. ISSUE UNDERSTANDING
- Explain the issue in simple words in 2-4 lines.

2. CONTRIBUTION RULES
- Summarize important repo rules from README/CONTRIBUTING if available.
- If none found, say "No clear repo-specific rules found."

3. LIKELY FILES TO CHANGE
- Give exact file paths if possible.
- If unsure, give the best probable files.

4. STEP-BY-STEP FIX PLAN
- Clear, practical numbered steps.
- Mention what to inspect and what to change.

5. TESTING PLAN
- Explain how to test the fix.
- Mention edge cases.

6. DIFFICULTY
- Easy / Medium / Hard
- Add 1-line reason.

7. ESTIMATED TIME
- Give realistic estimate.

8. BRANCH NAME
- One clean branch name.

9. COMMIT MESSAGE
- One conventional commit message.

10. PR TITLE
- One professional pull request title.

11. PR DESCRIPTION
- Write a concise PR description with:
  - What changed
  - Why
  - How to test

12. OSS CONTRIBUTOR ADVICE
${
  ossMode
    ? '- Mention if this looks beginner-friendly, risky, or medium-risk for open-source contribution.'
    : '- Give one short practical tip.'
}

Be specific, practical, and junior-friendly.
`;

  return askAI(prompt);
}

async function generatePrDescription({ issueNumber, issue }) {
  const prPrompt = `
Write a professional GitHub Pull Request description for fixing issue #${issueNumber}.

Issue Title: ${issue.title}
Issue Description: ${issue.body?.slice(0, 1000) || 'No description'}

Format exactly like this:

## Fixes
Closes #${issueNumber}

## What changed
- bullet points

## Why
short paragraph

## How to test
- step 1
- step 2

## Type of change
Bug fix
`;

  return askAI(prPrompt);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMMAND
// ─────────────────────────────────────────────────────────────────────────────

export async function issueCommand(issueNumber, options = {}) {
  if (!(await isGitRepo())) {
    console.log(chalk.red('❌ Not a git repository. Clone the repo first.'));
    process.exit(1);
  }

  const config = loadConfig();
  const token = options.githubToken || config.githubToken || null;
  const ossMode = Boolean(options.oss);

  if (!token) {
    console.log(
      chalk.yellow('⚠️  No GitHub token found. Using public API (rate limited).')
    );
    console.log(
      chalk.dim('Add token: gitpal config --github-token YOUR_TOKEN\n')
    );
  }

  const repo = await detectRepo(options.repo);

  if (!repo) {
    console.log(
      chalk.red(
        '❌ Could not detect repo. Use: gitpal issue 234 --repo owner/repo'
      )
    );
    process.exit(1);
  }

  console.log(
    chalk.dim(
      `\nRepo: ${repo} | Issue: #${issueNumber} | Mode: ${
        ossMode ? 'OSS Copilot' : 'Standard'
      }\n`
    )
  );

  // Step 1: Fetch issue
  const issueSpinner = ora(`Fetching issue #${issueNumber} from GitHub...`).start();

  let issue;
  try {
    issue = await fetchIssue(repo, issueNumber, token);
    issueSpinner.succeed(`Issue found: "${issue.title}"`);
  } catch (err) {
    issueSpinner.fail(chalk.red(`Failed: ${err.message}`));
    process.exit(1);
  }

  // Step 2: Fetch repo files and docs
  const repoSpinner = ora('Fetching repository structure and contribution docs...').start();

  let repoFiles = [];
  let docs = {};

  try {
    const [files, contributionDocs] = await Promise.all([
      fetchRepoFiles(repo, token),
      fetchContributionDocs(repo, token),
    ]);

    repoFiles = files;
    docs = contributionDocs;

    const foundDocs = Object.values(docs).filter(Boolean).length;
    repoSpinner.succeed(
      `Repo context loaded (${repoFiles.length} files, ${foundDocs} docs found).`
    );
  } catch {
    repoSpinner.warn('Could not fully fetch repository docs. Continuing...');
  }

  // Step 3: Read local codebase
  const codeSpinner = ora('Reading your local codebase...').start();
  const localFiles = readLocalFiles(12);
  codeSpinner.succeed(`Read ${localFiles.length} local source files.`);

  // Step 4: AI analysis
  const aiSpinner = ora(
    ossMode
      ? 'GitPal OSS Copilot is analyzing the issue...'
      : 'AI is analyzing the issue and your codebase...'
  ).start();

  const docsContext = buildDocsContext(docs);
  const codeContext = buildCodeContext(localFiles);

  let analysis;
  try {
    analysis = await generateIssueAnalysis({
      repo,
      issue,
      repoFiles,
      docsContext,
      codeContext,
      ossMode,
    });
    aiSpinner.succeed('Analysis complete!\n');
  } catch (err) {
    aiSpinner.fail(chalk.red(`AI Error: ${err.message}`));
    process.exit(1);
  }

  // Step 5: Show analysis
  console.log(chalk.bold.cyan(`\n🔍 Issue #${issueNumber}: ${issue.title}\n`));
  console.log(chalk.dim('─'.repeat(72)));
  console.log(chalk.white(analysis));
  console.log(chalk.dim('─'.repeat(72)));

  // Step 6: Ask next action
  const choices = [
    { name: '🌿 Create a new branch for this fix', value: 'branch' },
    { name: '📋 Generate full PR description', value: 'pr' },
  ];

  if (ossMode) {
    choices.unshift({
      name: '🚀 Create branch + generate PR description',
      value: 'all',
    });
  }

  choices.push(
    { name: '👀 I will fix it manually', value: 'manual' },
    { name: '❌ Exit', value: 'exit' }
  );

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: '\nWhat would you like to do?',
      choices,
    },
  ]);

  if (action === 'exit' || action === 'manual') {
    console.log(
      chalk.yellow('\nGood luck with the fix! Run gitpal commit when done.\n')
    );
    return;
  }

  const branchName = createBranchName(issueNumber, issue.title);

  // Step 7: Create branch
  if (action === 'branch' || action === 'pr' || action === 'all') {
    const currentBranch = await git.branchLocal().then((b) => b.current).catch(() => null);

    if (currentBranch === branchName) {
      console.log(chalk.yellow(`\n⚠️  You are already on branch: ${branchName}\n`));
    } else {
      const { confirmBranch } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirmBranch',
          message: `Create and switch to branch: ${chalk.cyan(branchName)}?`,
          default: true,
        },
      ]);

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
  }

  // Step 8: Generate PR description
  if (action === 'pr' || action === 'all') {
    const prSpinner = ora('Generating PR description...').start();

    try {
      const prDesc = await generatePrDescription({ issueNumber, issue });
      prSpinner.succeed('PR description ready!\n');

      console.log(chalk.bold('\n📝 Pull Request Description:\n'));
      console.log(chalk.dim('─'.repeat(72)));
      console.log(chalk.white(prDesc));
      console.log(chalk.dim('─'.repeat(72)));
      console.log(
        chalk.dim('\n💡 Copy the above and paste it into your GitHub PR.\n')
      );
    } catch (err) {
      prSpinner.fail(chalk.red(`Error: ${err.message}`));
    }
  }

  // Step 9: Final instructions
  console.log(chalk.bold.green('\n✅ You are ready to contribute!\n'));
  console.log(chalk.white('Next steps:'));
  console.log(chalk.cyan('  1.') + chalk.white(' Fix the issue in your editor'));
  console.log(chalk.cyan('  2.') + chalk.white(' Run tests / verify the fix'));
  console.log(chalk.cyan('  3.') + chalk.white(' git add .'));
  console.log(chalk.cyan('  4.') + chalk.white(' gitpal commit'));
  console.log(chalk.cyan('  5.') + chalk.white(` git push origin ${branchName}`));
  console.log(chalk.cyan('  6.') + chalk.white(' Open PR on GitHub\n'));
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG GITHUB TOKEN
// ─────────────────────────────────────────────────────────────────────────────

export function saveGithubToken(token) {
  const config = loadConfig();
  config.githubToken = token;
  saveConfig(config);

  console.log(chalk.green('\n✅ GitHub token saved!'));
  console.log(
    chalk.dim('You can now use: gitpal issue 234 --repo owner/repo --oss\n')
  );
}
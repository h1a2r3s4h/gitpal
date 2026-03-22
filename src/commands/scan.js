import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import { isGitRepo } from '../git.js';
import { askAI } from '../ai.js';

// ─── FILE READER ──────────────────────────────────────────────────────────────

function getAllFiles(dir, extensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go'], ignore = ['node_modules', '.git', 'dist', 'build', 'coverage', '.next']) {
  const files = [];
  function walk(current) {
    try {
      const entries = fs.readdirSync(current);
      for (const entry of entries) {
        if (ignore.includes(entry)) continue;
        const fullPath = path.join(current, entry);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          walk(fullPath);
        } else if (extensions.includes(path.extname(entry))) {
          files.push(fullPath);
        }
      }
    } catch {}
  }
  walk(dir);
  return files;
}

// ─── SCAN HISTORY ─────────────────────────────────────────────────────────────

const SCAN_HISTORY_PATH = path.join(process.cwd(), '.gitpal-scan.json');

function loadScanHistory() {
  if (!fs.existsSync(SCAN_HISTORY_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(SCAN_HISTORY_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

function saveScanHistory(result) {
  const history = loadScanHistory();
  history.push({ date: new Date().toISOString(), ...result });
  fs.writeFileSync(SCAN_HISTORY_PATH, JSON.stringify(history.slice(-10), null, 2));
}

// ─── MAIN SCAN COMMAND ────────────────────────────────────────────────────────

export async function scanCommand(options) {
  if (!(await isGitRepo())) {
    console.log(chalk.red('❌ Not a git repository.'));
    process.exit(1);
  }

  console.log(chalk.cyan.bold('\n🔍 GitPal Security & Quality Scanner\n'));

  // Get all files
  const scanSpinner = ora('Scanning project files...').start();
  const files = getAllFiles(process.cwd());

  if (files.length === 0) {
    scanSpinner.fail('No files found to scan.');
    process.exit(1);
  }
  scanSpinner.succeed(`Found ${files.length} files to scan.`);

  // Filter by type if needed
  let filesToScan = files;
  if (options.security) {
    filesToScan = files.filter(f => !f.includes('test') && !f.includes('spec'));
  }

  // Read file contents
  const fileContents = filesToScan.slice(0, 15).map(f => {
    try {
      return { path: f.replace(process.cwd(), ''), content: fs.readFileSync(f, 'utf-8').slice(0, 800) };
    } catch {
      return null;
    }
  }).filter(Boolean);

  // AI Analysis
  const aiSpinner = ora('AI is analyzing your codebase...').start();

  const prompt = `You are a senior security engineer doing a comprehensive code audit.

Analyze these code files and find ALL issues.

For EACH issue found, use EXACTLY this format:
ISSUE: [CRITICAL/HIGH/MEDIUM/LOW] | [filename] line [number] | [short description]
FIX: [exact fix in one line]

Categories to check:
1. SECURITY: hardcoded passwords, API keys, SQL injection, XSS, no auth, plain text secrets
2. BUGS: undefined variables, missing error handling, infinite loops, memory leaks
3. QUALITY: console.logs in production, TODO comments, dead code, huge functions
4. PERFORMANCE: missing caching, N+1 queries, synchronous blocking calls

After all issues, add:
SUMMARY:
- Total issues: X
- Critical: X
- High: X  
- Medium: X
- Low: X
- Verdict: [Production Ready / Needs Work / Do Not Deploy]

Files to analyze:
${fileContents.map(f => `\n### ${f.path}\n${f.content}`).join('\n')}`;

  let scanResult;
  try {
    scanResult = await askAI(prompt);
    aiSpinner.succeed('Scan complete!\n');
  } catch (err) {
    aiSpinner.fail(chalk.red(`AI Error: ${err.message}`));
    process.exit(1);
  }

  // Display results
  displayScanResults(scanResult, fileContents.length);

  // Save to history
  const issueCount = (scanResult.match(/ISSUE:/g) || []).length;
  saveScanHistory({ filesScanned: fileContents.length, issuesFound: issueCount });

  // Ask what to do
  if (options.fix) {
    await autoFix(scanResult, fileContents);
    return;
  }

  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: 'What would you like to do?',
    choices: [
      { name: '🔧 Auto-fix safe issues (console.logs, TODOs)', value: 'fix' },
      { name: '📊 Compare with last scan', value: 'diff' },
      { name: '📄 Save report to file', value: 'report' },
      { name: '❌ Exit', value: 'exit' },
    ],
  }]);

  if (action === 'fix') await autoFix(scanResult, fileContents);
  if (action === 'diff') showDiff();
  if (action === 'report') saveReport(scanResult, fileContents.length);
}

// ─── DISPLAY RESULTS ──────────────────────────────────────────────────────────

function displayScanResults(result, fileCount) {
  const lines = result.split('\n');
  let currentSection = '';

  console.log(chalk.bold(`📊 Scan Results — ${fileCount} files analyzed\n`));
  console.log(chalk.dim('═'.repeat(60)));

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    if (trimmed.startsWith('ISSUE:')) {
      const parts = trimmed.replace('ISSUE:', '').trim();
      if (parts.includes('CRITICAL')) {
        console.log(chalk.red.bold(`\n❌ CRITICAL  ${parts.replace('CRITICAL |', '').trim()}`));
      } else if (parts.includes('HIGH')) {
        console.log(chalk.red(`\n🔴 HIGH      ${parts.replace('HIGH |', '').trim()}`));
      } else if (parts.includes('MEDIUM')) {
        console.log(chalk.yellow(`\n🟡 MEDIUM    ${parts.replace('MEDIUM |', '').trim()}`));
      } else if (parts.includes('LOW')) {
        console.log(chalk.blue(`\n🔵 LOW       ${parts.replace('LOW |', '').trim()}`));
      }
    } else if (trimmed.startsWith('FIX:')) {
      console.log(chalk.green(`   💡 Fix: ${trimmed.replace('FIX:', '').trim()}`));
    } else if (trimmed.startsWith('SUMMARY:')) {
      console.log(chalk.dim('\n' + '═'.repeat(60)));
      console.log(chalk.bold('\n📈 Summary:\n'));
    } else if (trimmed.startsWith('- ')) {
      const content = trimmed.replace('- ', '');
      if (content.toLowerCase().includes('production ready')) {
        console.log(chalk.green(`  ✅ ${content}`));
      } else if (content.toLowerCase().includes('do not deploy')) {
        console.log(chalk.red(`  ❌ ${content}`));
      } else if (content.toLowerCase().includes('needs work')) {
        console.log(chalk.yellow(`  ⚠️  ${content}`));
      } else {
        console.log(chalk.white(`  ${trimmed}`));
      }
    }
  });

  console.log('');
}

// ─── AUTO FIX ─────────────────────────────────────────────────────────────────

async function autoFix(scanResult, fileContents) {
  console.log(chalk.bold('\n🔧 Auto-fixing safe issues...\n'));

  let fixCount = 0;

  for (const file of fileContents) {
    const fullPath = path.join(process.cwd(), file.path);
    let content;
    try {
      content = fs.readFileSync(fullPath, 'utf-8');
    } catch {
      continue;
    }

    let modified = false;

    // Remove console.logs
    if (content.includes('console.log')) {
      const newContent = content.replace(/console\.log\(.*?\);?\n?/g, '');
      if (newContent !== content) {
        fs.writeFileSync(fullPath, newContent);
        console.log(chalk.green(`  ✅ Removed console.logs from ${file.path}`));
        content = newContent;
        modified = true;
        fixCount++;
      }
    }

    // Flag hardcoded secrets (don't auto fix — too risky)
    const secretPatterns = [
      /password\s*=\s*['"][^'"]+['"]/gi,
      /api_key\s*=\s*['"][^'"]+['"]/gi,
      /secret\s*=\s*['"][^'"]+['"]/gi,
    ];

    secretPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        console.log(chalk.yellow(`  ⚠️  Hardcoded secret found in ${file.path} — fix manually`));
      }
    });
  }

  if (fixCount === 0) {
    console.log(chalk.dim('  No auto-fixable issues found.'));
  } else {
    console.log(chalk.green.bold(`\n✅ Fixed ${fixCount} issues automatically!`));
    console.log(chalk.dim('Run: git add . && gitpal commit'));
  }
}

// ─── SHOW DIFF ────────────────────────────────────────────────────────────────

function showDiff() {
  const history = loadScanHistory();
  if (history.length < 2) {
    console.log(chalk.yellow('\nNot enough scan history. Run scan again tomorrow to compare!'));
    return;
  }

  const latest = history[history.length - 1];
  const previous = history[history.length - 2];

  console.log(chalk.bold('\n📊 Scan Comparison:\n'));
  console.log(chalk.dim(`Previous scan: ${new Date(previous.date).toLocaleDateString()}`));
  console.log(chalk.dim(`Latest scan:   ${new Date(latest.date).toLocaleDateString()}\n`));

  const diff = previous.issuesFound - latest.issuesFound;
  if (diff > 0) {
    console.log(chalk.green(`✅ You fixed ${diff} issues since last scan!`));
  } else if (diff < 0) {
    console.log(chalk.red(`❌ ${Math.abs(diff)} new issues added since last scan.`));
  } else {
    console.log(chalk.yellow('➡️  Same number of issues as last scan.'));
  }
}

// ─── SAVE REPORT ──────────────────────────────────────────────────────────────

function saveReport(scanResult, fileCount) {
  const reportPath = path.join(process.cwd(), `gitpal-scan-${Date.now()}.txt`);
  const report = `GitPal Security Scan Report
Generated: ${new Date().toLocaleString()}
Files Scanned: ${fileCount}

${scanResult}`;

  fs.writeFileSync(reportPath, report);
  console.log(chalk.green(`\n✅ Report saved to: gitpal-scan-${Date.now()}.txt`));
}

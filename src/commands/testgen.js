import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import { isGitRepo } from '../git.js';
import { askAI } from '../ai.js';

// ─── DETECT TEST FRAMEWORK ────────────────────────────────────────────────────

function detectTestFramework() {
  try {
    const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps['jest']) return 'jest';
    if (deps['mocha']) return 'mocha';
    if (deps['vitest']) return 'vitest';
    if (deps['jasmine']) return 'jasmine';
    return 'jest'; // default
  } catch {
    return 'jest';
  }
}

// ─── GET FUNCTIONS FROM FILE ──────────────────────────────────────────────────

function extractFunctions(content) {
  const patterns = [
    /export\s+(?:async\s+)?function\s+(\w+)/g,
    /export\s+const\s+(\w+)\s*=\s*(?:async\s+)?\(/g,
    /(?:async\s+)?function\s+(\w+)/g,
    /const\s+(\w+)\s*=\s*(?:async\s+)?\(/g,
  ];

  const functions = new Set();
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      if (!['if', 'for', 'while', 'switch', 'catch'].includes(match[1])) {
        functions.add(match[1]);
      }
    }
  });

  return [...functions];
}

// ─── MAIN TEST COMMAND ────────────────────────────────────────────────────────

export async function testgenCommand(target, options) {
  if (!(await isGitRepo())) {
    console.log(chalk.red('❌ Not a git repository.'));
    process.exit(1);
  }

  console.log(chalk.cyan.bold('\n🧪 GitPal Test Generator\n'));

  const framework = detectTestFramework();
  console.log(chalk.dim(`Test framework detected: ${framework}\n`));

  // If no target — find files without tests
  if (!target) {
    await findUntested(framework);
    return;
  }

  // Check file exists
  if (!fs.existsSync(target)) {
    console.log(chalk.red(`❌ File not found: ${target}`));
    process.exit(1);
  }

  const content = fs.readFileSync(target, 'utf-8');
  const functions = extractFunctions(content);

  console.log(chalk.bold(`📁 File: ${target}`));
  console.log(chalk.dim(`Functions found: ${functions.join(', ')}\n`));

  // Generate tests
  const aiSpinner = ora('Generating tests with AI...').start();

  const prompt = `You are a senior developer writing ${framework} tests.

Generate comprehensive tests for this file.

File: ${target}
Code:
${content.slice(0, 3000)}

Requirements:
1. Use ${framework} syntax
2. Test all exported functions
3. Include happy path tests
4. Include edge case tests
5. Include error case tests
6. Use descriptive test names
7. Mock external dependencies

Return ONLY the test code — no explanation, no markdown backticks.
Start directly with the import statements.`;

  let tests;
  try {
    tests = await askAI(prompt);
    aiSpinner.succeed('Tests generated!\n');
  } catch (err) {
    aiSpinner.fail(chalk.red(`AI Error: ${err.message}`));
    process.exit(1);
  }

  // Show preview
  console.log(chalk.bold('📝 Generated Tests Preview:\n'));
  console.log(chalk.dim('─'.repeat(50)));
  console.log(chalk.white(tests.slice(0, 500) + (tests.length > 500 ? '\n...' : '')));
  console.log(chalk.dim('─'.repeat(50)));

  // Ask what to do
  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: '\nWhat would you like to do?',
    choices: [
      { name: '💾 Save tests to file', value: 'save' },
      { name: '👀 Show full tests', value: 'show' },
      { name: '❌ Cancel', value: 'cancel' },
    ],
  }]);

  if (action === 'cancel') return;

  if (action === 'show') {
    console.log(chalk.bold('\n📝 Full Generated Tests:\n'));
    console.log(chalk.white(tests));
  }

  if (action === 'save' || action === 'show') {
    const { save } = await inquirer.prompt([{
      type: 'confirm',
      name: 'save',
      message: 'Save tests to file?',
      default: true,
    }]);

    if (save) {
      const testPath = target
        .replace('.js', '.test.js')
        .replace('.ts', '.test.ts')
        .replace('src/', 'tests/')
        .replace('lib/', 'tests/');

      const dir = path.dirname(testPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      fs.writeFileSync(testPath, tests);
      console.log(chalk.green(`\n✅ Tests saved to: ${testPath}`));
      console.log(chalk.dim(`Run: npm test`));
    }
  }
}

// ─── FIND UNTESTED FILES ──────────────────────────────────────────────────────

async function findUntested(framework) {
  const spinner = ora('Finding files without tests...').start();

  const sourceFiles = [];
  const testFiles = new Set();

  function walk(dir, ignore = ['node_modules', '.git', 'dist', 'build']) {
    try {
      fs.readdirSync(dir).forEach(entry => {
        if (ignore.includes(entry)) return;
        const fullPath = path.join(dir, entry);
        if (fs.statSync(fullPath).isDirectory()) {
          walk(fullPath, ignore);
        } else if (['.js', '.ts'].includes(path.extname(entry))) {
          if (entry.includes('.test.') || entry.includes('.spec.')) {
            testFiles.add(entry.replace('.test', '').replace('.spec', ''));
          } else {
            sourceFiles.push(fullPath);
          }
        }
      });
    } catch {}
  }

  walk(process.cwd());

  const untested = sourceFiles.filter(f => {
    const base = path.basename(f);
    return !testFiles.has(base) && !f.includes('index') && !f.includes('config');
  });

  spinner.succeed(`Found ${untested.length} files without tests.`);

  if (untested.length === 0) {
    console.log(chalk.green('\n✅ All files have tests! Great job.'));
    return;
  }

  console.log(chalk.bold('\n📁 Files without tests:\n'));
  untested.slice(0, 10).forEach((f, i) => {
    console.log(`  ${i + 1}. ${chalk.cyan(f.replace(process.cwd(), ''))}`);
  });

  const { chosen } = await inquirer.prompt([{
    type: 'list',
    name: 'chosen',
    message: '\nGenerate tests for which file?',
    choices: [
      ...untested.slice(0, 8).map(f => ({
        name: f.replace(process.cwd(), ''),
        value: f,
      })),
      { name: '❌ Cancel', value: 'cancel' },
    ],
  }]);

  if (chosen === 'cancel') return;
  await testgenCommand(chosen, { framework });
}

import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import { execSync, exec } from 'child_process';
import { isGitRepo, getCurrentBranch, getRecentCommits } from '../git.js';
import { askAI } from '../ai.js';

// ─── DETECT PROJECT TYPE ──────────────────────────────────────────────────────

function detectProjectType() {
  const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };

  if (deps['next']) return { type: 'nextjs', buildCmd: 'npm run build', testCmd: 'npm test' };
  if (deps['react-scripts']) return { type: 'react', buildCmd: 'npm run build', testCmd: 'npm test' };
  if (deps['@angular/core']) return { type: 'angular', buildCmd: 'npm run build', testCmd: 'npm test' };
  if (deps['vue']) return { type: 'vue', buildCmd: 'npm run build', testCmd: 'npm test' };
  if (deps['express'] || deps['fastify']) return { type: 'node', buildCmd: null, testCmd: 'npm test' };
  return { type: 'node', buildCmd: null, testCmd: 'npm test' };
}

// ─── RUN COMMAND ──────────────────────────────────────────────────────────────

function runCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { cwd: process.cwd() }, (error, stdout, stderr) => {
      if (error) reject({ error, stdout, stderr });
      else resolve({ stdout, stderr });
    });
  });
}

// ─── PRE DEPLOY CHECKS ────────────────────────────────────────────────────────

async function runChecks(project, options) {
  const checks = [];

  // Check 1: Tests
  if (!options.skipTests && project.testCmd) {
    const spinner = ora('Running tests...').start();
    try {
      await runCommand(project.testCmd);
      spinner.succeed(chalk.green('Tests passed'));
      checks.push({ name: 'Tests', passed: true });
    } catch (err) {
      spinner.fail(chalk.red('Tests failed'));
      checks.push({ name: 'Tests', passed: false, error: err.stdout });
    }
  }

  // Check 2: Build
  if (project.buildCmd) {
    const spinner = ora('Building project...').start();
    try {
      await runCommand(project.buildCmd);
      spinner.succeed(chalk.green('Build successful'));
      checks.push({ name: 'Build', passed: true });
    } catch (err) {
      spinner.fail(chalk.red('Build failed'));
      checks.push({ name: 'Build', passed: false, error: err.stderr });
    }
  }

  // Check 3: Console.logs
  const spinner3 = ora('Checking for console.logs...').start();
  const consoleLogFiles = [];
  function checkConsoleLogs(dir) {
    try {
      fs.readdirSync(dir).forEach(entry => {
        if (['node_modules', '.git', 'dist', 'build'].includes(entry)) return;
        const fullPath = path.join(dir, entry);
        if (fs.statSync(fullPath).isDirectory()) checkConsoleLogs(fullPath);
        else if (['.js', '.ts'].includes(path.extname(entry))) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          if (content.includes('console.log')) consoleLogFiles.push(fullPath.replace(process.cwd(), ''));
        }
      });
    } catch {}
  }
  checkConsoleLogs(process.cwd());

  if (consoleLogFiles.length > 0) {
    spinner3.warn(chalk.yellow(`Found console.logs in ${consoleLogFiles.length} files`));
    checks.push({ name: 'Console.logs', passed: false, warning: true, files: consoleLogFiles });
  } else {
    spinner3.succeed(chalk.green('No console.logs found'));
    checks.push({ name: 'Console.logs', passed: true });
  }

  // Check 4: .env not committed
  const spinner4 = ora('Checking .env security...').start();
  try {
    const gitStatus = execSync('git ls-files .env').toString().trim();
    if (gitStatus) {
      spinner4.fail(chalk.red('.env file is committed! Remove it immediately'));
      checks.push({ name: '.env Security', passed: false, critical: true });
    } else {
      spinner4.succeed(chalk.green('.env file is safe'));
      checks.push({ name: '.env Security', passed: true });
    }
  } catch {
    spinner4.succeed(chalk.green('.env file is safe'));
    checks.push({ name: '.env Security', passed: true });
  }

  // Check 5: Uncommitted changes
  const spinner5 = ora('Checking for uncommitted changes...').start();
  try {
    const status = execSync('git status --porcelain').toString().trim();
    if (status) {
      spinner5.warn(chalk.yellow('You have uncommitted changes'));
      checks.push({ name: 'Git Status', passed: false, warning: true });
    } else {
      spinner5.succeed(chalk.green('All changes committed'));
      checks.push({ name: 'Git Status', passed: true });
    }
  } catch {
    checks.push({ name: 'Git Status', passed: true });
  }

  return checks;
}

// ─── DEPLOY TO PLATFORM ───────────────────────────────────────────────────────

async function deployToPlatform(platform) {
  const commands = {
    vercel: 'npx vercel --prod',
    netlify: 'npx netlify deploy --prod',
    heroku: 'git push heroku main',
    github: 'git push origin main',
    npm: 'npm version patch --no-git-tag-version && npm publish',
  };

  const cmd = commands[platform];
  if (!cmd) {
    console.log(chalk.red(`Unknown platform: ${platform}`));
    return;
  }

  const spinner = ora(`Deploying to ${platform}...`).start();
  try {
    const { stdout } = await runCommand(cmd);
    spinner.succeed(chalk.green(`Deployed to ${platform} successfully!`));
    if (stdout) console.log(chalk.dim(stdout.slice(0, 200)));
  } catch (err) {
    spinner.fail(chalk.red(`Deployment to ${platform} failed`));
    console.log(chalk.dim(err.stderr?.slice(0, 200) || ''));
  }
}

// ─── MAIN DEPLOY COMMAND ──────────────────────────────────────────────────────

export async function deployCommand(options) {
  if (!(await isGitRepo())) {
    console.log(chalk.red('❌ Not a git repository.'));
    process.exit(1);
  }

  console.log(chalk.cyan.bold('\n🚀 GitPal Deployment Pipeline\n'));

  // Detect project
  let project;
  try {
    project = detectProjectType();
    console.log(chalk.dim(`Project type detected: ${project.type}\n`));
  } catch {
    project = { type: 'node', buildCmd: null, testCmd: 'npm test' };
  }

  // Run pre-deploy checks
  console.log(chalk.bold('📋 Pre-deployment Checklist:\n'));
  const checks = await runChecks(project, options);

  // Summary
  const passed = checks.filter(c => c.passed).length;
  const failed = checks.filter(c => !c.passed && !c.warning).length;
  const warnings = checks.filter(c => c.warning).length;

  console.log(chalk.bold('\n📊 Checklist Summary:'));
  console.log(chalk.green(`  ✅ Passed:   ${passed}`));
  console.log(chalk.red(`  ❌ Failed:   ${failed}`));
  console.log(chalk.yellow(`  ⚠️  Warnings: ${warnings}\n`));

  // Critical failures
  const criticalFails = checks.filter(c => !c.passed && !c.warning && c.critical);
  if (criticalFails.length > 0) {
    console.log(chalk.red.bold('❌ CRITICAL ISSUES FOUND — Cannot deploy!\n'));
    criticalFails.forEach(c => console.log(chalk.red(`  • ${c.name}`)));
    process.exit(1);
  }

  // Ask to continue if failures
  if (failed > 0) {
    const { proceed } = await inquirer.prompt([{
      type: 'confirm',
      name: 'proceed',
      message: chalk.yellow('Some checks failed. Deploy anyway?'),
      default: false,
    }]);
    if (!proceed) {
      console.log(chalk.yellow('\nDeployment cancelled. Fix the issues first.'));
      return;
    }
  }

  // Choose platform
  let platform = options.vercel ? 'vercel'
    : options.netlify ? 'netlify'
    : options.heroku ? 'heroku'
    : options.npm ? 'npm'
    : null;

  if (!platform) {
    const { chosen } = await inquirer.prompt([{
      type: 'list',
      name: 'chosen',
      message: 'Choose deployment platform:',
      choices: [
        { name: '▲ Vercel', value: 'vercel' },
        { name: '◉ Netlify', value: 'netlify' },
        { name: '⬡ Heroku', value: 'heroku' },
        { name: '⬆ GitHub (git push)', value: 'github' },
        { name: '📦 npm publish', value: 'npm' },
        { name: '❌ Cancel', value: 'cancel' },
      ],
    }]);
    if (chosen === 'cancel') return;
    platform = chosen;
  }

  // Generate changelog before deploy
  const changelogSpinner = ora('Generating release notes...').start();
  try {
    const commits = await getRecentCommits(10);
    const changelog = await askAI(`Write a brief release note for this deployment based on these recent commits:
${commits.join('\n')}
Keep it under 5 bullet points. Professional tone.`);
    changelogSpinner.succeed('Release notes ready!');
    console.log(chalk.dim('\n' + changelog + '\n'));
  } catch {
    changelogSpinner.fail(chalk.dim('Could not generate release notes.'));
  }

  // Deploy
  await deployToPlatform(platform);

  // Save deployment history
  const historyPath = path.join(process.cwd(), '.gitpal-deploys.json');
  const history = fs.existsSync(historyPath)
    ? JSON.parse(fs.readFileSync(historyPath, 'utf-8'))
    : [];
  history.push({ date: new Date().toISOString(), platform, branch: await getCurrentBranch() });
  fs.writeFileSync(historyPath, JSON.stringify(history.slice(-20), null, 2));

  console.log(chalk.green.bold('\n✅ Deployment complete!\n'));
}

import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import { isGitRepo } from '../git.js';
import { askAI } from '../ai.js';

// ─── FIND ENDPOINTS ───────────────────────────────────────────────────────────

function findEndpoints(dir) {
  const endpoints = [];
  const routePatterns = [
    { regex: /\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/gi, type: 'express' },
    { regex: /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/gi, type: 'express' },
    { regex: /app\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/gi, type: 'express' },
    { regex: /@(Get|Post|Put|Delete|Patch)\s*\(\s*['"`]([^'"`]+)['"`]/gi, type: 'nestjs' },
  ];

  function walk(current, ignore = ['node_modules', '.git', 'dist', 'build']) {
    try {
      fs.readdirSync(current).forEach(entry => {
        if (ignore.includes(entry)) return;
        const fullPath = path.join(current, entry);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          walk(fullPath, ignore);
        } else if (['.js', '.ts'].includes(path.extname(entry))) {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            routePatterns.forEach(({ regex, type }) => {
              let match;
              while ((match = regex.exec(content)) !== null) {
                endpoints.push({
                  method: match[1].toUpperCase(),
                  path: match[2],
                  file: fullPath.replace(dir, ''),
                  type,
                });
              }
            });
          } catch {}
        }
      });
    } catch {}
  }

  walk(dir);
  return endpoints;
}

// ─── TEST ENDPOINT ────────────────────────────────────────────────────────────

async function testEndpoint(baseUrl, endpoint) {
  const url = `${baseUrl}${endpoint.path}`;
  const start = Date.now();

  try {
    const res = await fetch(url, {
      method: endpoint.method,
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    const duration = Date.now() - start;
    return {
      status: res.status,
      ok: res.ok,
      duration,
      slow: duration > 1000,
    };
  } catch (err) {
    return {
      status: 0,
      ok: false,
      duration: Date.now() - start,
      error: err.message,
    };
  }
}

// ─── MAIN API COMMAND ─────────────────────────────────────────────────────────

export async function apiCommand(options) {
  if (!(await isGitRepo())) {
    console.log(chalk.red('❌ Not a git repository.'));
    process.exit(1);
  }

  console.log(chalk.cyan.bold('\n🧪 GitPal API Tester\n'));

  // Find endpoints
  const scanSpinner = ora('Scanning codebase for API endpoints...').start();
  const endpoints = findEndpoints(process.cwd());

  if (endpoints.length === 0) {
    scanSpinner.warn('No API endpoints found automatically.');
    console.log(chalk.dim('\nMake sure you have Express/NestJS routes in your project.'));

    // Ask for manual input
    const { manual } = await inquirer.prompt([{
      type: 'input',
      name: 'manual',
      message: 'Enter endpoint manually (e.g. GET /api/users):',
    }]);

    if (!manual) process.exit(1);
    const parts = manual.split(' ');
    endpoints.push({ method: parts[0], path: parts[1], file: 'manual', type: 'manual' });
  } else {
    scanSpinner.succeed(`Found ${endpoints.length} endpoints!`);
  }

  // Show found endpoints
  console.log(chalk.bold('\n📍 Endpoints found:\n'));
  endpoints.forEach((ep, i) => {
    const methodColor = {
      GET: chalk.green,
      POST: chalk.blue,
      PUT: chalk.yellow,
      DELETE: chalk.red,
      PATCH: chalk.magenta,
    }[ep.method] || chalk.white;
    console.log(`  ${i + 1}. ${methodColor(ep.method.padEnd(8))} ${ep.path} ${chalk.dim(`(${ep.file})`)}`);
  });

  // Get base URL
  const { baseUrl } = await inquirer.prompt([{
    type: 'input',
    name: 'baseUrl',
    message: '\nEnter your API base URL:',
    default: 'http://localhost:3000',
  }]);

  // Choose what to do
  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: 'What would you like to do?',
    choices: [
      { name: '🧪 Test all endpoints', value: 'test' },
      { name: '🔒 Security scan only', value: 'security' },
      { name: '📄 Generate API documentation', value: 'docs' },
      { name: '❌ Exit', value: 'exit' },
    ],
  }]);

  if (action === 'exit') return;
  if (action === 'test') await testAllEndpoints(endpoints, baseUrl);
  if (action === 'security') await securityScan(endpoints);
  if (action === 'docs') await generateDocs(endpoints);
}

// ─── TEST ALL ENDPOINTS ───────────────────────────────────────────────────────

async function testAllEndpoints(endpoints, baseUrl) {
  console.log(chalk.bold('\n🧪 Testing all endpoints...\n'));

  const results = [];

  for (const endpoint of endpoints) {
    const spinner = ora(`Testing ${endpoint.method} ${endpoint.path}...`).start();
    const result = await testEndpoint(baseUrl, endpoint);

    if (result.error) {
      spinner.fail(chalk.red(`${endpoint.method} ${endpoint.path} — Connection failed`));
    } else if (!result.ok) {
      spinner.fail(chalk.red(`${endpoint.method} ${endpoint.path} — ${result.status} (${result.duration}ms)`));
    } else if (result.slow) {
      spinner.warn(chalk.yellow(`${endpoint.method} ${endpoint.path} — ${result.status} OK but SLOW (${result.duration}ms)`));
    } else {
      spinner.succeed(chalk.green(`${endpoint.method} ${endpoint.path} — ${result.status} OK (${result.duration}ms)`));
    }

    results.push({ ...endpoint, ...result });
  }

  // Summary
  const passed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;
  const slow = results.filter(r => r.slow).length;

  console.log(chalk.bold('\n📊 Test Summary:\n'));
  console.log(chalk.green(`  ✅ Passed: ${passed}`));
  console.log(chalk.red(`  ❌ Failed: ${failed}`));
  console.log(chalk.yellow(`  ⚠️  Slow:   ${slow}`));

  // AI analysis of failures
  if (failed > 0) {
    const aiSpinner = ora('AI analyzing failures...').start();
    const failedEndpoints = results.filter(r => !r.ok);

    try {
      const analysis = await askAI(`Analyze these failing API endpoints and suggest fixes:
${failedEndpoints.map(e => `${e.method} ${e.path} — Status: ${e.status} Error: ${e.error || 'HTTP Error'}`).join('\n')}

For each endpoint suggest:
1. Why it might be failing
2. How to fix it`);

      aiSpinner.succeed('Analysis ready!\n');
      console.log(chalk.bold('\n💡 AI Analysis:\n'));
      console.log(chalk.white(analysis));
    } catch (err) {
      aiSpinner.fail(chalk.dim('Could not analyze failures.'));
    }
  }
}

// ─── SECURITY SCAN ────────────────────────────────────────────────────────────

async function securityScan(endpoints) {
  const aiSpinner = ora('AI scanning endpoints for security issues...').start();

  try {
    const analysis = await askAI(`You are a security expert. Analyze these API endpoints for security vulnerabilities:

${endpoints.map(e => `${e.method} ${e.path} (in ${e.file})`).join('\n')}

Check for:
1. Missing authentication
2. Missing rate limiting
3. Exposed sensitive data in paths
4. SQL injection risks
5. Missing input validation

For each issue found:
ISSUE: [endpoint] — [vulnerability]
FIX: [how to fix it]`);

    aiSpinner.succeed('Security scan complete!\n');
    console.log(chalk.bold('\n🔒 Security Analysis:\n'));

    analysis.split('\n').forEach(line => {
      const t = line.trim();
      if (t.startsWith('ISSUE:')) {
        console.log(chalk.red(`  ❌ ${t.replace('ISSUE:', '').trim()}`));
      } else if (t.startsWith('FIX:')) {
        console.log(chalk.green(`     💡 Fix: ${t.replace('FIX:', '').trim()}\n`));
      } else if (t) {
        console.log(chalk.dim(`  ${t}`));
      }
    });
  } catch (err) {
    aiSpinner.fail(chalk.red(`Error: ${err.message}`));
  }
}

// ─── GENERATE DOCS ────────────────────────────────────────────────────────────

async function generateDocs(endpoints) {
  const aiSpinner = ora('Generating API documentation...').start();

  try {
    const docs = await askAI(`Generate clean API documentation for these endpoints:

${endpoints.map(e => `${e.method} ${e.path}`).join('\n')}

For each endpoint provide:
- Description
- Request body (if POST/PUT)
- Response format
- Example

Use markdown format.`);

    aiSpinner.succeed('Documentation ready!\n');

    const docsPath = 'API_DOCS.md';
    fs.writeFileSync(docsPath, `# API Documentation\n\nGenerated by GitPal on ${new Date().toLocaleString()}\n\n${docs}`);

    console.log(chalk.green(`\n✅ Documentation saved to: ${docsPath}`));
    console.log(chalk.dim('\nPreview:'));
    console.log(chalk.white(docs.slice(0, 500) + '...'));
  } catch (err) {
    aiSpinner.fail(chalk.red(`Error: ${err.message}`));
  }
}

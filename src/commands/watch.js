import chalk from 'chalk';
import { spawn } from 'child_process';
import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { askAI } from '../ai.js';

// ─── ERROR PATTERNS ───────────────────────────────────────────────────────────

const ERROR_PATTERNS = [
  /TypeError: .+/,
  /ReferenceError: .+/,
  /SyntaxError: .+/,
  /RangeError: .+/,
  /Error: .+/,
  /ENOENT: .+/,
  /ECONNREFUSED: .+/,
  /Cannot read propert.+/,
  /is not a function/,
  /is not defined/,
  /Cannot find module.+/,
  /UnhandledPromiseRejection.+/,
];

function isError(line) {
  return ERROR_PATTERNS.some(p => p.test(line));
}

// ─── FIND RELEVANT FILE ───────────────────────────────────────────────────────

function extractFileInfo(errorLines) {
  const filePattern = /at .+ \((.+):(\d+):\d+\)/;
  for (const line of errorLines) {
    const match = line.match(filePattern);
    if (match) {
      const filePath = match[1];
      const lineNum = match[2];
      if (!filePath.includes('node_modules') && fs.existsSync(filePath)) {
        return { filePath, lineNum: parseInt(lineNum) };
      }
    }
  }
  return null;
}

function readFileContext(filePath, lineNum, context = 5) {
  try {
    const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
    const start = Math.max(0, lineNum - context - 1);
    const end = Math.min(lines.length, lineNum + context);
    return lines.slice(start, end)
      .map((l, i) => `${start + i + 1}: ${l}`)
      .join('\n');
  } catch {
    return '';
  }
}

// ─── AI FIX ───────────────────────────────────────────────────────────────────

async function getAIFix(errorText, fileInfo) {
  let codeContext = '';
  if (fileInfo) {
    codeContext = readFileContext(fileInfo.filePath, fileInfo.lineNum);
  }

  const prompt = `You are a senior developer. Analyze this error and provide a fix.

ERROR:
${errorText}

${fileInfo ? `FILE: ${fileInfo.filePath} (around line ${fileInfo.lineNum})
CODE CONTEXT:
${codeContext}` : ''}

Respond in EXACTLY this format:
CAUSE: (one line — why this error happened)
FILE: (filename and line number if known)
FIX: (exact code fix — one or two lines max)
LEARN: (one line — what to remember to avoid this next time)`;

  return await askAI(prompt);
}

// ─── DISPLAY FIX ──────────────────────────────────────────────────────────────

function displayFix(fix, fileInfo) {
  console.log('\n' + chalk.red.bold('🚨 Error Detected by GitPal!\n'));
  console.log(chalk.dim('─'.repeat(50)));

  const lines = fix.split('\n');
  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('CAUSE:')) {
      console.log(chalk.yellow(`\n🐛 Cause: ${trimmed.replace('CAUSE:', '').trim()}`));
    } else if (trimmed.startsWith('FILE:')) {
      console.log(chalk.dim(`📍 Location: ${trimmed.replace('FILE:', '').trim()}`));
    } else if (trimmed.startsWith('FIX:')) {
      console.log(chalk.green(`\n✅ Fix:\n  ${trimmed.replace('FIX:', '').trim()}`));
    } else if (trimmed.startsWith('LEARN:')) {
      console.log(chalk.cyan(`\n💡 Learn: ${trimmed.replace('LEARN:', '').trim()}`));
    }
  });

  console.log(chalk.dim('\n─'.repeat(50)));

  if (fileInfo) {
    console.log(chalk.dim(`\nOpen file: code ${fileInfo.filePath}:${fileInfo.lineNum}`));
  }
  console.log('');
}

// ─── MAIN WATCH COMMAND ───────────────────────────────────────────────────────

export async function watchCommand(command, args, options) {
  if (!command) {
    console.log(chalk.red('❌ Please provide a command to watch.'));
    console.log(chalk.dim('\nExamples:'));
    console.log(chalk.cyan('  gitpal watch node index.js'));
    console.log(chalk.cyan('  gitpal watch npm start'));
    console.log(chalk.cyan('  gitpal watch npm test'));
    process.exit(1);
  }

  console.log(chalk.cyan.bold('\n👀 GitPal Watch Mode\n'));
  console.log(chalk.dim(`Running: ${command} ${args.join(' ')}`));
  console.log(chalk.dim('GitPal will detect and explain any errors automatically.\n'));
  console.log(chalk.dim('─'.repeat(50) + '\n'));

  const child = spawn(command, args, {
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: true,
  });

  let errorBuffer = [];
  let errorTimer = null;
  let isProcessingError = false;

  async function processError() {
    if (isProcessingError || errorBuffer.length === 0) return;
    isProcessingError = true;

    const errorText = errorBuffer.join('\n');
    const fileInfo = extractFileInfo(errorBuffer);

    const spinner = ora('GitPal analyzing error...').start();
    try {
      const fix = await getAIFix(errorText, fileInfo);
      spinner.stop();
      displayFix(fix, fileInfo);
    } catch (err) {
      spinner.fail(chalk.red(`Could not analyze error: ${err.message}`));
    }

    errorBuffer = [];
    isProcessingError = false;
  }

  // Watch stdout
  child.stdout.on('data', (data) => {
    const text = data.toString();
    process.stdout.write(text);

    const lines = text.split('\n');
    lines.forEach(line => {
      if (isError(line)) {
        errorBuffer.push(line);
        clearTimeout(errorTimer);
        errorTimer = setTimeout(processError, 500);
      }
    });
  });

  // Watch stderr
  child.stderr.on('data', (data) => {
    const text = data.toString();
    process.stderr.write(chalk.dim(text));

    const lines = text.split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        errorBuffer.push(line);
        clearTimeout(errorTimer);
        errorTimer = setTimeout(processError, 500);
      }
    });
  });

  child.on('close', (code) => {
    if (code !== 0) {
      setTimeout(async () => {
        if (errorBuffer.length > 0) {
          await processError();
        }
        console.log(chalk.dim(`\nProcess exited with code ${code}`));
      }, 600);
    } else {
      console.log(chalk.green('\n✅ Process completed successfully!'));
    }
  });

  child.on('error', (err) => {
    console.log(chalk.red(`\n❌ Could not start process: ${err.message}`));
  });
}

// lazy import for ora
async function ora(text) {
  const { default: Ora } = await import('ora');
  return Ora(text).start();
}

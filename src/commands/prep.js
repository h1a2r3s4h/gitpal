import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import { isGitRepo, getRecentCommits, getCurrentBranch } from '../git.js';
import { askAI } from '../ai.js';

// ─── READ PROJECT INFO ────────────────────────────────────────────────────────

function getProjectInfo() {
  const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
  const files = [];

  function walk(dir, ignore = ['node_modules', '.git', 'dist', 'build']) {
    try {
      fs.readdirSync(dir).forEach(entry => {
        if (ignore.includes(entry)) return;
        const fullPath = path.join(dir, entry);
        if (fs.statSync(fullPath).isDirectory()) {
          walk(fullPath, ignore);
        } else if (['.js', '.ts', '.jsx', '.tsx'].includes(path.extname(entry))) {
          files.push(fullPath.replace(process.cwd(), ''));
        }
      });
    } catch {}
  }

  walk(process.cwd());
  return { pkg, files };
}

function readKeyFiles(files) {
  return files.slice(0, 8).map(f => {
    try {
      return { path: f, content: fs.readFileSync(path.join(process.cwd(), f), 'utf-8').slice(0, 500) };
    } catch {
      return null;
    }
  }).filter(Boolean);
}

// ─── COMPANY QUESTIONS ────────────────────────────────────────────────────────

const COMPANY_FOCUS = {
  google: 'Focus on system design, scalability, algorithms, data structures, and clean code architecture.',
  amazon: 'Focus on leadership principles, problem solving, ownership mindset, and customer obsession.',
  microsoft: 'Focus on technical depth, coding patterns, teamwork, and growth mindset.',
  startup: 'Focus on practical skills, shipping fast, problem solving, and full stack capabilities.',
  default: 'Focus on technical skills, problem solving, project explanation, and practical experience.',
};

// ─── MAIN PREP COMMAND ────────────────────────────────────────────────────────

export async function prepCommand(options) {
  if (!(await isGitRepo())) {
    console.log(chalk.red('❌ Not a git repository.'));
    process.exit(1);
  }

  console.log(chalk.cyan.bold('\n🎯 GitPal Interview Preparation\n'));

  // Gather project info
  const spinner = ora('Analyzing your project for interview prep...').start();

  let projectInfo, commits, keyFiles;
  try {
    projectInfo = getProjectInfo();
    commits = await getRecentCommits(20);
    keyFiles = readKeyFiles(projectInfo.files);
    spinner.succeed('Project analyzed!');
  } catch (err) {
    spinner.fail(chalk.red(`Error: ${err.message}`));
    process.exit(1);
  }

  const company = options.company?.toLowerCase() || 'default';
  const companyFocus = COMPANY_FOCUS[company] || COMPANY_FOCUS.default;

  const aiSpinner = ora('Generating interview preparation report...').start();

  const prompt = `You are an expert interview coach preparing a developer for a technical interview.

PROJECT DETAILS:
Name: ${projectInfo.pkg.name}
Version: ${projectInfo.pkg.version}
Description: ${projectInfo.pkg.description || 'Not provided'}
Dependencies: ${Object.keys(projectInfo.pkg.dependencies || {}).join(', ')}
Total files: ${projectInfo.files.length}

RECENT COMMITS:
${commits.slice(0, 10).join('\n')}

KEY FILES:
${keyFiles.map(f => `${f.path}:\n${f.content}`).join('\n\n')}

COMPANY FOCUS: ${companyFocus}

Generate a COMPLETE interview preparation report in EXACTLY this format:

ELEVATOR_PITCH:
(A 30-second pitch about this project — confident, clear, impressive)

PROJECT_SUMMARY:
(3-4 lines describing the project for an interviewer)

TECHNICAL_QUESTIONS:
Q1: (question)
A1: (answer)
Q2: (question)
A2: (answer)
Q3: (question)
A3: (answer)
Q4: (question)
A4: (answer)
Q5: (question)
A5: (answer)

WOW_MOMENTS:
- (impressive talking point 1)
- (impressive talking point 2)
- (impressive talking point 3)

WEAK_POINTS:
- WEAK: (potential weakness)
  DEFEND: (how to answer it confidently)
- WEAK: (potential weakness)
  DEFEND: (how to answer it confidently)

NEXT_STEPS:
- (what you would add next — shows growth mindset)
- (another improvement)

CONFIDENCE_SCORE: X/10
TIPS: (2-3 specific tips for this interview)`;

  let report;
  try {
    report = await askAI(prompt);
    aiSpinner.succeed('Interview prep ready!\n');
  } catch (err) {
    aiSpinner.fail(chalk.red(`AI Error: ${err.message}`));
    process.exit(1);
  }

  // Display report
  displayPrepReport(report, company);

  // Ask what to do next
  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: 'What would you like to do next?',
    choices: [
      { name: '🎤 Start mock interview', value: 'mock' },
      { name: '💾 Save report to file', value: 'save' },
      { name: '❌ Exit', value: 'exit' },
    ],
  }]);

  if (action === 'mock') await mockInterview(report);
  if (action === 'save') saveReport(report, projectInfo.pkg.name);
}

// ─── DISPLAY REPORT ───────────────────────────────────────────────────────────

function displayPrepReport(report, company) {
  const lines = report.split('\n');
  let section = '';

  if (company !== 'default') {
    console.log(chalk.dim(`Prepared for: ${company.toUpperCase()} interview\n`));
  }

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    if (trimmed.startsWith('ELEVATOR_PITCH:')) {
      section = 'pitch';
      console.log(chalk.bold.cyan('\n🎤 Your Elevator Pitch (say this first):\n'));
    } else if (trimmed.startsWith('PROJECT_SUMMARY:')) {
      section = 'summary';
      console.log(chalk.bold.cyan('\n📖 Project Summary:\n'));
    } else if (trimmed.startsWith('TECHNICAL_QUESTIONS:')) {
      section = 'questions';
      console.log(chalk.bold.cyan('\n❓ Technical Questions You Will Be Asked:\n'));
    } else if (trimmed.startsWith('WOW_MOMENTS:')) {
      section = 'wow';
      console.log(chalk.bold.cyan('\n🔥 Wow Moments (say these to impress):\n'));
    } else if (trimmed.startsWith('WEAK_POINTS:')) {
      section = 'weak';
      console.log(chalk.bold.cyan('\n⚠️  Weak Points & How to Defend Them:\n'));
    } else if (trimmed.startsWith('NEXT_STEPS:')) {
      section = 'next';
      console.log(chalk.bold.cyan('\n🚀 What You Would Add Next:\n'));
    } else if (trimmed.startsWith('CONFIDENCE_SCORE:')) {
      const score = trimmed.replace('CONFIDENCE_SCORE:', '').trim();
      console.log(chalk.bold.cyan('\n📊 Confidence Score: ') + chalk.yellow.bold(score));
    } else if (trimmed.startsWith('TIPS:')) {
      section = 'tips';
      console.log(chalk.bold.cyan('\n💡 Interview Tips:\n'));
    } else if (trimmed.match(/^Q\d+:/)) {
      console.log(chalk.yellow(`\n  ${trimmed}`));
    } else if (trimmed.match(/^A\d+:/)) {
      console.log(chalk.white(`  ${trimmed}\n`));
    } else if (trimmed.startsWith('- WEAK:')) {
      console.log(chalk.red(`\n  ❌ ${trimmed.replace('- WEAK:', '').trim()}`));
    } else if (trimmed.startsWith('DEFEND:')) {
      console.log(chalk.green(`  ✅ ${trimmed.replace('DEFEND:', '').trim()}`));
    } else if (trimmed.startsWith('- ')) {
      if (section === 'wow') {
        console.log(chalk.green(`  ⭐ ${trimmed.replace('- ', '')}`));
      } else {
        console.log(chalk.white(`  ${trimmed}`));
      }
    } else {
      console.log(chalk.white(`  ${trimmed}`));
    }
  });

  console.log('');
}

// ─── MOCK INTERVIEW ───────────────────────────────────────────────────────────

async function mockInterview(prepReport) {
  console.log(chalk.cyan.bold('\n🎤 Mock Interview Mode\n'));
  console.log(chalk.dim('Answer each question as if you are in a real interview.'));
  console.log(chalk.dim('GitPal will rate your answer and suggest improvements.\n'));

  const questions = [
    'Tell me about yourself and your GitPal project.',
    'What was the most challenging part of building GitPal?',
    'Why did you choose to support 4 AI providers?',
    'How would you scale GitPal to handle 10,000 users?',
    'What would you add to GitPal next?',
  ];

  for (let i = 0; i < questions.length; i++) {
    console.log(chalk.yellow.bold(`\nQ${i + 1}: ${questions[i]}`));

    const { answer } = await inquirer.prompt([{
      type: 'input',
      name: 'answer',
      message: 'Your answer:',
    }]);

    if (!answer.trim()) {
      console.log(chalk.dim('Skipped.'));
      continue;
    }

    const ratingSpinner = ora('Rating your answer...').start();

    try {
      const rating = await askAI(`You are an interview coach. Rate this answer out of 10 and suggest improvement.

Question: ${questions[i]}
Answer: ${answer}

Context about the project: ${prepReport.slice(0, 500)}

Respond in EXACTLY this format:
SCORE: X/10
GOOD: (what was good about the answer)
IMPROVE: (what to add or change)
BETTER_ANSWER: (a stronger version of their answer in 2-3 sentences)`);

      ratingSpinner.stop();

      const rLines = rating.split('\n');
      rLines.forEach(line => {
        const t = line.trim();
        if (t.startsWith('SCORE:')) {
          const score = t.replace('SCORE:', '').trim();
          const num = parseInt(score);
          const color = num >= 8 ? chalk.green : num >= 6 ? chalk.yellow : chalk.red;
          console.log(color.bold(`\n  ⭐ Score: ${score}`));
        } else if (t.startsWith('GOOD:')) {
          console.log(chalk.green(`  ✅ ${t.replace('GOOD:', '').trim()}`));
        } else if (t.startsWith('IMPROVE:')) {
          console.log(chalk.yellow(`  💡 ${t.replace('IMPROVE:', '').trim()}`));
        } else if (t.startsWith('BETTER_ANSWER:')) {
          console.log(chalk.cyan(`\n  📝 Stronger answer:\n  "${t.replace('BETTER_ANSWER:', '').trim()}"`));
        }
      });
    } catch (err) {
      ratingSpinner.fail(chalk.red(`Rating error: ${err.message}`));
    }

    if (i < questions.length - 1) {
      const { cont } = await inquirer.prompt([{
        type: 'confirm',
        name: 'cont',
        message: 'Next question?',
        default: true,
      }]);
      if (!cont) break;
    }
  }

  console.log(chalk.green.bold('\n✅ Mock interview complete! You are ready.\n'));
}

// ─── SAVE REPORT ──────────────────────────────────────────────────────────────

function saveReport(report, projectName) {
  const reportPath = `gitpal-prep-${projectName}-${Date.now()}.txt`;
  fs.writeFileSync(reportPath, `GitPal Interview Prep Report\nGenerated: ${new Date().toLocaleString()}\n\n${report}`);
  console.log(chalk.green(`\n✅ Report saved to: ${reportPath}`));
}

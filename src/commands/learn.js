import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { askAI } from '../ai.js';

// ─── PROGRESS STORAGE ─────────────────────────────────────────────────────────

const PROGRESS_PATH = path.join(os.homedir(), '.gitpal-progress.json');

function loadProgress() {
  if (!fs.existsSync(PROGRESS_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2));
}

function updateProgress(file, score, total) {
  const progress = loadProgress();
  if (!progress[file]) progress[file] = { score: 0, total: 0, attempts: 0 };
  progress[file].score = Math.max(progress[file].score, score);
  progress[file].total = total;
  progress[file].attempts += 1;
  progress[file].lastStudied = new Date().toISOString();
  saveProgress(progress);
}

// ─── MAIN COMMAND ─────────────────────────────────────────────────────────────

export async function learnCommand(target, options) {
  if (!target || target === 'progress') {
    await showProgress();
    return;
  }

  if (!fs.existsSync(target)) {
    console.log(chalk.red(`❌ File not found: ${target}`));
    console.log(chalk.dim('\nExamples:'));
    console.log(chalk.cyan('  gitpal learn src/commands/commit.js'));
    console.log(chalk.cyan('  gitpal learn src/ai.js'));
    console.log(chalk.cyan('  gitpal learn progress'));
    process.exit(1);
  }

  const code = fs.readFileSync(target, 'utf-8');
  if (!code.trim()) {
    console.log(chalk.yellow('⚠️  File is empty.'));
    process.exit(1);
  }

  console.log(chalk.cyan.bold(`\n📚 GitPal Learn — ${path.basename(target)}\n`));

  if (options.quiz) {
    await quizMode(target, code);
  } else if (options.challenge) {
    await challengeMode(target, code);
  } else {
    await learnMode(target, code);
  }
}

// ─── MODE 1: LEARN ────────────────────────────────────────────────────────────

async function learnMode(target, code) {
  const spinner = ora('AI is reading and explaining your code...').start();
  const fileName = path.basename(target);

  const prompt = `You are an expert coding teacher explaining code to a student preparing for job interviews.

Analyze this file: ${fileName}

Provide explanation in this EXACT format:

OVERVIEW:
(2-3 sentences explaining what this file does)

KEY CONCEPTS:
(List 3-5 concepts used with simple explanations)

LINE BY LINE:
(Explain 8 most important lines. Format each as:
Line X: [code]
Meaning: [simple explanation])

HOW IT CONNECTS:
(How this file connects to the rest of the project)

INTERVIEW QUESTIONS:
1. [question]
2. [question]
3. [question]
4. [question]
5. [question]

COMMON MISTAKES:
(3 mistakes developers make with this type of code)

ONE LINE SUMMARY:
(One sentence summary)

Code:
${code.slice(0, 4000)}`;

  let explanation;
  try {
    explanation = await askAI(prompt);
    spinner.succeed('Explanation ready!\n');
  } catch (err) {
    spinner.fail(chalk.red(`AI Error: ${err.message}`));
    process.exit(1);
  }

  const sections = explanation.split('\n');
  sections.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) { console.log(''); return; }

    if (trimmed.startsWith('OVERVIEW:')) {
      console.log(chalk.blue.bold('\n📖 Overview'));
      console.log(chalk.dim('─'.repeat(50)));
    } else if (trimmed.startsWith('KEY CONCEPTS:')) {
      console.log(chalk.blue.bold('\n💡 Key Concepts'));
      console.log(chalk.dim('─'.repeat(50)));
    } else if (trimmed.startsWith('LINE BY LINE:')) {
      console.log(chalk.blue.bold('\n🔍 Line by Line'));
      console.log(chalk.dim('─'.repeat(50)));
    } else if (trimmed.startsWith('HOW IT CONNECTS:')) {
      console.log(chalk.blue.bold('\n🔗 How It Connects'));
      console.log(chalk.dim('─'.repeat(50)));
    } else if (trimmed.startsWith('INTERVIEW QUESTIONS:')) {
      console.log(chalk.blue.bold('\n🎯 Interview Questions'));
      console.log(chalk.dim('─'.repeat(50)));
    } else if (trimmed.startsWith('COMMON MISTAKES:')) {
      console.log(chalk.blue.bold('\n⚠️  Common Mistakes'));
      console.log(chalk.dim('─'.repeat(50)));
    } else if (trimmed.startsWith('ONE LINE SUMMARY:')) {
      console.log(chalk.blue.bold('\n✨ One Line Summary'));
      console.log(chalk.dim('─'.repeat(50)));
    } else if (trimmed.startsWith('Line ')) {
      console.log(chalk.cyan(`\n  ${trimmed}`));
    } else if (trimmed.startsWith('Meaning:')) {
      console.log(chalk.white(`  ${trimmed}`));
    } else if (/^\d+\./.test(trimmed)) {
      console.log(chalk.yellow(`  ${trimmed}`));
    } else {
      console.log(chalk.white(`  ${trimmed}`));
    }
  });

  console.log('\n');

  const { next } = await inquirer.prompt([{
    type: 'list',
    name: 'next',
    message: 'What would you like to do next?',
    choices: [
      { name: '🧪 Take a quiz to test yourself', value: 'quiz' },
      { name: '🎯 Try a coding challenge', value: 'challenge' },
      { name: '📊 See my overall progress', value: 'progress' },
      { name: '✅ Mark as complete', value: 'complete' },
      { name: '❌ Exit', value: 'exit' },
    ],
  }]);

  if (next === 'quiz') await quizMode(target, code);
  else if (next === 'challenge') await challengeMode(target, code);
  else if (next === 'progress') await showProgress();
  else if (next === 'complete') {
    updateProgress(path.basename(target), 5, 5);
    console.log(chalk.green.bold('\n✅ Marked as complete! Great work!\n'));
  }
}

// ─── MODE 2: QUIZ ─────────────────────────────────────────────────────────────

async function quizMode(target, code) {
  const fileName = path.basename(target);
  console.log(chalk.yellow.bold(`\n🧪 Quiz Mode — ${fileName}\n`));
  console.log(chalk.dim('Answer 5 questions to test your understanding.\n'));

  const spinner = ora('Generating quiz questions...').start();

  const prompt = `Generate exactly 5 quiz questions about this code for a developer interview.

Rules:
- Questions must be specific to THIS code
- Mix easy and hard questions
- Each question must have 4 options (A, B, C, D)
- Mark the correct answer clearly

Format EXACTLY like this for EACH question:
Q1: [question]
A: [option]
B: [option]
C: [option]
D: [option]
ANSWER: [A/B/C/D]
EXPLANATION: [why correct in simple words]

Q2: [question]
A: [option]
...and so on

Code (${fileName}):
${code.slice(0, 3000)}`;

  let quizContent;
  try {
    quizContent = await askAI(prompt);
    spinner.succeed('Quiz ready!\n');
  } catch (err) {
    spinner.fail(chalk.red(`AI Error: ${err.message}`));
    process.exit(1);
  }

  const questions = parseQuestions(quizContent);

  if (questions.length === 0) {
    console.log(chalk.yellow('Could not generate quiz. Try again.'));
    return;
  }

  let score = 0;
  const total = questions.length;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    console.log(chalk.bold(`\nQuestion ${i + 1}/${total}:`));
    console.log(chalk.white(q.question));
    console.log('');

    const { answer } = await inquirer.prompt([{
      type: 'list',
      name: 'answer',
      message: 'Your answer:',
      choices: q.options.map(opt => ({ name: opt, value: opt[0] })),
    }]);

    if (answer === q.correct) {
      score++;
      console.log(chalk.green.bold('✅ Correct!'));
    } else {
      console.log(chalk.red.bold(`❌ Wrong! Correct: ${q.correct}`));
    }
    if (q.explanation) {
      console.log(chalk.dim(`💡 ${q.explanation}`));
    }
  }

  console.log('\n' + chalk.bold('─'.repeat(50)));
  console.log(chalk.bold(`\n📊 Score: ${score}/${total}`));

  const percentage = Math.round((score / total) * 100);

  if (score === total) {
    console.log(chalk.green.bold('🏆 Perfect! You fully understand this file!'));
  } else if (percentage >= 80) {
    console.log(chalk.green('🎉 Great job! Almost perfect!'));
  } else if (percentage >= 60) {
    console.log(chalk.yellow('👍 Good effort! Review the explanations.'));
  } else {
    console.log(chalk.red('📚 Need more study. Run gitpal learn on this file again.'));
  }

  updateProgress(path.basename(target), score, total);
  console.log(chalk.dim(`\nProgress saved: ${percentage}% for ${path.basename(target)}`));

  if (score >= 4) {
    console.log(chalk.green.bold('\n✅ Interview ready for this file!\n'));
  } else {
    console.log(chalk.yellow(`\n📚 Run: gitpal learn ${target}\n`));
  }
}

// ─── MODE 3: CHALLENGE ────────────────────────────────────────────────────────

async function challengeMode(target, code) {
  const fileName = path.basename(target);
  console.log(chalk.magenta.bold(`\n🎯 Challenge Mode — ${fileName}\n`));

  const spinner = ora('Generating coding challenge...').start();

  const prompt = `Create ONE coding challenge based on this file for a junior developer.

The challenge should:
- Be based on ACTUAL code in this file
- Ask them to ADD or MODIFY a small feature
- Be completable in 15-30 minutes

Format EXACTLY like this:
CHALLENGE TITLE: [title]
DIFFICULTY: Easy / Medium / Hard
TIME: X minutes

WHAT TO BUILD:
[Clear description]

HINTS:
1. [hint]
2. [hint]
3. [hint]

STARTING POINT:
[Which function/line to start from]

SUCCESS CRITERIA:
[How they know they completed it]

WHAT YOU LEARN:
[What skill this teaches]

Code:
${code.slice(0, 3000)}`;

  let challenge;
  try {
    challenge = await askAI(prompt);
    spinner.succeed('Challenge ready!\n');
  } catch (err) {
    spinner.fail(chalk.red(`AI Error: ${err.message}`));
    process.exit(1);
  }

  const lines = challenge.split('\n');
  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) { console.log(''); return; }

    if (trimmed.startsWith('CHALLENGE TITLE:')) {
      console.log(chalk.magenta.bold(`\n🎯 ${trimmed.replace('CHALLENGE TITLE:', '').trim()}`));
    } else if (trimmed.startsWith('DIFFICULTY:')) {
      const diff = trimmed.replace('DIFFICULTY:', '').trim();
      const color = diff === 'Easy' ? chalk.green : diff === 'Medium' ? chalk.yellow : chalk.red;
      console.log(color.bold(`⚡ Difficulty: ${diff}`));
    } else if (trimmed.startsWith('TIME:')) {
      console.log(chalk.dim(`⏱️  ${trimmed}`));
    } else if (trimmed.startsWith('WHAT TO BUILD:')) {
      console.log(chalk.bold('\n📋 What to build:'));
      console.log(chalk.dim('─'.repeat(50)));
    } else if (trimmed.startsWith('HINTS:')) {
      console.log(chalk.bold('\n💡 Hints:'));
      console.log(chalk.dim('─'.repeat(50)));
    } else if (trimmed.startsWith('STARTING POINT:')) {
      console.log(chalk.bold('\n📍 Starting point:'));
      console.log(chalk.dim('─'.repeat(50)));
    } else if (trimmed.startsWith('SUCCESS CRITERIA:')) {
      console.log(chalk.bold('\n✅ You succeeded when:'));
      console.log(chalk.dim('─'.repeat(50)));
    } else if (trimmed.startsWith('WHAT YOU LEARN:')) {
      console.log(chalk.bold('\n🎓 What you learn:'));
      console.log(chalk.dim('─'.repeat(50)));
    } else {
      console.log(chalk.white(`  ${trimmed}`));
    }
  });

  console.log('\n');

  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: 'What would you like to do?',
    choices: [
      { name: '💪 Start the challenge', value: 'start' },
      { name: '🧪 Take quiz instead', value: 'quiz' },
      { name: '❌ Exit', value: 'exit' },
    ],
  }]);

  if (action === 'start') {
    console.log(chalk.green.bold('\n🚀 Good luck! Open the file and start coding.\n'));
    console.log(chalk.cyan(`code ${target}`));
    console.log(chalk.dim('\nWhen done run: gitpal review to check your work!\n'));
  } else if (action === 'quiz') {
    await quizMode(target, code);
  }
}

// ─── PROGRESS DISPLAY ─────────────────────────────────────────────────────────

async function showProgress() {
  const progress = loadProgress();
  const files = Object.keys(progress);

  console.log(chalk.bold.cyan('\n📊 Your Learning Progress\n'));
  console.log(chalk.dim('─'.repeat(50)));

  if (files.length === 0) {
    console.log(chalk.yellow('No progress yet. Start with:'));
    console.log(chalk.cyan('gitpal learn src/commands/commit.js\n'));
    return;
  }

  let totalScore = 0;
  let totalPossible = 0;

  files.forEach(file => {
    const p = progress[file];
    const percentage = Math.round((p.score / p.total) * 100);
    const filled = Math.round(percentage / 10);
    const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
    const color = percentage >= 80 ? chalk.green : percentage >= 60 ? chalk.yellow : chalk.red;
    const status = percentage === 100 ? '✅' : percentage >= 80 ? '🎯' : percentage >= 60 ? '📚' : '❌';

    console.log(`${status} ${chalk.white(file.padEnd(30))} ${color(bar)} ${color(percentage + '%')}`);
    console.log(chalk.dim(`   Score: ${p.score}/${p.total} | Attempts: ${p.attempts}\n`));

    totalScore += p.score;
    totalPossible += p.total;
  });

  console.log(chalk.dim('─'.repeat(50)));

  const overallPercent = totalPossible > 0
    ? Math.round((totalScore / totalPossible) * 100)
    : 0;

  console.log(chalk.bold(`\n🎯 Interview Readiness: ${overallPercent}%\n`));

  if (overallPercent >= 80) {
    console.log(chalk.green.bold('✅ You are interview ready!'));
  } else if (overallPercent >= 60) {
    console.log(chalk.yellow('📚 Almost there — keep studying!'));
  } else {
    console.log(chalk.red('❌ Need more study before interview.'));
  }

  const notStudied = ['commit.js', 'ai.js', 'git.js', 'review.js']
    .filter(f => !files.includes(f));

  if (notStudied.length > 0) {
    console.log(chalk.dim(`\n💡 Study next: src/commands/${notStudied[0]}`));
    console.log(chalk.cyan(`gitpal learn src/commands/${notStudied[0]}\n`));
  }
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function parseQuestions(content) {
  const questions = [];
  const blocks = content.split(/Q\d+:/).filter(Boolean);

  blocks.forEach(block => {
    try {
      const lines = block.trim().split('\n').filter(Boolean);
      const question = lines[0]?.trim();
      const options = lines.filter(l => /^[A-D]:/.test(l.trim()));
      const answerLine = lines.find(l => l.trim().startsWith('ANSWER:'));
      const explanationLine = lines.find(l => l.trim().startsWith('EXPLANATION:'));

      if (question && options.length >= 2 && answerLine) {
        questions.push({
          question,
          options,
          correct: answerLine.replace('ANSWER:', '').trim(),
          explanation: explanationLine?.replace('EXPLANATION:', '').trim() || '',
        });
      }
    } catch {}
  });

  return questions;
}

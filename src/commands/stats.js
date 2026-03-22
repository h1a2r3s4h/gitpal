import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import path from 'path';
import simpleGit from 'simple-git';
import { isGitRepo } from '../git.js';
import { askAI } from '../ai.js';

const git = simpleGit();

// ─── GET ALL COMMITS ──────────────────────────────────────────────────────────

async function getAllCommits() {
  try {
    const log = await git.log({ maxCount: 100 });
    return log.all;
  } catch {
    return [];
  }
}

// ─── ANALYZE COMMITS ─────────────────────────────────────────────────────────

function analyzeCommits(commits) {
  const stats = {
    total: commits.length,
    byType: {},
    byDay: {},
    byHour: {},
    byAuthor: {},
    mostActiveDay: '',
    mostActiveHour: '',
    avgPerDay: 0,
  };

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  commits.forEach(commit => {
    // By type (conventional commits)
    const typeMatch = commit.message.match(/^(\w+)(\(.+\))?:/);
    const type = typeMatch ? typeMatch[1] : 'other';
    stats.byType[type] = (stats.byType[type] || 0) + 1;

    // By day
    const date = new Date(commit.date);
    const day = days[date.getDay()];
    stats.byDay[day] = (stats.byDay[day] || 0) + 1;

    // By hour
    const hour = date.getHours();
    const hourLabel = `${hour}:00`;
    stats.byHour[hourLabel] = (stats.byHour[hourLabel] || 0) + 1;

    // By author
    stats.byAuthor[commit.author_name] = (stats.byAuthor[commit.author_name] || 0) + 1;
  });

  // Most active day
  stats.mostActiveDay = Object.entries(stats.byDay)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';

  // Most active hour
  const topHour = Object.entries(stats.byHour)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';
  stats.mostActiveHour = topHour;

  // Avg per day
  const uniqueDays = new Set(commits.map(c => new Date(c.date).toDateString())).size;
  stats.avgPerDay = uniqueDays > 0 ? (commits.length / uniqueDays).toFixed(1) : 0;

  return stats;
}

// ─── GET FILE STATS ───────────────────────────────────────────────────────────

async function getFileStats() {
  try {
    const log = await git.log({ maxCount: 50 });
    const fileChanges = {};

    for (const commit of log.all.slice(0, 20)) {
      try {
        const diff = await git.show([commit.hash, '--stat', '--name-only']);
        const files = diff.split('\n')
          .filter(l => l.includes('.js') || l.includes('.ts') || l.includes('.jsx'))
          .map(l => l.trim().split(' ')[0]);

        files.forEach(f => {
          if (f) fileChanges[f] = (fileChanges[f] || 0) + 1;
        });
      } catch {}
    }

    return Object.entries(fileChanges)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  } catch {
    return [];
  }
}

// ─── DISPLAY STATS ────────────────────────────────────────────────────────────

function displayStats(stats, fileStats, aiInsights) {
  console.log(chalk.cyan.bold('\n📊 Your Coding Statistics\n'));
  console.log(chalk.dim('═'.repeat(50)));

  // Overview
  console.log(chalk.bold('\n🔢 Overview:\n'));
  console.log(chalk.white(`  Total commits:        ${chalk.cyan.bold(stats.total)}`));
  console.log(chalk.white(`  Avg commits/day:      ${chalk.cyan.bold(stats.avgPerDay)}`));
  console.log(chalk.white(`  Most active day:      ${chalk.cyan.bold(stats.mostActiveDay)}`));
  console.log(chalk.white(`  Most active time:     ${chalk.cyan.bold(stats.mostActiveHour)}`));

  // Commit types
  console.log(chalk.bold('\n📝 Commit Types:\n'));
  Object.entries(stats.byType)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      const bar = '█'.repeat(Math.min(count, 20));
      const typeColor = {
        feat: chalk.green,
        fix: chalk.red,
        docs: chalk.blue,
        refactor: chalk.magenta,
        test: chalk.yellow,
        chore: chalk.dim,
      }[type] || chalk.white;
      console.log(`  ${typeColor(type.padEnd(12))} ${bar} ${chalk.dim(count)}`);
    });

  // Most changed files
  if (fileStats.length > 0) {
    console.log(chalk.bold('\n📁 Most Changed Files:\n'));
    fileStats.forEach(([file, count], i) => {
      console.log(`  ${i + 1}. ${chalk.cyan(file)} ${chalk.dim(`(${count} changes)`)}`);
    });
  }

  // Activity by day
  console.log(chalk.bold('\n📅 Activity by Day:\n'));
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  days.forEach(day => {
    const count = stats.byDay[day] || 0;
    const bar = '▓'.repeat(Math.min(count, 20));
    const isEmpty = count === 0;
    console.log(`  ${day.padEnd(12)} ${isEmpty ? chalk.dim('░░░░░░░░░░') : chalk.cyan(bar)} ${chalk.dim(count)}`);
  });

  // AI Insights
  if (aiInsights) {
    console.log(chalk.bold('\n💡 AI Insights:\n'));
    aiInsights.split('\n').forEach(line => {
      if (line.trim()) console.log(chalk.white(`  ${line.trim()}`));
    });
  }

  console.log('');
}

// ─── MAIN STATS COMMAND ───────────────────────────────────────────────────────

export async function statsCommand(options) {
  if (!(await isGitRepo())) {
    console.log(chalk.red('❌ Not a git repository.'));
    process.exit(1);
  }

  const spinner = ora('Analyzing your coding patterns...').start();

  let commits, fileStats;
  try {
    commits = await getAllCommits();
    fileStats = await getFileStats();
    spinner.succeed(`Analyzed ${commits.length} commits.`);
  } catch (err) {
    spinner.fail(chalk.red(`Error: ${err.message}`));
    process.exit(1);
  }

  if (commits.length === 0) {
    console.log(chalk.yellow('\nNo commits found. Make some commits first!'));
    return;
  }

  const stats = analyzeCommits(commits);

  // AI insights
  const aiSpinner = ora('Generating AI insights...').start();
  let aiInsights = '';
  try {
    aiInsights = await askAI(`Analyze these coding statistics and give 3-4 personalized insights:

Total commits: ${stats.total}
Most active day: ${stats.mostActiveDay}
Most active time: ${stats.mostActiveHour}
Commit types: ${JSON.stringify(stats.byType)}
Avg commits per day: ${stats.avgPerDay}

Give practical, encouraging insights about:
1. Coding patterns
2. Productivity tips
3. What the stats suggest about working style
4. One specific improvement suggestion

Keep each insight to one line. Be encouraging and specific.`);
    aiSpinner.succeed('Insights ready!');
  } catch {
    aiSpinner.fail(chalk.dim('Could not generate AI insights.'));
  }

  displayStats(stats, fileStats, aiInsights);

  // Save stats if requested
  if (options.save) {
    const statsPath = `gitpal-stats-${Date.now()}.json`;
    fs.writeFileSync(statsPath, JSON.stringify({ stats, fileStats, generated: new Date().toISOString() }, null, 2));
    console.log(chalk.green(`✅ Stats saved to: ${statsPath}`));
  }
}

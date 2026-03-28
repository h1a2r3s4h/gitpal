import chalk from 'chalk';
import ora from 'ora';
import boxen from 'boxen';

let spinner;

export function startLoading(text = 'Processing...') {
  spinner = ora(chalk.cyan(text)).start();
}

export function stopLoadingSuccess(text = 'Done') {
  spinner?.succeed(chalk.green(text));
}

export function stopLoadingFail(text = 'Failed') {
  spinner?.fail(chalk.red(text));
}

export function showTitle(text) {
  console.log(
    boxen(chalk.bold.cyan(text), {
      padding: 1,
      borderStyle: 'round',
      borderColor: 'cyan',
    })
  );
}

export function showSection(title) {
  console.log(chalk.yellow.bold(`\n${title}\n`));
}

export function showList(items) {
  items.forEach((item, i) => {
    console.log(chalk.gray(`${i + 1}. ${item}`));
  });
}

export function showText(text) {
  console.log(chalk.white(text));
}

export function showError(text) {
  console.log(chalk.red(`❌ ${text}`));
}

export function showSuccess(text) {
  console.log(chalk.green(`✅ ${text}`));
}

export function showDiff(diffText) {
  const lines = diffText.split('\n');

  lines.forEach((line) => {
    if (line.startsWith('+')) {
      console.log(chalk.green(line));
    } else if (line.startsWith('-')) {
      console.log(chalk.red(line));
    } else {
      console.log(line);
    }
  });
}
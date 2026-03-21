import simpleGit from 'simple-git';

const git = simpleGit();

// Get staged diff (what you've git add-ed)
export async function getStagedDiff() {
  const diff = await git.diff(['--staged']);
  return diff;
}

// Get diff between current branch and base branch
export async function getBranchDiff(baseBranch = 'main') {
  const currentBranch = await getCurrentBranch();
  const diff = await git.diff([`${baseBranch}...${currentBranch}`]);
  return diff;
}

// Get last N commit messages
export async function getRecentCommits(n = 5) {
  const log = await git.log({ maxCount: parseInt(n) });
  return log.all.map(c => `${c.hash.slice(0, 7)} ${c.message}`);
}

// Get current branch name
export async function getCurrentBranch() {
  const status = await git.status();
  return status.current;
}

// Do the actual commit
export async function doCommit(message) {
  await git.commit(message);
}

// Check if we're inside a git repo
export async function isGitRepo() {
  try {
    await git.status();
    return true;
  } catch {
    return false;
  }
}

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';

const CONFIG_PATH = path.join(os.homedir(), '.gitpal.json');

function cleanConfig() {
  if (fs.existsSync(CONFIG_PATH)) {
    fs.unlinkSync(CONFIG_PATH);
  }
}

// ─── CONFIG TESTS ─────────────────────────────────────────────────────────────

describe('Config Management', () => {

  beforeEach(() => cleanConfig());
  afterEach(() => cleanConfig());

  test('loadConfig returns empty object when no config exists', async () => {
    const { loadConfig } = await import('../src/ai.js');
    const config = loadConfig();
    expect(config).toEqual({});
  });

  test('saveConfig saves provider and apiKey correctly', async () => {
    const { saveConfig, loadConfig } = await import('../src/ai.js');
    saveConfig({ provider: 'groq', apiKey: 'test-key-123' });
    const config = loadConfig();
    expect(config.provider).toBe('groq');
    expect(config.apiKey).toBe('test-key-123');
  });

  test('saveConfig overwrites existing config', async () => {
    const { saveConfig, loadConfig } = await import('../src/ai.js');
    saveConfig({ provider: 'openai', apiKey: 'old-key' });
    saveConfig({ provider: 'anthropic', apiKey: 'new-key' });
    const config = loadConfig();
    expect(config.provider).toBe('anthropic');
    expect(config.apiKey).toBe('new-key');
  });

  test('saveConfig supports all 4 providers', async () => {
    const { saveConfig, loadConfig } = await import('../src/ai.js');
    const providers = ['groq', 'openai', 'gemini', 'anthropic'];
    for (const provider of providers) {
      saveConfig({ provider, apiKey: `key-for-${provider}` });
      const config = loadConfig();
      expect(config.provider).toBe(provider);
    }
  });

  test('config file is created at correct path', async () => {
    const { saveConfig } = await import('../src/ai.js');
    saveConfig({ provider: 'groq', apiKey: 'test-key' });
    expect(fs.existsSync(CONFIG_PATH)).toBe(true);
  });

  test('config file contains valid JSON', async () => {
    const { saveConfig } = await import('../src/ai.js');
    saveConfig({ provider: 'groq', apiKey: 'test-key' });
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    expect(() => JSON.parse(raw)).not.toThrow();
  });

});

// ─── AI PROVIDER TESTS ────────────────────────────────────────────────────────

describe('AI Provider Validation', () => {

  beforeEach(() => cleanConfig());
  afterEach(() => cleanConfig());

  test('askAI throws error when no config exists', async () => {
    const { askAI } = await import('../src/ai.js');
    await expect(askAI('test prompt')).rejects.toThrow('No AI provider configured');
  });

  test('askAI throws error for unknown provider', async () => {
    const { saveConfig, askAI } = await import('../src/ai.js');
    saveConfig({ provider: 'unknownprovider', apiKey: 'test-key' });
    await expect(askAI('test prompt')).rejects.toThrow();
  });

  test('askAI throws error when apiKey is missing', async () => {
    const { saveConfig, askAI } = await import('../src/ai.js');
    saveConfig({ provider: 'groq', apiKey: '' });
    await expect(askAI('test prompt')).rejects.toThrow();
  });

});

// ─── GIT UTILITY TESTS ────────────────────────────────────────────────────────

describe('Git Utilities', () => {

test('isGitRepo returns a boolean', async () => {
  const { isGitRepo } = await import('../src/git.js');
  const result = await isGitRepo();
  expect(typeof result).toBe('boolean');
});

  test('isGitRepo returns true inside a git repo', async () => {
    const { isGitRepo } = await import('../src/git.js');
    const result = await isGitRepo();
    expect(result).toBe(true);
  });

  test('getRecentCommits returns an array', async () => {
    const { getRecentCommits } = await import('../src/git.js');
    const commits = await getRecentCommits(3);
    expect(Array.isArray(commits)).toBe(true);
  });

  test('getRecentCommits respects the limit', async () => {
    const { getRecentCommits } = await import('../src/git.js');
    const commits = await getRecentCommits(2);
    expect(commits.length).toBeLessThanOrEqual(2);
  });

  test('getCurrentBranch returns a string', async () => {
    const { getCurrentBranch } = await import('../src/git.js');
    const branch = await getCurrentBranch();
    expect(typeof branch).toBe('string');
    expect(branch.length).toBeGreaterThan(0);
  });

  test('getStagedDiff returns a string', async () => {
    const { getStagedDiff } = await import('../src/git.js');
    const diff = await getStagedDiff();
    expect(typeof diff).toBe('string');
  });

});

// ─── PACKAGE.JSON VALIDATION ──────────────────────────────────────────────────

describe('Package Configuration', () => {

  test('package.json has correct name', () => {
    const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
    expect(pkg.name).toBe('gitpal-cli');
  });

  test('package.json has bin field', () => {
    const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
    expect(pkg.bin).toBeDefined();
  });

  test('package.json has version', () => {
    const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
    expect(pkg.version).toBeDefined();
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test('package.json has required dependencies', () => {
    const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
    const required = ['commander', 'simple-git', 'chalk', 'ora', 'inquirer'];
    required.forEach(dep => {
      expect(pkg.dependencies).toHaveProperty(dep);
    });
  });

  test('bin/gitpal.js file exists and is not empty', () => {
    const binPath = './bin/gitpal.js';
    expect(fs.existsSync(binPath)).toBe(true);
    const content = fs.readFileSync(binPath, 'utf-8');
    expect(content.trim().length).toBeGreaterThan(0);
  });

});

// ─── COMMAND FILES EXIST ──────────────────────────────────────────────────────

describe('Command Files', () => {

  const commands = ['commit', 'summary', 'pr', 'changelog', 'config', 'review'];

  commands.forEach(cmd => {
    test(`src/commands/${cmd}.js exists`, () => {
      expect(fs.existsSync(`./src/commands/${cmd}.js`)).toBe(true);
    });

    test(`src/commands/${cmd}.js is not empty`, () => {
      const content = fs.readFileSync(`./src/commands/${cmd}.js`, 'utf-8');
      expect(content.trim().length).toBeGreaterThan(0);
    });
  });

  test('src/ai.js exists and is not empty', () => {
    const content = fs.readFileSync('./src/ai.js', 'utf-8');
    expect(content.trim().length).toBeGreaterThan(0);
  });

  test('src/git.js exists and is not empty', () => {
    const content = fs.readFileSync('./src/git.js', 'utf-8');
    expect(content.trim().length).toBeGreaterThan(0);
  });

  test('src/index.js exists and is not empty', () => {
    const content = fs.readFileSync('./src/index.js', 'utf-8');
    expect(content.trim().length).toBeGreaterThan(0);
  });

});

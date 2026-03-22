# 🤖 GitPal — AI Developer Teammate CLI

> Your AI-powered developer teammate that automates everything from writing code to deploying it.

[![npm version](https://img.shields.io/npm/v/gitpal-cli.svg?style=flat-square)](https://www.npmjs.com/package/gitpal-cli)
[![npm downloads](https://img.shields.io/npm/dm/gitpal-cli.svg?style=flat-square)](https://www.npmjs.com/package/gitpal-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?style=flat-square)](https://nodejs.org)

---

![GitPal Demo](demo.gif)

---

## 😤 The Problem Every Developer Faces

```bash
git add .
git commit -m "fix"        # 😭 lazy and meaningless
git commit -m "changes"    # 😭 tells nothing
git commit -m "update"     # 😭 useless history
```

**Your git log becomes a mess. Your team hates you. You hate yourself.**

---

## ✨ The Solution

```bash
git add .
gitpal commit

# ✔ Staged changes found.
# ✔ Commit message generated!
# Suggested: feat(auth): add bcrypt password hashing to login endpoint
# ? Use this message? › Yes
# ✅ Committed successfully!
```

**GitPal reads your actual code changes and writes the perfect commit message. Every time.**

---

## 🚀 Quick Start

```bash
# Install globally
npm install -g gitpal-cli

# Setup your AI provider (one time only — it's free!)
gitpal config

# Use in any project
cd your-project
git add .
gitpal commit
```

**That's it. You're done.**

---

## 🤖 Supports 4 AI Providers

| Provider | Model | Cost | Speed |
|---|---|---|---|
| **Groq** | llama-3.3-70b | 🆓 Free | ⚡ Fastest |
| **Google Gemini** | gemini-pro | 🆓 Free tier | ✅ Fast |
| **Anthropic** | claude-3-haiku | 💰 Free credits | ✅ Fast |
| **OpenAI** | gpt-3.5-turbo | 💰 Paid | ✅ Fast |

> 💡 Recommended: **Groq** — completely free, no credit card needed. Get your key at [console.groq.com](https://console.groq.com)

---

## 📖 All 16 Commands

### `gitpal commit` — AI Commit Messages
Reads your staged diff and generates a meaningful conventional commit message.

```bash
git add src/payment.js
gitpal commit

# ✔ Commit message generated!
# Suggested: feat(payment): integrate Razorpay with webhook support
# ? Use this message? › Yes / Edit / Cancel
# ✅ Committed!
```

**Options:** `--yes` Skip confirmation and commit directly

---

### `gitpal review` — AI Code Reviewer
Reviews your staged code for bugs, security issues and bad practices before you commit.

```bash
git add .
gitpal review

# 🐛 Bugs Found:
# - No error handling on login failure
# 🔒 Security Issues:
# - Password stored as plain text, use bcrypt
# 💡 Improvements:
# - Add input validation for username and password
# ❌ Verdict: Do not commit
```

**Options:** `--review-only` Only review, skip commit step

---

### `gitpal scan` — Full Codebase Security Scanner
Scans your entire project for security vulnerabilities, bugs and code quality issues — like a free alternative to Snyk and SonarQube.

```bash
gitpal scan

# 🔍 Scanning 24 files...
# ❌ CRITICAL  src/auth.js line 12 — Password stored as plain text
# 🔴 HIGH      src/api.js line 5  — API key hardcoded in source code
# 🟡 MEDIUM    src/payment.js line 34 — No error handling on async function
# ✅ Verdict: Fix 2 critical issues before deploying
```

**Options:** `--fix` Auto-fix safe issues | `--security` Security only | `--report` Save report

---

### `gitpal watch` — Auto Error Detection
Watches your running app and automatically detects, explains and fixes errors in real time. Zero copy paste needed.

```bash
gitpal watch node index.js

# Your app runs normally...
# Error appears → GitPal detects it automatically
#
# 🚨 Error Detected!
# 🐛 Cause: user object is undefined at line 34
# ✅ Fix: add null check → if (user && user.id)
# 💡 Learn: always check for null before accessing object properties
```

---

### `gitpal explain` — Explain Any Code
Explains any file, function or commit in plain English.

```bash
gitpal explain src/auth.js
gitpal explain src/auth.js --function login
gitpal explain a3f2c1

# 📖 Explaining file: auth.js
# This file handles all authentication logic.
# Main functions: login(), register(), verifyToken(), logout()
# Depends on: bcrypt, jsonwebtoken, User model
```

**Options:** `--function <name>` Explain a specific function

---

### `gitpal issue` — Open Source Contribution Assistant
Fetches any GitHub issue, analyzes your local codebase, and tells you exactly which file to change and how to fix it.

```bash
gitpal issue 624 --repo chalk/chalk

# ✔ Issue found: "$FORCE_COLOR works only as level 0 or 3"
# 📁 Files to change: source/index.js
# 🔧 How to fix: Add FORCE_COLOR validation in applyOptions()
# 📝 Commit: fix: handle $FORCE_COLOR environment variable correctly
# ? Create branch and generate PR description?
```

**Options:** `--repo <owner/repo>` GitHub repository

---

### `gitpal prep` — Interview Preparation
Analyzes your project and generates interview questions, answers, elevator pitch and mock interview.

```bash
gitpal prep
gitpal prep --company google
gitpal prep --mock

# 🎤 Your Elevator Pitch:
# "I built GitPal — an AI Developer Teammate..."
#
# ❓ Technical Questions You Will Be Asked:
# Q: How does gitpal commit work?
# A: It reads git diff --staged, sends to AI...
#
# 🔥 Wow Moments to mention...
# ⚠️  Weak Points and how to defend them...
```

**Options:** `--company <name>` Company-specific prep | `--mock` Start mock interview

---

### `gitpal api` — API Testing & Documentation
Auto-discovers all API endpoints from your codebase, tests them, checks security and generates documentation.

```bash
gitpal api

# 📍 Endpoints found:
# GET     /api/users
# POST    /api/login
# DELETE  /api/user/:id
#
# ? Test all / Security scan / Generate docs
```

---

### `gitpal deploy` — Deployment Pipeline
Runs a complete pre-deployment checklist and deploys to your chosen platform.

```bash
gitpal deploy

# ✅ Tests passed
# ✅ Build successful
# ✅ No console.logs found
# ✅ .env file is safe
# ? Deploy to: Vercel / Netlify / Heroku / npm
# ✅ Deployed successfully!
```

**Options:** `--vercel` `--netlify` `--heroku` `--npm` `--skip-tests`

---

### `gitpal stats` — Coding Statistics
Shows your coding patterns, productivity insights and AI analysis of your development habits.

```bash
gitpal stats

# 📊 Your Coding Statistics
# Total commits:     142
# Most active day:   Tuesday
# Most active time:  10:00
# Top commit type:   feat (67%)
# Most changed file: src/auth.js
# 💡 AI Insights: You code best on weekday mornings...
```

**Options:** `--save` Save stats to file

---

### `gitpal testgen` — Auto Generate Tests
Automatically generates comprehensive tests for any file using AI.

```bash
gitpal testgen src/auth.js
gitpal testgen    # finds all untested files

# 🧪 Generating tests for auth.js...
# ✅ Tests generated!
# Covers: login(), register(), verifyToken()
# Includes: happy path, edge cases, error cases
# ? Save to tests/auth.test.js?
```

---

### `gitpal summary` — Plain English Summary
Summarizes your recent commits in plain English.

```bash
gitpal summary --last 7

# 📋 Summary:
# • Built user authentication with JWT
# • Integrated payment gateway
# • Fixed cart calculation bug
```

**Options:** `--last <number>` Number of commits

---

### `gitpal pr` — Pull Request Descriptions
Generates a complete PR description from your branch diff.

```bash
gitpal pr --base main

# 📝 ## What changed / ## Why / ## How to test
```

**Options:** `--base <branch>` Base branch to compare

---

### `gitpal changelog` — Release Changelog
Auto-generates a formatted changelog from commit history.

```bash
gitpal changelog --ver 2.0.0

# 📄 ## [2.0.0] - 2026-03-22
# ### Features / ### Bug Fixes / ### Improvements
```

---

### `gitpal config` — Setup AI Provider
Interactive setup to configure your AI provider and API key.

```bash
gitpal config
# ? Choose provider: Groq / Anthropic / OpenAI / Gemini
# ? Enter API key: ****
# ✅ Configuration saved!
```

---

### `gitpal learn` — Learn Your Own Code
Deep learning mode — understand any part of your codebase with detailed explanations.

```bash
gitpal learn src/
# 📚 Learning your codebase...
# Explains architecture, patterns and relationships
```

---

## 🔄 Full Daily Workflow

```
Morning
  ↓
Write code
  ↓
gitpal watch node app.js     →  auto-detects errors instantly
  ↓
git add .
gitpal review                →  AI reviews for bugs
gitpal commit                →  AI writes commit message
  ↓
End of day
gitpal summary               →  see everything you built
  ↓
Ready to merge?
gitpal pr                    →  full PR description
  ↓
Before deploying?
gitpal scan                  →  security audit
gitpal deploy                →  deployment pipeline
  ↓
Interview tomorrow?
gitpal prep                  →  AI prepares you
```

---

## 💡 Why GitPal?

| Without GitPal | With GitPal |
|---|---|
| `git commit -m "fix"` | `feat(auth): add JWT token refresh logic` |
| 15 mins writing PR | Generated in 3 seconds |
| Confused by old code | Explained in plain English |
| Manual security audit | Full scan in seconds |
| Errors take hours to debug | Auto-detected and explained instantly |
| Unknown what to fix in open source | Exact file and fix shown |
| Deploy anxiety | Automated checklist every time |
| Interview panic | AI prepares you completely |

---

## 🗂 Project Structure

```
gitpal/
├── bin/
│   └── gitpal.js
├── src/
│   ├── index.js           ← Main CLI (Commander)
│   ├── ai.js              ← Multi-provider AI router
│   ├── git.js             ← Git operations
│   └── commands/
│       ├── commit.js      ← gitpal commit
│       ├── review.js      ← gitpal review
│       ├── scan.js        ← gitpal scan
│       ├── watch.js       ← gitpal watch
│       ├── explain.js     ← gitpal explain
│       ├── issue.js       ← gitpal issue
│       ├── prep.js        ← gitpal prep
│       ├── api.js         ← gitpal api
│       ├── deploy.js      ← gitpal deploy
│       ├── stats.js       ← gitpal stats
│       ├── testgen.js     ← gitpal testgen
│       ├── summary.js     ← gitpal summary
│       ├── pr.js          ← gitpal pr
│       ├── changelog.js   ← gitpal changelog
│       └── config.js      ← gitpal config
└── tests/
    └── ai.test.js
```

---

## 🛠 Local Development

```bash
git clone https://github.com/h1a2r3s4h/gitpal
cd gitpal
npm install
npm link
gitpal config
gitpal commit
```

---

## 🤝 Contributing

To add a new AI provider — open `src/ai.js`, add a `callProviderName()` function and add a case in `askAI()`. Submit a PR!

---

## 👨‍💻 Author

Built by **Harshit Gangwar**

- GitHub: [@h1a2r3s4h](https://github.com/h1a2r3s4h)
- npm: [gitpal-cli](https://www.npmjs.com/package/gitpal-cli)

---

## 📄 License

MIT — free to use, modify and distribute.

---

<p align="center">
  <strong>If GitPal saves you time, give it a ⭐ on GitHub!</strong>
</p>

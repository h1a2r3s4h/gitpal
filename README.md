# 🤖 GitPal — AI Developer Teammate CLI

> Automates everything from writing code to deploying it.

---

## 😤 The Problem Every Developer Faces

Every developer has been there — lazy, meaningless commit messages that tell nothing:

```bash
git add .
git commit -m "fix"        # 😭 meaningless
git commit -m "changes"    # 😭 tells nothing
git commit -m "update"     # 😭 useless history
```

**Your git log becomes a mess. Your team hates you. You hate yourself.**

---

## ✨ The Solution

GitPal reads your actual code changes and writes the perfect commit message. Every time.

```bash
git add .
gitpal commit

# ✔ Staged changes found.
# ✔ Commit message generated!
# Suggested: feat(auth): add bcrypt password hashing to login endpoint
# ? Use this message? › Yes
# ✅ Committed successfully!
```

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

## 🤖 Supported AI Providers

| Provider | Model | Cost | Speed |
|---|---|---|---|
| **Groq** *(Recommended)* | llama-3.3-70b | 🆓 Free | ⚡ Fastest |
| Google Gemini | gemini-pro | 🆓 Free tier | ✅ Fast |
| Anthropic | claude-3-haiku | 💰 Free credits | ✅ Fast |
| OpenAI | gpt-3.5-turbo | 💰 Paid | ✅ Fast |

💡 **Recommended:** Groq — completely free, no credit card needed. Get your key at [console.groq.com](https://console.groq.com)

---

## 📖 All 16 Commands

### Core Git Workflow

| Command | Description | Example Output |
|---|---|---|
| 💬 `gitpal commit` | AI Commit Messages | `feat(payment): integrate Razorpay with webhook support` |
| 🔍 `gitpal review` | AI Code Reviewer | `🔒 Security: Password stored as plain text, use bcrypt` |
| 📋 `gitpal summary` | Plain English Summary | `Built user authentication with JWT · Fixed cart bug` |
| 📝 `gitpal pr` | Pull Request Descriptions | `## What changed / ## Why / ## How to test` |
| 📄 `gitpal changelog` | Release Changelog | `## [2.0.0] - 2026-03-22  ### Features / ### Bug Fixes` |

### Security & Quality

| Command | Description | Example Output |
|---|---|---|
| 🛡️ `gitpal scan` | Full Codebase Security Scanner | `❌ CRITICAL src/auth.js line 12 — Password stored as plain text` |
| 👁️ `gitpal watch` | Auto Error Detection | `🚨 Error: user is undefined at line 34 → add null check` |
| 🧪 `gitpal testgen` | Auto Generate Tests | `Covers: login(), register(), verifyToken() + edge cases` |

### Code Understanding

| Command | Description | Example Output |
|---|---|---|
| 📖 `gitpal explain` | Explain Any Code | `gitpal explain src/auth.js --function login` |
| 📚 `gitpal learn` | Learn Your Codebase | `Explains architecture, patterns and relationships` |
| ❓ `gitpal ask` | Ask Questions About Your Code | `gitpal ask "How does authentication work?"` |

### GitHub & Open Source

| Command | Description | Example Output |
|---|---|---|
| 🐙 `gitpal issue` | Open Source Contribution Assistant | `gitpal issue 624 --repo chalk/chalk → exact file + fix` |
| 🔌 `gitpal api` | API Testing & Documentation | `Auto-discovers endpoints, tests them, generates docs` |

### Developer Productivity

| Command | Description | Example Output |
|---|---|---|
| 🚀 `gitpal deploy` | Deployment Pipeline | `✅ Tests ✅ Build ✅ No console.logs → Deploy to Vercel` |
| 📊 `gitpal stats` | Coding Statistics | `Most active: Tuesday 10:00 · Top type: feat (67%)` |
| 🎤 `gitpal prep` | Interview Preparation | `gitpal prep --company google --mock → full AI mock interview` |
| ⚙️ `gitpal config` | Setup AI Provider | `Choose: Groq / Anthropic / OpenAI / Gemini → Save key` |

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
gitpal prep                  →  AI prepares you completely
```

---

## 💡 Why GitPal?

| ❌ Without GitPal | ✅ With GitPal |
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

## 🛠 Tech Stack

| | Technology | Role |
|---|---|---|
| ⚙️ | **Node.js + JavaScript** | Core runtime and language |
| ⚙️ | **Commander.js** | CLI command handling and routing |
| 🤖 | **LLM Integration** | AI for commit, PR, summary, explanations, reviews |
| 🧠 | **RAG-style Code Understanding** | Intelligent codebase retrieval |
| 🔗 | **Git + GitHub API** | Deep integration for Git operations and issues |
| 🔀 | **Multi-provider AI Router** | Groq, Anthropic, OpenAI, Gemini support |

---

## 🗂 Project Structure

```
gitpal/
├── bin/
│   └── gitpal.js            ← CLI entry point
├── src/
│   ├── index.js             ← Main CLI (Commander)
│   ├── ai.js                ← Multi-provider AI router
│   ├── git.js               ← Git operations
│   ├── rag/
│   │   └── retrieveContext.js ← RAG code understanding
│   └── commands/
│       ├── commit.js   review.js   scan.js
│       ├── watch.js    explain.js  issue.js
│       ├── prep.js     api.js      deploy.js
│       ├── stats.js    testgen.js  summary.js
│       ├── pr.js       changelog.js learn.js
│       └── config.js   ask.js
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

## 🔮 Future Scope

- AI-generated fix patches
- GitHub PR auto-review comments
- MCP-based tool access
- Local code embeddings for better retrieval
- Team collaboration mode
- VS Code extension
- Smart release notes & CI/CD integration

---

## 👨‍💻 Built by Harshit Gangwar

**GitHub:** [@h1a2r3s4h](https://github.com/h1a2r3s4h) &nbsp;•&nbsp; **npm:** [gitpal-cli](https://www.npmjs.com/package/gitpal-cli)

⭐ **If GitPal saves you time, give it a star on GitHub!**

MIT License — free to use, modify and distribute.

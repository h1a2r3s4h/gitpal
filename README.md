# 🤖 GitPal — AI-Powered Git Assistant CLI
<!-- 
> Stop writing commit messages manually. Let AI do it in 3 seconds.

[![npm version](https://img.shields.io/npm/v/gitpal-cli.svg?style=flat-square)](https://www.npmjs.com/package/gitpal-cli)
[![npm downloads](https://img.shields.io/npm/dm/gitpal-cli.svg?style=flat-square)](https://www.npmjs.com/package/gitpal-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?style=flat-square)](https://nodejs.org) -->

---

## 😤 The Problem Every Developer Faces

```bash
# You just coded for 2 hours and now...
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
#
# Suggested: feat(auth): add bcrypt password hashing to login endpoint
#
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

Pick any one — all work perfectly:

| Provider | Model | Cost | Speed |
|---|---|---|---|
| **Groq** | llama-3.3-70b | 🆓 Free | ⚡ Fastest |
| **Google Gemini** | gemini-pro | 🆓 Free tier | ✅ Fast |
| **Anthropic** | claude-3-haiku | 💰 Free credits | ✅ Fast |
| **OpenAI** | gpt-3.5-turbo | 💰 Paid | ✅ Fast |

> 💡 Recommended for beginners: **Groq** — completely free, no credit card needed. Get your key at [console.groq.com](https://console.groq.com)

---

## 📖 All Commands

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

**Options:**
```bash
gitpal commit --yes    # Skip confirmation, commit directly
```

---

### `gitpal summary` — Plain English Summary
Summarizes your recent commits so you always know what you built.

```bash
gitpal summary --last 7

# 📋 Summary of last 7 commits:
# • Built user authentication system with JWT tokens
# • Integrated Razorpay payment gateway
# • Fixed cart total calculation for discounted items
# • Added dark mode to the dashboard
# • Improved API response time using Redis caching
```

**Options:**
```bash
gitpal summary --last 10    # Summarize last 10 commits
```

---

### `gitpal pr` — Pull Request Descriptions
Generates a complete PR description from your branch diff. Copy-paste straight into GitHub.

```bash
gitpal pr --base main

# 📝 Pull Request Description:
#
# ## What changed
# - Integrated Razorpay payment gateway
# - Added webhook handler for payment confirmation
# - Added retry logic for failed transactions
#
# ## Why
# - App needed real payment processing for production launch
#
# ## Type of change
# New feature
#
# ## Testing
# Use test card: 4111 1111 1111 1111
```

**Options:**
```bash
gitpal pr --base develop    # Compare against develop branch
```

---

### `gitpal changelog` — Release Changelog
Auto-generates a formatted changelog entry from your commit history.

```bash
gitpal changelog --ver 2.0.0

# 📄 CHANGELOG v2.0.0:
#
# ## [2.0.0] - 2026-03-21
#
# ### Features
# - Payment gateway integration
# - Dark mode support
# - User authentication system
#
# ### Bug Fixes
# - Fixed cart calculation for discounts
# - Fixed mobile layout on small screens
#
# ### Improvements
# - 40% faster API response time
# - Reduced bundle size by 20%
```

---

### `gitpal config` — Setup AI Provider
Interactive setup to configure your AI provider and API key.

```bash
gitpal config

# ? Choose your AI provider:
# ❯ Groq — llama3 (Free & Ultra Fast)
#   Anthropic (Claude)
#   OpenAI (GPT-3.5)
#   Google Gemini
#
# ? Enter your API key: ****************
# ✅ Configuration saved!
```

---

## 🔄 Full Daily Workflow

```
Morning — open your project
         ↓
Write some code (auth feature)
         ↓
git add .
gitpal commit  →  "feat(auth): add Google OAuth login"
         ↓
Write more code (fix a bug)
         ↓
git add .
gitpal commit  →  "fix(cart): resolve total miscalculation"
         ↓
End of day
gitpal summary  →  "Built OAuth, fixed cart bug, added tests"
         ↓
Ready to merge?
gitpal pr  →  Full PR description, copy to GitHub
         ↓
Releasing v2.0?
gitpal changelog --ver 2.0.0  →  Full changelog ready
```

---

## 💡 Why GitPal?

| Without GitPal | With GitPal |
|---|---|
| `git commit -m "fix"` | `feat(auth): add JWT token refresh logic` |
| Spend 15 mins on PR description | Generated in 3 seconds |
| Forget what you built last week | Plain English summary instantly |
| Write changelog manually | Auto-generated from commits |
| Works with one AI only | Works with 4 AI providers |

---

## 🗂 Project Structure

```
gitpal/
├── bin/
│   └── gitpal.js          ← CLI executable
├── src/
│   ├── index.js           ← Main CLI entry (Commander)
│   ├── ai.js              ← Multi-provider AI router
│   ├── git.js             ← Git operations
│   └── commands/
│       ├── commit.js      ← gitpal commit
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
# Clone the repo
git clone https://github.com/harshit_gangwar16/gitpal
cd gitpal

# Install dependencies
npm install

# Link globally for testing
npm link

# Configure AI provider
gitpal config

# Try it out
git add .
gitpal commit
```

---

## 🤝 Contributing

Contributions are welcome! To add a new AI provider:

1. Open `src/ai.js`
2. Add a new `callProviderName(prompt, apiKey)` function
3. Add a new case in the `askAI()` switch statement
4. Submit a PR

---

## 👨‍💻 Author

Built by **Harshit Gangwar**

- GitHub: [@harshit_gangwar16](https://github.com/harshit_gangwar16)
- npm: [gitpal-cli](https://www.npmjs.com/package/gitpal-cli)

---

## 📄 License

MIT — free to use, modify and distribute.

---

<p align="center">
  <strong>If GitPal saves you time, give it a ⭐ on GitHub!</strong>
</p>

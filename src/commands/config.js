import chalk from "chalk";
import inquirer from "inquirer";
import { loadConfig, saveConfig } from "../ai.js";

const PROVIDERS = {
  anthropic: {
    label: "Anthropic (Claude) — claude-3-haiku",
    keyHint: "Get free credits at console.anthropic.com",
  },
  openai: {
    label: "OpenAI (GPT-3.5) — gpt-3.5-turbo",
    keyHint: "Get API key at platform.openai.com",
  },
  gemini: {
    label: "Google Gemini — gemini-pro (Free tier)",
    keyHint: "Get free API key at aistudio.google.com",
  },
  groq: {
    label: "Groq — llama3-8b (Free & Ultra Fast)",
    keyHint: "Get free API key at console.groq.com",
  },
  
};

export async function configCommand() {
  const existing = loadConfig();

  console.log(chalk.bold("\n⚙️  GitPal Configuration\n"));

  if (existing.provider) {
    console.log(chalk.dim(`Current provider: ${existing.provider}`));
    console.log(
      chalk.dim(`Current API key: ${existing.apiKey?.slice(0, 8)}...\n`),
    );
  }

  const { provider } = await inquirer.prompt([
    {
      type: "list",
      name: "provider",
      message: "Choose your AI provider:",
      choices: Object.entries(PROVIDERS).map(([value, { label }]) => ({
        name: label,
        value,
      })),
      default: existing.provider,
    },
  ]);

  const hint = PROVIDERS[provider].keyHint;
  console.log(chalk.dim(`\n💡 ${hint}\n`));

  const { apiKey } = await inquirer.prompt([
    {
      type: "password",
      name: "apiKey",
      message: `Enter your ${provider} API key:`,
      mask: "*",
      validate: (val) => val.trim().length > 0 || "API key cannot be empty",
    },
  ]);

  saveConfig({ provider, apiKey: apiKey.trim() });

  console.log(chalk.green.bold("\n✅ Configuration saved!"));
  console.log(chalk.dim("Config stored at: ~/.gitpal.json\n"));
  console.log(chalk.white("You can now run:"));
  console.log(
    chalk.cyan("  gitpal commit     ") + chalk.dim("— auto commit message"),
  );
  console.log(
    chalk.cyan("  gitpal summary    ") +
      chalk.dim("— summarize recent commits"),
  );
  console.log(
    chalk.cyan("  gitpal pr         ") + chalk.dim("— generate PR description"),
  );
  console.log(
    chalk.cyan("  gitpal changelog  ") + chalk.dim("— generate changelog"),
  );
  console.log("");
}

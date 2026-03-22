import fs from 'fs';
import path from 'path';
import os from 'os';

const CONFIG_PATH = path.join(os.homedir(), '.gitpal.json');

export function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) return {};
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
}

export function saveConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

async function callAnthropic(prompt, apiKey) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-3-haiku-20240307', max_tokens: 500, messages: [{ role: 'user', content: prompt }] }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Anthropic API error');
  return data.content[0].text.trim();
}

async function callOpenAI(prompt, apiKey) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'gpt-3.5-turbo', max_tokens: 500, messages: [{ role: 'user', content: prompt }] }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'OpenAI API error');
  return data.choices[0].message.content.trim();
}

async function callGemini(prompt, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Gemini API error');
  return data.candidates[0].content.parts[0].text.trim();
}

async function callGroq(prompt, apiKey) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', max_tokens: 500, messages: [{ role: 'user', content: prompt }] }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Groq API error');
  return data.choices[0].message.content.trim();
}

async function callOpenRouter(prompt, apiKey, model) {
  const selectedModel = model || 'google/gemini-2.0-flash-exp:free';
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}`, 'HTTP-Referer': 'https://github.com/h1a2r3s4h/gitpal', 'X-Title': 'GitPal CLI' },
    body: JSON.stringify({ model: selectedModel, max_tokens: 500, messages: [{ role: 'user', content: prompt }] }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'OpenRouter API error');
  return data.choices[0].message.content.trim();
}

export async function askAI(prompt) {
  const config = loadConfig();
  const provider = config.provider;
  const apiKey = config.apiKey;
  const model = config.model;
  if (!provider || !apiKey) throw new Error('No AI provider configured. Run: gitpal config');
  switch (provider) {
    case 'anthropic':  return callAnthropic(prompt, apiKey);
    case 'openai':     return callOpenAI(prompt, apiKey);
    case 'gemini':     return callGemini(prompt, apiKey);
    case 'groq':       return callGroq(prompt, apiKey);
    case 'openrouter': return callOpenRouter(prompt, apiKey, model);
    default: throw new Error(`Unknown provider "${provider}". Run: gitpal config`);
  }
}

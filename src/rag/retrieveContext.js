import fs from 'fs';
import path from 'path';

const ALLOWED_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.json', '.md'];
const IGNORED_FOLDERS = [
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'coverage',
];

const IMPORTANT_FILE_HINTS = [
  'auth',
  'login',
  'user',
  'payment',
  'order',
  'api',
  'route',
  'controller',
  'service',
  'middleware',
  'db',
  'model',
  'config',
];

function shouldIgnore(fullPath) {
  return IGNORED_FOLDERS.some((folder) =>
    fullPath.split(path.sep).includes(folder)
  );
}

function getAllFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (shouldIgnore(fullPath)) continue;

    if (entry.isDirectory()) {
      getAllFiles(fullPath, files);
    } else {
      const ext = path.extname(entry.name);
      if (ALLOWED_EXTENSIONS.includes(ext)) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

function chunkText(text, chunkSize = 1200) {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}

function extractKeywords(query) {
  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => word.length > 2);
}

function countOccurrences(text, word) {
  const matches = text.match(new RegExp(word, 'gi'));
  return matches ? matches.length : 0;
}

function getIntentBonus(query, filePath, chunk) {
  const q = query.toLowerCase();
  const fp = filePath.toLowerCase();
  const ch = chunk.toLowerCase();

  let bonus = 0;

  const isDebug =
    q.includes('bug') ||
    q.includes('error') ||
    q.includes('issue') ||
    q.includes('failing') ||
    q.includes('failed') ||
    q.includes('not working') ||
    q.includes('problem') ||
    q.includes('why');

  const isFlow =
    q.includes('flow') ||
    q.includes('trace') ||
    q.includes('how') ||
    q.includes('works') ||
    q.includes('working');

  const isLocation =
    q.includes('where') ||
    q.includes('which file') ||
    q.includes('located') ||
    q.includes('find');

  if (isDebug) {
    if (fp.includes('auth') || fp.includes('middleware') || fp.includes('controller')) {
      bonus += 4;
    }
    if (ch.includes('throw new error') || ch.includes('catch') || ch.includes('status(500)')) {
      bonus += 3;
    }
  }

  if (isFlow) {
    if (fp.includes('route') || fp.includes('controller') || fp.includes('service')) {
      bonus += 4;
    }
    if (ch.includes('req') || ch.includes('res') || ch.includes('next(')) {
      bonus += 2;
    }
  }

  if (isLocation) {
    if (fp.includes('api') || fp.includes('route') || fp.includes('controller')) {
      bonus += 3;
    }
  }

  return bonus;
}

function scoreChunk(query, filePath, chunk) {
  const keywords = extractKeywords(query);
  const fileText = filePath.toLowerCase();
  const chunkTextLower = chunk.toLowerCase();

  let score = 0;

  for (const word of keywords) {
    if (fileText.includes(word)) score += 6;

    const occurrences = countOccurrences(chunkTextLower, word);
    score += occurrences * 2;
  }

  for (const hint of IMPORTANT_FILE_HINTS) {
    if (query.toLowerCase().includes(hint) && fileText.includes(hint)) {
      score += 4;
    }
  }

  if (chunk.includes('function ') || chunk.includes('const ') || chunk.includes('export ')) {
    score += 1;
  }

  if (chunk.includes('class ') || chunk.includes('async ')) {
    score += 1;
  }

  score += getIntentBonus(query, filePath, chunk);

  return score;
}

export function retrieveContext(query, rootDir = process.cwd(), topK = 5) {
  const files = getAllFiles(rootDir);
  const scoredChunks = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const chunks = chunkText(content);

      for (const chunk of chunks) {
        const score = scoreChunk(query, file, chunk);

        if (score > 0) {
          scoredChunks.push({
            file: path.relative(rootDir, file),
            chunk,
            score,
          });
        }
      }
    } catch {
      // skip unreadable files
    }
  }

  scoredChunks.sort((a, b) => b.score - a.score);

  const uniqueFiles = new Set();
  const finalResults = [];

  for (const item of scoredChunks) {
    if (!uniqueFiles.has(item.file)) {
      uniqueFiles.add(item.file);
      finalResults.push(item);
    }

    if (finalResults.length >= topK) break;
  }

  return finalResults;
}
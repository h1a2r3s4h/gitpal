import {
  startLoading,
  stopLoadingSuccess,
  showTitle,
  showSection,
  showList,
  showText,
  showError,
  showDiff,
} from '../utils/ui.js';

import { retrieveContext } from '../rag/retrieveContext.js';
import { askAI } from '../ai.js';

function detectMode(query) {
  const q = query.toLowerCase();

  const isFix =
    q.includes('fix') ||
    q.includes('patch') ||
    q.includes('correct') ||
    q.includes('improve') ||
    q.includes('optimize');

  const isDebug =
    q.includes('why') ||
    q.includes('bug') ||
    q.includes('error') ||
    q.includes('issue') ||
    q.includes('failing') ||
    q.includes('fails') ||
    q.includes('failed') ||
    q.includes('not working') ||
    q.includes('problem');

  const isFlow =
    q.includes('flow') ||
    q.includes('trace') ||
    q.includes('how') ||
    q.includes('working') ||
    q.includes('works') ||
    q.includes('lifecycle');

  const isLocation =
    q.includes('where') ||
    q.includes('located') ||
    q.includes('which file') ||
    q.includes('find');

  if (isFix) return 'fix';
  if (isDebug) return 'debug';
  if (isLocation) return 'location';
  if (isFlow) return 'flow';
  return 'general';
}

function buildPrompt(query, formattedContext, mode) {
  if (mode === 'fix') {
    return `
You are GitPal, an AI developer assistant specialized in fixing code issues.

User request:
${query}

Relevant codebase context:
${formattedContext}

Instructions:
- Identify issues in the code
- Suggest improved version
- Return DIFF format
- Mention file path
- Keep fix practical

Return format:

Issue Summary:
- ...

Target File:
<file>

Patch:
\`\`\`diff
- old
+ new
\`\`\`

Why Fix Works:
- ...
`;
  }

  if (mode === 'debug') {
    return `
You are GitPal, focused on debugging.

User:
${query}

Context:
${formattedContext}

Return:

Possible Root Causes:
1. ...
2. ...

Affected Files:
- ...

Why:
- ...

Fix Suggestions:
- ...
`;
  }

  if (mode === 'flow') {
    return `
Explain system flow.

User:
${query}

Context:
${formattedContext}

Return:

Overview:
...

Flow Steps:
1. ...
2. ...

Files:
- ...
`;
  }

  if (mode === 'location') {
    return `
Find relevant files.

User:
${query}

Context:
${formattedContext}

Return:

Files:
1. ...
2. ...

Explanation:
- ...
`;
  }

  return `
Answer clearly.

User:
${query}

Context:
${formattedContext}
`;
}

export async function askCommand(query) {
  try {
    if (!query || !query.trim()) {
      showError('Provide a question');
      return;
    }

    showTitle('🤖 GitPal AI Assistant');

    const mode = detectMode(query);

    startLoading(`Analyzing (${mode} mode)...`);

    const contexts = retrieveContext(query);

    if (!contexts.length) {
      stopLoadingSuccess('Done');
      showError('No relevant files found');
      return;
    }

    stopLoadingSuccess('Analysis complete');

    showSection('📂 Matched Files');
    showList(contexts.map(c => `${c.file} (score: ${c.score})`));

    const formattedContext = contexts
      .map(
        (c, i) => `
[Context ${i + 1}]
File: ${c.file}
${c.chunk}
`
      )
      .join('\n-----------------\n');

    const prompt = buildPrompt(query, formattedContext, mode);

    startLoading('Thinking...');

    const answer = await askAI(prompt);

    stopLoadingSuccess('Response ready');

    showSection(mode === 'fix' ? '🛠 Suggested Fix' : '🧠 Result');

    if (mode === 'fix') {
      showDiff(answer);
    } else {
      showText(answer);
    }

  } catch (err) {
    showError(err.message);
  }
}
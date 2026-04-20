/**
 * Intent classification for the idea creation flow.
 *
 * Classifies free-text input as "bug", "help", or "idea".
 *
 * Architecture:
 *   - Layer 1 (active): keyword-based heuristics — fast, offline, no cost.
 *   - Layer 2 (stub):   AI-based classification — plug in OpenAI when ready.
 *
 * To upgrade to AI: implement `classifyWithAI()` and call it from `classifyIntent()`
 * when the keyword layer returns "idea" (ambiguous) or when confidence is low.
 */

export type Intent = 'bug' | 'help' | 'idea';

// ─── Keyword lists ─────────────────────────────────────────────────────────────
// Multilingual (EN + ES). Keep sorted alphabetically within each group.

const BUG_KEYWORDS = [
  // EN
  'broke', 'broken', 'bug', 'crash', 'crashes', 'crashing',
  'error', 'exception', 'fails', 'failure', 'fix', 'freeze',
  'freezes', 'glitch', 'hang', 'hangs', 'incorrect', 'issue',
  'loading', "doesn't work", "doesn't load", 'not loading',
  'not working', 'problem', 'regression', 'slow', 'stuck',
  'unexpected', 'unresponsive', 'weird',
  // ES
  'bug', 'cuelga', 'error', 'excepción', 'falla', 'fallas',
  'fallo', 'falló', 'lento', 'no carga', 'no funciona',
  'no responde', 'problema', 'roto', 'tarda', 'trabado',
];

const HELP_KEYWORDS = [
  // EN
  'can i', 'can you', 'cannot', "can't", 'confused', 'explain',
  'help', 'how can', 'how do', 'how does', 'how should', 'how to',
  'i don\'t know', 'i don\'t understand', "i'm lost", 'missing',
  'need help', 'not sure', 'question', 'show me', 'support',
  'teach', 'understand', 'what does', 'what is', 'where can',
  'where do', 'where is', 'why can\'t', 'why does', 'why is',
  // ES
  'ayuda', 'cómo', 'cómo puedo', 'como hacer', 'confundido',
  'dónde', 'dónde está', 'entiendo', 'explicar', 'no entiendo',
  'no sé', 'necesito ayuda', 'por qué', 'pregunta', 'puedo',
  'qué es', 'qué hace', 'soporte',
];

// ─── Scoring ───────────────────────────────────────────────────────────────────

function score(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  return keywords.reduce((acc, kw) => (lower.includes(kw) ? acc + 1 : acc), 0);
}

// ─── Layer 1: keyword classifier ──────────────────────────────────────────────

function classifyWithKeywords(text: string): { intent: Intent; confidence: 'high' | 'low' } {
  if (text.trim().length < 15) return { intent: 'idea', confidence: 'low' };

  const bugScore  = score(text, BUG_KEYWORDS);
  const helpScore = score(text, HELP_KEYWORDS);

  // Require at least 1 strong signal to redirect
  if (bugScore === 0 && helpScore === 0) return { intent: 'idea', confidence: 'low' };

  if (bugScore > helpScore) return { intent: 'bug',  confidence: bugScore  >= 2 ? 'high' : 'low' };
  if (helpScore > bugScore) return { intent: 'help', confidence: helpScore >= 2 ? 'high' : 'low' };

  // Tie → treat as idea (don't interrupt the user)
  return { intent: 'idea', confidence: 'low' };
}

// ─── Layer 2: AI classification via backend ──────────────────────────────────

async function classifyWithAI(text: string): Promise<Intent | null> {
  try {
    const token = localStorage.getItem('sora_token');
    const res = await fetch('/api/ai/classify-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return null;
    const { intent } = await res.json();
    return intent as Intent;
  } catch {
    return null;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Classifies the user's free-text input into an intent.
 *
 * Currently uses keyword heuristics only. When `USE_AI_CLASSIFICATION` is
 * enabled and the keyword layer is ambiguous, it will call the AI layer.
 *
 * Only returns non-"idea" when there is at least one keyword signal, to avoid
 * interrupting users who are writing legitimate feature requests.
 */
export function classifyIntent(text: string): Intent {
  const { intent } = classifyWithKeywords(text);
  return intent;
}

/**
 * Async version — reserved for AI integration.
 * Falls back to keyword classification synchronously if AI is unavailable.
 */
export async function classifyIntentAsync(text: string): Promise<Intent> {
  try {
    const aiResult = await classifyWithAI(text);
    if (aiResult !== null) return aiResult;
  } catch {
    // AI unavailable — fall through to keyword layer
  }
  return classifyIntent(text);
}

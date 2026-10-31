// AI provider adapter for the Mentor. Two options, chosen by env vars:
//  - OPENROUTER_API_KEY  -> OpenRouter (any model on openrouter.ai, via its chat-completions API)
//  - ANTHROPIC_API_KEY   -> Anthropic directly (official SDK)
// If neither is set, the Mentor is simply off and the rest of the app works normally.
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';

export interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
  imageBase64Jpeg?: string; // only on the first user turn of a chart review
}

export interface AiResult {
  text: string;
  truncated: boolean;
  refused: boolean;
  tokens: number;
}

export class AiError extends Error {
  constructor(public kind: 'busy' | 'auth' | 'credits' | 'model' | 'other', message: string) {
    super(message);
  }
}

export const aiProvider: 'openrouter' | 'anthropic' | null = config.openrouterKey ? 'openrouter' : config.aiApiKey ? 'anthropic' : null;

const anthropic = aiProvider === 'anthropic' ? new Anthropic({ apiKey: config.aiApiKey, maxRetries: 1, timeout: 60_000 }) : null;

export async function complete(system: string, turns: ChatTurn[]): Promise<AiResult> {
  if (aiProvider === 'openrouter') return openRouter(system, turns);
  if (aiProvider === 'anthropic') return claude(system, turns);
  throw new AiError('other', 'No AI provider configured.');
}

// ---------- OpenRouter (OpenAI-style chat completions)
async function openRouter(system: string, turns: ChatTurn[]): Promise<AiResult> {
  const hasImage = turns.some((t) => t.imageBase64Jpeg);
  const models = hasImage ? config.openrouterVisionModels : config.openrouterModels;
  // Nemotron models "think" out loud by default; /no_think keeps answers short and inside the token cap.
  const sys = models.some((m) => m.includes('nemotron')) ? `${system}\n/no_think` : system;
  const messages = [
    { role: 'system', content: sys },
    ...turns.map((t) =>
      t.imageBase64Jpeg
        ? {
            role: t.role,
            content: [
              { type: 'text', text: t.text },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${t.imageBase64Jpeg}` } },
            ],
          }
        : { role: t.role, content: t.text },
    ),
  ];
  let res: Response;
  try {
    res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.openrouterKey}`,
        'Content-Type': 'application/json',
        'X-Title': 'Market Quest',
      },
      // `models` = OpenRouter fallback routing: if the first is down or rate-limited, it tries the next.
      body: JSON.stringify({ model: models[0], ...(models.length > 1 ? { models } : {}), messages, max_tokens: config.aiMaxTokens, reasoning: { exclude: true } }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    throw new AiError('busy', 'Could not reach OpenRouter.');
  }
  const data: any = await res.json().catch(() => null);
  if (!res.ok || data?.error) {
    const status = res.ok ? Number(data?.error?.code) || 500 : res.status;
    if (status === 401 || status === 403) throw new AiError('auth', 'OpenRouter key rejected.');
    if (status === 402) throw new AiError('credits', 'OpenRouter account is out of credits.');
    if (status === 429 || status >= 500) throw new AiError('busy', 'OpenRouter is busy.');
    if ((status === 400 || status === 404) && /model/i.test(String(data?.error?.message))) throw new AiError('model', String(data?.error?.message));
    throw new AiError('other', data?.error?.message ?? `OpenRouter error ${status}`);
  }
  const choice = data?.choices?.[0];
  const content = choice?.message?.content;
  const text = typeof content === 'string' ? content : Array.isArray(content) ? content.map((c: any) => c?.text ?? '').join('') : '';
  return {
    // Some models still wrap private reasoning in <think> tags; never show that to the trader.
    text: text.replace(/<think>[\s\S]*?(<\/think>|$)/g, '').trim(),
    truncated: choice?.finish_reason === 'length',
    refused: choice?.finish_reason === 'content_filter',
    tokens: (data?.usage?.prompt_tokens ?? 0) + (data?.usage?.completion_tokens ?? 0),
  };
}

// ---------- Anthropic (official SDK)
async function claude(system: string, turns: ChatTurn[]): Promise<AiResult> {
  const messages: Anthropic.Beta.BetaMessageParam[] = turns.map((t) => ({
    role: t.role,
    content: t.imageBase64Jpeg
      ? [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: t.imageBase64Jpeg } },
          { type: 'text', text: t.text },
        ]
      : t.text,
  }));
  try {
    const response = await anthropic!.beta.messages.create({
      model: config.aiModel,
      max_tokens: config.aiMaxTokens,
      system,
      output_config: { effort: 'low' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      messages,
    });
    const text = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    return {
      text,
      truncated: response.stop_reason === 'max_tokens',
      refused: response.stop_reason === 'refusal',
      tokens: response.usage.input_tokens + response.usage.output_tokens,
    };
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) throw new AiError('busy', 'Rate limited.');
    if (e instanceof Anthropic.AuthenticationError) throw new AiError('auth', 'Anthropic key rejected.');
    if (e instanceof Anthropic.APIError) throw new AiError('other', e.message);
    throw e;
  }
}

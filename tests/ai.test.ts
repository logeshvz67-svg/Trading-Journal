import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

let ai: typeof import('../server/src/services/ai');

beforeAll(async () => {
  process.env.SUPABASE_URL = 'https://x.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'anon';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'svc';
  process.env.OPENROUTER_API_KEY = 'or-test-key';
  process.env.OPENROUTER_MODEL = 'nvidia/nemotron-ultra:free, nvidia/nemotron-text:free';
  process.env.OPENROUTER_VISION_MODEL = 'nvidia/nemotron-vl:free';
  process.env.AI_MAX_TOKENS = '900';
  ai = await import('../server/src/services/ai');
});

afterEach(() => vi.unstubAllGlobals());

const reply = (body: unknown, status = 200) => vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));

describe('OpenRouter mentor provider', () => {
  it('is selected when OPENROUTER_API_KEY is set', () => {
    expect(ai.aiProvider).toBe('openrouter');
  });

  it('sends system prompt, image as data URI, model and token cap', async () => {
    const fetchMock = reply({ choices: [{ message: { content: 'Support is a floor.' }, finish_reason: 'stop' }], usage: { prompt_tokens: 100, completion_tokens: 20 } });
    vi.stubGlobal('fetch', fetchMock);
    const out = await ai.complete('SYS', [{ role: 'user', text: 'Review', imageBase64Jpeg: 'QUJD' }]);
    expect(out).toEqual({ text: 'Support is a floor.', truncated: false, refused: false, tokens: 120 });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer or-test-key');
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe('nvidia/nemotron-vl:free'); // image -> vision model
    expect(body.models).toBeUndefined();
    expect(body.messages[0].content).toBe('SYS\n/no_think');
    expect(body.max_tokens).toBe(900);
    expect(body.messages[1].content[1]).toEqual({ type: 'image_url', image_url: { url: 'data:image/jpeg;base64,QUJD' } });
  });

  it('uses the text model chain for normal questions', async () => {
    const fetchMock = reply({ choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }] });
    vi.stubGlobal('fetch', fetchMock);
    await ai.complete('S', [{ role: 'user', text: 'What is support?' }]);
    const body = JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body.model).toBe('nvidia/nemotron-ultra:free');
  });

  it('hides <think> reasoning and reports unknown models clearly', async () => {
    vi.stubGlobal('fetch', reply({ choices: [{ message: { content: '<think>secret plan</think>Support is a floor.' }, finish_reason: 'stop' }] }));
    expect((await ai.complete('S', [{ role: 'user', text: 'x' }])).text).toBe('Support is a floor.');
    vi.stubGlobal('fetch', reply({ error: { message: 'nvidia/x is not a valid model ID' } }, 400));
    await expect(ai.complete('S', [{ role: 'user', text: 'x' }])).rejects.toMatchObject({ kind: 'model' });
    vi.stubGlobal('fetch', reply({ error: { message: 'No endpoints found matching your data policy (Free model publication)' } }, 404));
    await expect(ai.complete('S', [{ role: 'user', text: 'x' }])).rejects.toMatchObject({ kind: 'privacy' });
  });

  it('falls back to the next model when one is unavailable', async () => {
    const calls: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (_u: string, init: RequestInit) => {
      const model = JSON.parse(String(init.body)).model;
      calls.push(model);
      return model === 'nvidia/nemotron-ultra:free'
        ? new Response(JSON.stringify({ error: { message: 'model not found' } }), { status: 404 })
        : new Response(JSON.stringify({ choices: [{ message: { content: 'from backup' }, finish_reason: 'stop' }] }), { status: 200 });
    }));
    expect((await ai.complete('S', [{ role: 'user', text: 'x' }])).text).toBe('from backup');
    expect(calls).toEqual(['nvidia/nemotron-ultra:free', 'nvidia/nemotron-text:free']);
  });

  it('flags cut-off answers and maps errors', async () => {
    vi.stubGlobal('fetch', reply({ choices: [{ message: { content: 'long…' }, finish_reason: 'length' }] }));
    expect((await ai.complete('S', [{ role: 'user', text: 'x' }])).truncated).toBe(true);
    vi.stubGlobal('fetch', reply({ error: { message: 'Insufficient credits' } }, 402));
    await expect(ai.complete('S', [{ role: 'user', text: 'x' }])).rejects.toMatchObject({ kind: 'credits' });
    vi.stubGlobal('fetch', reply({ error: { message: 'bad key' } }, 401));
    await expect(ai.complete('S', [{ role: 'user', text: 'x' }])).rejects.toMatchObject({ kind: 'auth' });
  });
});

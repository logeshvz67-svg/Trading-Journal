// Environment configuration. Secrets come from Render env vars (or a local .env), never from the repo.
function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable ${name}. See .env.example.`);
  return v;
}

export const config = {
  port: Number(process.env.PORT || 3000),
  isProd: process.env.NODE_ENV === 'production',
  supabaseUrl: required('SUPABASE_URL'),
  supabaseAnonKey: required('SUPABASE_ANON_KEY'),
  supabaseServiceKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  // Optional: the app works fully without AI (Phase 4).
  aiApiKey: process.env.ANTHROPIC_API_KEY || '',
  // OpenRouter takes priority when set. Pick a model id from https://openrouter.ai/models
  openrouterKey: process.env.OPENROUTER_API_KEY || '',
  openrouterModel: process.env.OPENROUTER_MODEL || 'openrouter/auto',
  aiDailyLimit: Number(process.env.AI_DAILY_LIMIT || 20),
  aiMaxTokens: Number(process.env.AI_MAX_TOKENS || 1500),
  aiModel: process.env.AI_MODEL || 'claude-opus-5-5',
};

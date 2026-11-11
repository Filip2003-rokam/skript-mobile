// Proba predloga: npx tsx scripts/try-match.ts
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const summitSlug = 'startup-revolution-ai-summit';
const ivan = 'test-ivan@skript.test';
const scriptDir = dirname(fileURLToPath(import.meta.url));

type Suggestion = {
  suggested_user_id: string;
  score: number;
  why: string | null;
  matched_mine: string | null;
  matched_theirs: string | null;
  openers: string[] | null;
};

function loadEnv(path: string): Record<string, string> {
  const text = readFileSync(path, 'utf8');
  const env: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function required(env: Record<string, string>, key: string): string {
  const value = env[key]?.trim();
  if (!value) throw new Error(`U scripts/.env nedostaje ${key}.`);
  return value;
}

async function main() {
  const env = loadEnv(join(scriptDir, '.env'));
  const supabase = createClient(required(env, 'SUPABASE_URL'), required(env, 'SUPABASE_ANON_KEY'), {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: ivan,
    password: required(env, 'TEST_PASSWORD'),
  });
  if (signInError) throw new Error(signInError.message);

  const { data: event, error: eventError } = await supabase.from('events').select('id').eq('slug', summitSlug).maybeSingle();
  if (eventError) throw new Error(eventError.message);
  if (!event) throw new Error(`Event ${summitSlug} nije u bazi.`);

  const { data, error } = await supabase.functions.invoke('match-attendees', { body: { event_id: event.id } });
  if (error) throw new Error(await functionMessage(error));

  const suggestions = (data?.suggestions ?? []) as Suggestion[];
  if (suggestions.length === 0) {
    console.log('Nema predloga.');
    return;
  }

  const ids = suggestions.map((item) => item.suggested_user_id);
  const { data: profiles, error: profileError } = await supabase.from('profiles').select('id, full_name').in('id', ids);
  if (profileError) throw new Error(profileError.message);
  const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name?.trim() || 'Učesnik']));

  for (const item of suggestions) {
    const openers = item.openers ?? [];
    console.log(names.get(item.suggested_user_id) || 'Učesnik');
    console.log(`Skor: ${item.score}`);
    console.log(`${item.matched_mine ?? ''} ↔ ${item.matched_theirs ?? ''}`);
    console.log(item.why ?? '');
    console.log(`1. ${openers[0] ?? ''}`);
    console.log(`2. ${openers[1] ?? ''}`);
    console.log('');
  }
}

async function functionMessage(error: unknown): Promise<string> {
  const response = (error as { context?: unknown }).context;
  if (response instanceof Response) {
    try {
      const body = (await response.json()) as { error?: unknown };
      if (typeof body.error === 'string' && body.error.trim()) return body.error;
    } catch {
      return 'Predlozi trenutno nisu dostupni.';
    }
  }
  return error instanceof Error ? error.message : 'Predlozi trenutno nisu dostupni.';
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Nešto nije uspelo.');
  process.exit(1);
});

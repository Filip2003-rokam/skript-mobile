import { getSession } from '../../lib/services/authService';

// Development build se otvara na skript:///. Ta adresa nema stranicu.
function bareLaunch(path: string): boolean {
  const value = path.trim();
  if (value === '' || value === '/' || value === 'skript:' || value === 'skript://' || value === 'skript:///') {
    return true;
  }
  if (!value.startsWith('skript:')) return false;
  const rest = value.slice('skript:'.length).replace(/^\/+/, '').split('?')[0].split('#')[0];
  return rest === '';
}

export async function redirectSystemPath({ path }: { path: string; initial: boolean }): Promise<string> {
  try {
    if (!bareLaunch(path)) return path;
    const session = await getSession();
    return session ? '/' : '/login';
  } catch {
    return '/login';
  }
}

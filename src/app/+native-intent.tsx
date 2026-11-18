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

function eventWelcome(path: string): string | null {
  const value = path.trim();
  const match = /^(?:skript:\/\/event\/|\/event\/)([^/?#]+)/.exec(value);
  if (!match) return null;
  if (value.includes('/welcome')) return value.startsWith('/') ? value.split('?')[0] : `/event/${match[1]}/welcome`;
  return `/event/${decodeURIComponent(match[1])}/welcome`;
}

export async function redirectSystemPath({ path }: { path: string; initial: boolean }): Promise<string> {
  try {
    const welcome = eventWelcome(path);
    if (welcome) return welcome;
    if (!bareLaunch(path)) return path;
    const session = await getSession();
    return session ? '/' : '/login';
  } catch {
    return '/login';
  }
}

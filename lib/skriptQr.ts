export type ScanResult =
  | { kind: 'event'; slug: string }
  | { kind: 'user'; userId: string; eventSlug: string | null }
  | { kind: 'swap'; token: string }
  | { kind: 'unknown' };

export function readSkriptQr(value: string): ScanResult {
  try {
    const url = new URL(value.trim());
    if (url.protocol === 'skript:') {
      const id = decodeURIComponent(url.pathname.replace(/^\//, ''));
      if (url.hostname === 'event' && id) return { kind: 'event', slug: id };
      if (url.hostname === 'swap' && id) return { kind: 'swap', token: id };
      if (url.hostname === 'user' && id) return { kind: 'user', userId: id, eventSlug: url.searchParams.get('event') };
      return { kind: 'unknown' };
    }
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      const [root, slug] = url.pathname.split('/').filter(Boolean);
      if (root === 'e' && slug) return { kind: 'event', slug: decodeURIComponent(slug) };
    }
  } catch {
    return { kind: 'unknown' };
  }
  return { kind: 'unknown' };
}

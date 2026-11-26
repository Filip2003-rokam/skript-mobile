import { useEffect, useRef } from 'react';
import { router } from 'expo-router';
import { useCurrentEvent } from './currentEvent';

function firstParam(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() ?? '';
}

/**
 * Push obaveštenje šalje npr. /people?view=requests&slug=... ili /agenda?view=myDay&slug=...
 * Dok je slug u adresi, otvori taj event, pa ga skloni iz adrese i zadrži view.
 */
export function useLinkedSlug(pathname: '/people' | '/agenda', slugParam: string | string[] | undefined, view: string) {
  const current = useCurrentEvent();
  const linkedSlug = firstParam(slugParam);
  const applied = useRef('');
  const { slug: storedSlug, ready, setSlug } = current;

  useEffect(() => {
    if (!linkedSlug) {
      applied.current = '';
      return;
    }
    if (!ready || applied.current === linkedSlug) return;
    if (linkedSlug !== storedSlug) {
      void setSlug(linkedSlug);
      return;
    }
    applied.current = linkedSlug;
    router.replace({ pathname, params: { view, slug: '' } });
  }, [linkedSlug, storedSlug, ready, setSlug, view, pathname]);

  return { ...current, slug: linkedSlug || storedSlug };
}

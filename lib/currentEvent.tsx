import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

const storageKey = 'current-event-slug';

type CurrentEventValue = {
  slug: string | null;
  ready: boolean;
  setSlug: (slug: string) => Promise<void>;
};

const CurrentEventContext = createContext<CurrentEventValue | null>(null);

export function CurrentEventProvider({ children }: { children: ReactNode }) {
  const [slug, setSlugState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(storageKey)
      .then((value) => {
        if (active) setSlugState(value);
      })
      .catch(() => {
        if (active) setSlugState(null);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  async function setSlug(next: string) {
    await AsyncStorage.setItem(storageKey, next);
    setSlugState(next);
  }

  return <CurrentEventContext.Provider value={{ slug, ready, setSlug }}>{children}</CurrentEventContext.Provider>;
}

export function useCurrentEvent() {
  const value = useContext(CurrentEventContext);
  if (!value) {
    throw new Error('useCurrentEvent je van CurrentEventProvider.');
  }
  return value;
}

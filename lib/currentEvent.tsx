import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { t } from './i18n';

const storageKey = 'current-event-slug';
const storageError = () => t('errors.savedEvent');

type CurrentEventValue = {
  slug: string | null;
  ready: boolean;
  error: string | null;
  setSlug: (slug: string) => Promise<void>;
  reload: () => void;
};

const CurrentEventContext = createContext<CurrentEventValue | null>(null);

export function CurrentEventProvider({ children }: { children: ReactNode }) {
  const [slug, setSlugState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(storageKey)
      .then((value) => {
        if (!active) return;
        setSlugState(value);
        setError(null);
      })
      .catch(() => {
        if (active) setError(storageError());
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [tick]);

  const reload = useCallback(() => {
    setReady(false);
    setTick((value) => value + 1);
  }, []);

  const setSlug = useCallback(async (next: string) => {
    await AsyncStorage.setItem(storageKey, next);
    setSlugState(next);
    setError(null);
  }, []);

  return <CurrentEventContext.Provider value={{ slug, ready, error, setSlug, reload }}>{children}</CurrentEventContext.Provider>;
}

export function useCurrentEvent() {
  const value = useContext(CurrentEventContext);
  if (!value) {
    throw new Error('useCurrentEvent je van CurrentEventProvider.');
  }
  return value;
}

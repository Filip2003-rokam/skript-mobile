import AsyncStorage from '@react-native-async-storage/async-storage';

// Rad bez mreže: poslednji uspešan odgovor ostaje na telefonu.
// Kad venue WiFi padne, agenda, Moj dan i kontakti se i dalje vide, uz oznaku da su sačuvani ranije.
// Upis ide samo preko mreže. Keš se briše pri odjavi.

const prefix = 'offline:';

export type Cached<T> = { value: T; offline: boolean; savedAt: string | null };

type Stored<T> = { value: T; savedAt: string };

export async function withOfflineCache<T>(key: string, load: () => Promise<T>): Promise<Cached<T>> {
  try {
    const value = await load();
    const stored: Stored<T> = { value, savedAt: new Date().toISOString() };
    AsyncStorage.setItem(prefix + key, JSON.stringify(stored)).catch(() => undefined);
    return { value, offline: false, savedAt: stored.savedAt };
  } catch (cause) {
    const stored = await readCache<T>(key);
    if (!stored) throw cause;
    return { value: stored.value, offline: true, savedAt: stored.savedAt };
  }
}

export async function readCache<T>(key: string): Promise<Stored<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(prefix + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored<T>;
    return parsed && 'value' in parsed ? parsed : null;
  } catch {
    return null;
  }
}

export async function clearOfflineCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const mine = keys.filter((key) => key.startsWith(prefix));
    if (mine.length > 0) await AsyncStorage.multiRemove(mine);
  } catch {
    // Keš nije mogao da se obriše. Sledeća prijava ga prepiše.
  }
}

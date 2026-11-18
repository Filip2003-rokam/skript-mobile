import AsyncStorage from '@react-native-async-storage/async-storage';

const storageKey = 'pending-event-slug';

export async function rememberEntry(slug: string): Promise<void> {
  await AsyncStorage.setItem(storageKey, slug);
}

export async function takeEntry(): Promise<string | null> {
  const value = await AsyncStorage.getItem(storageKey);
  if (value) await AsyncStorage.removeItem(storageKey);
  return value;
}

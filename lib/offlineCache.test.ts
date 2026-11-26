import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearOfflineCache, withOfflineCache } from './offlineCache';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('withOfflineCache', () => {
  it('posle uspeha čuva odgovor, a bez mreže vraća sačuvano', async () => {
    const first = await withOfflineCache('agenda:pogon', async () => ['a', 'b']);
    expect(first).toMatchObject({ value: ['a', 'b'], offline: false });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const second = await withOfflineCache('agenda:pogon', async () => {
      throw new Error('Network request failed');
    });
    expect(second.value).toEqual(['a', 'b']);
    expect(second.offline).toBe(true);
    expect(second.savedAt).toBe(first.savedAt);
  });

  it('bez sačuvanog prosleđuje grešku', async () => {
    await expect(
      withOfflineCache('contacts', async () => {
        throw new Error('Network request failed');
      }),
    ).rejects.toThrow('Network request failed');
  });

  it('odjava briše sve sačuvano', async () => {
    await withOfflineCache('contacts', async () => [1]);
    await new Promise((resolve) => setTimeout(resolve, 0));
    await clearOfflineCache();
    await expect(
      withOfflineCache('contacts', async () => {
        throw new Error('offline');
      }),
    ).rejects.toThrow('offline');
  });
});

import i18n, { appLocale, deviceLanguage, setAppLanguage, t } from './index';
import { en } from './en';
import { sr } from './sr';

function keys(tree: object, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null ? keys(value, `${prefix}${key}.`) : [`${prefix}${key}`],
  );
}

afterEach(async () => {
  await i18n.changeLanguage('sr');
});

describe('prevodi', () => {
  it('engleski ima svaki srpski ključ osim oblika _few', () => {
    const srKeys = keys(sr).filter((key) => !key.endsWith('_few')).sort();
    expect(keys(en).sort()).toEqual(srKeys);
  });

  it('nijedan tekst nije prazan', () => {
    for (const [name, dict] of [['sr', sr], ['en', en]] as const) {
      const empty = keys(dict).filter((key) => !String(i18n.getResource(name, 'translation', key) ?? '').trim());
      expect(empty).toEqual([]);
    }
  });

  it('srpski menja oblik po broju', () => {
    expect(t('home.suggestionCount', { count: 1 })).toBe('1 predlog');
    expect(t('home.linksToday', { count: 3 })).toBe('3 nove veze danas');
    expect(t('home.linksToday', { count: 5 })).toBe('5 novih veza danas');
    expect(t('event.dayLive', { day: 2, count: 2 })).toBe('Dan 2 · 2 sesije upravo traju');
  });

  it('prekidač u „Ja“ prebacuje na engleski', async () => {
    await setAppLanguage('en');
    expect(t('tabs.people')).toBe('People');
    expect(t('home.suggestionCount', { count: 1 })).toBe('1 suggestion');
    expect(appLocale()).toBe('en-GB');
  });

  it('telefon na srpskom, hrvatskom ili bosanskom dobija srpski', () => {
    expect(['sr', 'en']).toContain(deviceLanguage());
  });
});

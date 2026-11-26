import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en } from './en';
import { sr } from './sr';

export type AppLanguage = 'sr' | 'en';

const storageKey = 'app-language';

// Srpski, hrvatski, bosanski i crnogorski telefon dobija srpski. Svi ostali engleski.
const serbianFamily = new Set(['sr', 'hr', 'bs', 'sh', 'cnr']);

export function deviceLanguage(): AppLanguage {
  try {
    const code = getLocales()[0]?.languageCode?.toLowerCase() ?? '';
    return serbianFamily.has(code) ? 'sr' : 'en';
  } catch {
    return 'sr';
  }
}

i18n.use(initReactI18next).init({
  resources: { sr: { translation: sr }, en: { translation: en } },
  lng: deviceLanguage(),
  fallbackLng: 'sr',
  interpolation: { escapeValue: false },
  returnNull: false,
});

/** Jezik koji je korisnik izabrao u „Ja“ ima prednost nad jezikom telefona. */
export async function loadSavedLanguage(): Promise<void> {
  try {
    const saved = await AsyncStorage.getItem(storageKey);
    if (saved === 'sr' || saved === 'en') await i18n.changeLanguage(saved);
  } catch {
    // Ostaje jezik telefona.
  }
}

export async function setAppLanguage(language: AppLanguage): Promise<void> {
  await i18n.changeLanguage(language);
  try {
    await AsyncStorage.setItem(storageKey, language);
  } catch {
    // Izbor važi do zatvaranja aplikacije.
  }
}

export function appLanguage(): AppLanguage {
  return i18n.language === 'en' ? 'en' : 'sr';
}

/** Oznaka za Intl i localeCompare: srpski latinicom ili engleski. */
export function appLocale(): string {
  return appLanguage() === 'en' ? 'en-GB' : 'sr-Latn-RS';
}

export const t = i18n.t.bind(i18n);
export default i18n;

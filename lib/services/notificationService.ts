import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { supabase } from '../supabase';
import { getSession } from './authService';

// Bez ovoga Android ne prikaže notifikaciju dok je aplikacija otvorena.
function showInForeground() {
  if (Platform.OS === 'web') return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

function easProjectId(): string | null {
  const fromEas = Constants.easConfig?.projectId;
  if (fromEas) return fromEas;
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId || null;
}

function openNotification(response: Notifications.NotificationResponse | null) {
  if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
  const url = response.notification.request.content.data?.url;
  if (typeof url !== 'string' || !url.startsWith('/')) return;
  Notifications.clearLastNotificationResponse();
  router.push(url as Href);
}

// Dozvola, Expo token i upis u push_tokens. Emulator i odbijena dozvola ne ruše aplikaciju.
export async function registerForPush(): Promise<void> {
  try {
    if (Platform.OS === 'web') return;
    showInForeground();

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Obaveštenja',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const asked = await Notifications.requestPermissionsAsync();
      status = asked.status;
    }
    if (status !== 'granted') return;

    const projectId = easProjectId();
    if (!projectId) return;

    const expoToken = await Notifications.getExpoPushTokenAsync({ projectId });
    const session = await getSession();
    if (!session) return;

    const { error } = await supabase.from('push_tokens').upsert(
      {
        user_id: session.user.id,
        token: expoToken.data,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'token' },
    );
    if (error) return;
  } catch {
    // Emulator nema token, a mreža ili native modul mogu da padnu. Aplikacija radi dalje.
  }
}

// Skida token ovog uređaja pre odjave. Greška ne sme da zaustavi signOut.
export async function unregisterPush(): Promise<void> {
  try {
    if (Platform.OS === 'web') return;
    const projectId = easProjectId();
    if (!projectId) return;
    const session = await getSession();
    if (!session) return;
    const expoToken = await Notifications.getExpoPushTokenAsync({ projectId });
    await supabase.from('push_tokens').delete().eq('token', expoToken.data).eq('user_id', session.user.id);
  } catch {
    // Nema tokena ili brisanje nije prošlo. Odjava ide dalje.
  }
}

// Dodir na notifikaciju, i kad je aplikacija bila ugašena, otvara data.url.
export function listenForNotificationOpens(): () => void {
  if (Platform.OS === 'web') return () => undefined;
  showInForeground();
  const opened = new Set<string>();

  function open(response: Notifications.NotificationResponse | null) {
    if (!response) return;
    const id = response.notification.request.identifier;
    if (opened.has(id)) return;
    opened.add(id);
    openNotification(response);
  }

  const subscription = Notifications.addNotificationResponseReceivedListener(open);
  open(Notifications.getLastNotificationResponse());
  return () => subscription.remove();
}

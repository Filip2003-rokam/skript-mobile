import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { followUpAtNine } from '../contactDates';

const settingKey = 'follow-up-reminders';
const prefix = 'follow-up-';

export type FollowUpTarget = {
  id: string;
  fullName: string;
  followUpDate: string | null;
  followUpDone: boolean;
};

function reminderId(contactId: string) {
  return `${prefix}${contactId}`;
}

async function prepare(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Obaveštenja',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === 'granted') return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.status === 'granted';
}

export async function remindersEnabled(): Promise<boolean> {
  const value = await AsyncStorage.getItem(settingKey);
  return value !== 'off';
}

export async function setRemindersEnabled(on: boolean): Promise<void> {
  if (!on) await cancelAllFollowUps();
  await AsyncStorage.setItem(settingKey, on ? 'on' : 'off');
}

export async function cancelFollowUp(contactId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(reminderId(contactId));
}

export async function cancelAllFollowUps(): Promise<void> {
  if (Platform.OS === 'web') return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const mine = scheduled.filter((item) => item.identifier.startsWith(prefix));
  await Promise.all(mine.map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)));
}

// Zakaže ili skine podsetnik posle upisa. Isključen prekidač i prošao datum ne zakazuju.
export async function syncFollowUp(contact: FollowUpTarget): Promise<void> {
  await cancelFollowUp(contact.id);
  if (!(await remindersEnabled())) return;
  if (contact.followUpDone) return;
  const at = followUpAtNine(contact.followUpDate);
  if (!at) return;
  if (!(await prepare())) return;
  const name = contact.fullName.trim() || 'kontakt';
  await Notifications.scheduleNotificationAsync({
    identifier: reminderId(contact.id),
    content: {
      title: `Vreme je da se javiš: ${name}`,
      data: { url: `/contact/${contact.id}` },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: at,
      channelId: 'default',
    },
  });
}

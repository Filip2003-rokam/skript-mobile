import { useCallback, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { Card } from '../ui/Card';
import { colors, fontSize, fonts, space, trackingWide } from '../../constants/theme';
import { clearAgendaReminders } from '../../lib/services/agendaReminderService';
import { remindersEnabled, setRemindersEnabled } from '../../lib/services/reminderService';
import { InlineError } from '../ui/State';
import { t } from '../../lib/i18n';

export function ReminderSetting() {
  const [on, setOn] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      remindersEnabled()
        .then((value) => {
          if (!active) return;
          setOn(value);
          setError(null);
        })
        .catch(() => {
          if (active) setError(t('reminder.readFailed'));
        })
        .finally(() => {
          if (active) setReady(true);
        });
      return () => {
        active = false;
      };
    }, []),
  );

  async function toggle(next: boolean) {
    setOn(next);
    setError(null);
    try {
      await setRemindersEnabled(next);
      // Sesije i sastanci se ponovo zakažu kad se otvore Agenda ili Ljudi.
      if (!next) await clearAgendaReminders();
    } catch {
      setOn(!next);
      setError(t('reminder.saveFailed'));
    }
  }

  return (
    <Card variant="surface" style={styles.card}>
      <View style={styles.kicker}>
        <Feather name="bell" size={fontSize.fs13} color={colors.text2} />
        <Text style={styles.kickerText}>{t('reminder.title')}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>{t('reminder.when')}</Text>
        <Switch
          accessibilityLabel={t('reminder.toggle')}
          disabled={!ready}
          value={on}
          onValueChange={(next) => void toggle(next)}
          trackColor={{ true: colors.skriptYellow, false: colors.fillSubtle }}
          thumbColor={colors.surface}
        />
      </View>
      <Text style={styles.hint}>{t('reminder.hint')}</Text>
      {error ? <InlineError text={error} /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.gap, padding: space.gap },
  kicker: { flexDirection: 'row', alignItems: 'center', gap: space.tight * 2 },
  kickerText: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.fs11,
    color: colors.text2,
    textTransform: 'uppercase',
    letterSpacing: trackingWide,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.gap },
  label: { flex: 1, fontFamily: fonts.bold, fontSize: fontSize.fs17, color: colors.ink },
  hint: { fontFamily: fonts.regular, fontSize: fontSize.fs11, color: colors.text3 },
});

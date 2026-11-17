import { useCallback, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { colors, fontSize, fonts, space } from '../../constants/theme';
import { remindersEnabled, setRemindersEnabled } from '../../lib/services/reminderService';
import { InlineError } from '../ui/State';

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
          if (active) setError('Ne mogu da pročitam podešavanje. Zatvori aplikaciju i pokreni je ponovo.');
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
    } catch {
      setOn(!next);
      setError('Ne mogu da sačuvam podešavanje. Pokušaj ponovo.');
    }
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={styles.label}>Podsetnici za follow-up</Text>
        <Switch
          accessibilityLabel="Podsetnici za follow-up"
          disabled={!ready}
          value={on}
          onValueChange={(next) => void toggle(next)}
          trackColor={{ true: colors.skriptYellow, false: colors.fillSubtle }}
          thumbColor={colors.surface}
        />
      </View>
      <Text style={styles.hint}>Ujutru tog dana, u 9:00, stiže obaveštenje koje otvara kontakt.</Text>
      {error ? <InlineError text={error} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.tight },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.gap },
  label: { flex: 1, fontFamily: fonts.semibold, fontSize: fontSize.fs15, color: colors.ink },
  hint: { fontFamily: fonts.regular, fontSize: fontSize.fs13, color: colors.text2 },
});

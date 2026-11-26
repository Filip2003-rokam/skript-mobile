import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button } from '../ui/Button';
import { InlineError } from '../ui/State';
import { colors, fontSize, fonts, size, space } from '../../constants/theme';
import { addToCalendar, type CalendarItem } from '../../lib/services/deviceService';
import { t } from '../../lib/i18n';

/** „Dodaj u kalendar“: sistemski prozor kalendara, već popunjen. */
export function CalendarButton({ item }: { item: CalendarItem | null }) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!item) return null;

  async function add() {
    if (!item) return;
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const outcome = await addToCalendar(item);
      if (outcome === 'saved') setNotice(t('device.calendarSaved'));
      if (outcome === 'denied') setError(t('device.calendarDenied'));
    } catch {
      setError(t('device.calendarFailed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.block}>
      <Button size="sm" variant="secondary" label={t('device.addToCalendar')} disabled={busy} onPress={() => void add()}>
        <Feather name="calendar" size={size.iconSm} color={colors.ink} />
      </Button>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {error ? <InlineError text={error} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: space.tight },
  notice: { fontFamily: fonts.semibold, fontSize: fontSize.fs13, color: colors.ok },
});

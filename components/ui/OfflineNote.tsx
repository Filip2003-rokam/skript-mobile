import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, fontSize, fonts, radius, size, space } from '../../constants/theme';
import { appLocale, t } from '../../lib/i18n';

/** Traka kad ekran pokazuje podatke sačuvane na telefonu, jer mreža ne radi. */
export function OfflineNote({ savedAt, onRetry }: { savedAt: string; onRetry?: () => void }) {
  const time = new Date(savedAt).toLocaleString(appLocale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  return (
    <View style={styles.note} accessibilityRole="alert">
      <Feather name="wifi-off" size={size.iconSm} color={colors.ink} />
      <Text style={styles.text}>{t('offline.note', { time })}</Text>
      {onRetry ? (
        <Pressable accessibilityRole="button" hitSlop={space.tight * 2} onPress={onRetry}>
          <Text style={styles.retry}>{t('common.retry')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.tight * 2,
    paddingHorizontal: space.gap,
    paddingVertical: space.tight * 2,
    borderRadius: radius.control,
    backgroundColor: colors.skriptYellowSoft,
  },
  text: { flex: 1, fontFamily: fonts.medium, fontSize: fontSize.fs13, color: colors.ink },
  retry: { fontFamily: fonts.bold, fontSize: fontSize.fs13, color: colors.ink, textDecorationLine: 'underline' },
});

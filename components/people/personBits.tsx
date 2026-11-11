import { StyleSheet, Text } from 'react-native';
import { colors, fontSize, fonts } from '../../constants/theme';
import { authErrorMessage } from '../../lib/services/authService';

export function displayName(name: string | null) {
  const trimmed = name?.trim();
  return trimmed ? trimmed : 'Nepoznata osoba';
}

export function actionError(error: unknown): string {
  if (error instanceof Error && !('code' in error)) return error.message;
  return authErrorMessage(error);
}

export function Kicker({ text }: { text: string }) {
  return <Text style={styles.kicker}>{text}</Text>;
}

export function RoleLine({ role, company }: { role: string | null; company: string | null }) {
  const line = [role, company].filter(Boolean).join(' · ');
  if (!line) return null;
  return (
    <Text numberOfLines={1} style={styles.role}>
      {line}
    </Text>
  );
}

const styles = StyleSheet.create({
  kicker: {
    fontFamily: fonts.bold,
    fontSize: fontSize.fs11,
    color: colors.text2,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  role: {
    fontFamily: fonts.regular,
    fontSize: fontSize.fs13,
    color: colors.text2,
  },
});

import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, fontSize, fonts, size, space } from '../../constants/theme';
import { Button } from './Button';
import { EmptyState } from './EmptyState';

export function LoadingState({ fill = true }: { fill?: boolean }) {
  return (
    <View style={fill ? styles.center : styles.inline}>
      <ActivityIndicator color={colors.ink} />
    </View>
  );
}

export function ErrorState({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <EmptyState
        icon={<Feather name="alert-circle" size={size.iconMd} color={colors.ink} />}
        text={text}
        action={onRetry ? 'Pokušaj ponovo' : undefined}
        onAction={onRetry}
      />
    </View>
  );
}

export function InlineError({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return (
    <View style={styles.inline}>
      <Text style={styles.error}>{text}</Text>
      {onRetry ? <Button label="Pokušaj ponovo" size="sm" variant="secondary" onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.gap,
  },
  inline: {
    gap: space.gap,
  },
  error: {
    fontFamily: fonts.regular,
    fontSize: fontSize.fs13,
    color: colors.destructive,
  },
});

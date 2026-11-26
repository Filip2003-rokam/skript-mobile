import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Button } from '../ui/Button';
import { colors, fontSize, fonts, radius, size, space } from '../../constants/theme';
import { actionError, Kicker } from './personBits';

export function MatchOpeners({ lines }: { lines: string[] }) {
  const [copied, setCopied] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function copy(text: string, index: number) {
    try {
      await Clipboard.setStringAsync(text);
      setCopied(index);
      setError(null);
    } catch (cause) {
      setError(actionError(cause));
    }
  }

  return (
    <View style={styles.box}>
      <Kicker text="Pokušaj da kažeš" />
      {lines.map((line, index) => (
        <View key={line} style={styles.line}>
          <Text style={styles.opener}>"{line}"</Text>
          <Button size="sm" variant="ghost" label={copied === index ? 'Kopirano' : 'Kopiraj'} onPress={() => void copy(line, index)}>
            <Feather name={copied === index ? 'check' : 'copy'} size={size.iconSm} color={colors.ink} />
          </Button>
        </View>
      ))}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: space.gap,
    padding: space.gap,
    borderRadius: radius.control,
    backgroundColor: colors.fillSubtle,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.gap,
  },
  opener: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: fontSize.fs13,
    color: colors.ink,
  },
  error: {
    fontFamily: fonts.regular,
    fontSize: fontSize.fs13,
    color: colors.ink,
  },
});

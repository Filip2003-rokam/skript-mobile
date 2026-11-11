import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { colors, fontSize, fonts, radius, space } from '../../constants/theme';
import { actionError } from './personBits';

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
      {lines.map((line, index) => (
        <View key={line} style={styles.line}>
          <Text style={styles.opener}>"{line}"</Text>
          <Pressable accessibilityRole="button" onPress={() => void copy(line, index)} style={styles.copy}>
            <Feather name={copied === index ? 'check' : 'copy'} size={14} color={colors.ink} />
            <Text style={styles.copyText}>{copied === index ? 'Kopirano' : 'Kopiraj'}</Text>
          </Pressable>
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
    borderRadius: radius.card - 4,
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
    fontSize: fontSize.fs15,
    color: colors.ink,
  },
  copy: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.tight,
    paddingHorizontal: space.tight,
  },
  copyText: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.fs13,
    color: colors.ink,
  },
  error: {
    fontFamily: fonts.regular,
    fontSize: fontSize.fs13,
    color: colors.ink,
  },
});

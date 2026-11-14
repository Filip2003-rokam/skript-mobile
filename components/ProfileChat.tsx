import { StyleSheet, Text, View } from 'react-native';
import { Card } from './ui/Card';
import { Chip } from './ui/Chip';
import type { Choice } from '../constants/options';
import { colors, fontSize, fonts, radius, space } from '../constants/theme';

export function choiceLabels(options: Choice[], keys: string[]) {
  return options.filter((option) => keys.includes(option.key)).map((option) => option.label).join(', ');
}

export function Ask({ text }: { text: string }) {
  return (
    <Card>
      <Text style={styles.askText}>{text}</Text>
    </Card>
  );
}

export function Mine({ text }: { text: string }) {
  return (
    <View style={styles.mine}>
      <Text style={styles.mineText}>{text}</Text>
    </View>
  );
}

export function ChoiceChips({ options, selected, onPress }: { options: Choice[]; selected: string[]; onPress: (key: string) => void }) {
  return (
    <View style={styles.chips}>
      {options.map((option) => (
        <Chip key={option.key} label={option.label} selected={selected.includes(option.key)} onPress={() => onPress(option.key)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  askText: {
    fontFamily: fonts.regular,
    fontSize: fontSize.fs15,
    color: colors.ink,
  },
  mine: {
    alignSelf: 'flex-end',
    borderRadius: radius.card,
    padding: space.card,
    backgroundColor: colors.ink,
  },
  mineText: {
    fontFamily: fonts.regular,
    fontSize: fontSize.fs15,
    color: colors.onInk,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.gap,
  },
});

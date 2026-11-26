import { StyleSheet, Text, View } from 'react-native';
import { Chip } from './ui/Chip';
import type { Choice } from '../constants/options';
import { colors, fontSize, fonts, radius, size, space, trackingWide } from '../constants/theme';

export function choiceLabels(options: Choice[], keys: string[]) {
  return options.filter((option) => keys.includes(option.key)).map((option) => option.label).join(', ');
}

export function Ask({ text }: { text: string }) {
  return <Text style={styles.askText}>{text}</Text>;
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
        <Chip key={option.key} large label={option.label} selected={selected.includes(option.key)} onPress={() => onPress(option.key)} />
      ))}
    </View>
  );
}

export function StepLabel({ text }: { text: string }) {
  return <Text style={styles.group}>{text}</Text>;
}

const styles = StyleSheet.create({
  askText: {
    fontFamily: fonts.regular,
    fontSize: fontSize.fs15,
    lineHeight: fontSize.fs22 + size.ring,
    color: colors.ink,
  },
  mine: {
    alignSelf: 'flex-end',
    maxWidth: '80%',
    borderRadius: radius.card,
    paddingHorizontal: space.card,
    paddingVertical: space.chip - size.ring,
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
    gap: space.tight * 2,
  },
  group: {
    fontFamily: fonts.bold,
    fontSize: fontSize.fs11,
    letterSpacing: trackingWide,
    textTransform: 'uppercase',
    color: colors.text2,
  },
});

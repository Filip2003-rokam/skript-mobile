import { StyleSheet, Text, View } from 'react-native';
import { avatarText, colors, fonts, size } from '../../constants/theme';

type AvatarProps = {
  name: string;
  size?: number;
};

export function Avatar({ name, size: box = size.avatar }: AvatarProps) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <View style={[styles.circle, { width: box, height: box, borderRadius: box / 2 }]}>
      <Text style={[styles.text, { fontSize: box * avatarText }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.avatarBg,
    borderWidth: size.ring,
    borderColor: colors.surface,
  },
  text: {
    fontFamily: fonts.bold,
    color: colors.ink,
  },
});

import { Image, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { colors, fontSize, fonts, radius, shadow, size } from '../../constants/theme';

type EventLogoProps = {
  initials: string;
  source?: ImageSourcePropType;
  small?: boolean;
  box?: number;
};

export function EventLogo({ initials, source, small = false, box }: EventLogoProps) {
  const side = box ?? (small ? size.logoSm : size.logo);
  const letters = side > size.logo ? fontSize.fs30 : small ? fontSize.fs11 : fontSize.fs22;
  return (
    <View style={[styles.box, { width: side, height: side }]}>
      {source ? (
        <Image source={source} style={styles.image} />
      ) : (
        <Text style={[styles.initials, { fontSize: letters }]}>{initials}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: radius.logo,
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  initials: {
    fontFamily: fonts.bold,
    color: colors.ink,
  },
});

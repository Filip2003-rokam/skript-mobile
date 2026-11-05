import { Image, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { colors, fontSize, fonts, radius, shadow, size } from '../../constants/theme';

type EventLogoProps = {
  initials: string;
  source?: ImageSourcePropType;
  small?: boolean;
};

export function EventLogo({ initials, source, small = false }: EventLogoProps) {
  const box = small ? size.logoSm : size.logo;
  return (
    <View style={[styles.box, { width: box, height: box }]}>
      {source ? (
        <Image source={source} style={styles.image} />
      ) : (
        <Text style={[styles.initials, small && styles.small]}>{initials}</Text>
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
    fontSize: fontSize.fs22,
    color: colors.ink,
  },
  small: {
    fontSize: fontSize.fs11,
  },
});

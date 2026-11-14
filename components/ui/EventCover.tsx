import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fontSize, fonts, photoShade, radius, size, space, trackingTight } from '../../constants/theme';
import { SkriptMark } from './SkriptMark';

type EventCoverProps = {
  name: string;
  place: string;
  coverUri?: string;
};

// Naslovna početne: fotografija eventa od ivice do ivice, ime i mesto preko nje.
export function EventCover({ name, place, coverUri }: EventCoverProps) {
  return (
    <View style={styles.cover}>
      {coverUri ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Image source={{ uri: coverUri }} style={styles.image} />
          {/* Jedino mesto sa gradijentom: tamni sloj da se beli tekst čita preko fotografije. */}
          <LinearGradient colors={[...photoShade]} style={StyleSheet.absoluteFill} />
        </View>
      ) : null}
      <View style={styles.by}>
        <Text style={styles.byText}>by</Text>
        <SkriptMark size={fontSize.fs13} tone="light" />
      </View>
      <View style={styles.text}>
        <Text numberOfLines={2} style={styles.name}>{name}</Text>
        {place ? <Text style={styles.place}>{place}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    minHeight: size.coverMin,
    justifyContent: 'space-between',
    gap: space.gap,
    marginHorizontal: -space.edge,
    marginTop: -space.gap,
    paddingHorizontal: space.edge,
    paddingTop: space.gap,
    paddingBottom: space.card,
    overflow: 'hidden',
    borderBottomLeftRadius: radius.cover,
    borderBottomRightRadius: radius.cover,
    backgroundColor: colors.ink,
  },
  image: { width: '100%', height: '100%' },
  by: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.tight,
    height: size.chip,
    paddingHorizontal: space.chip,
    borderRadius: radius.pill,
    backgroundColor: colors.onPhotoGlass,
  },
  byText: { fontFamily: fonts.medium, fontSize: fontSize.fs12, color: colors.onPhoto },
  text: { gap: space.tight / 2 },
  name: {
    fontFamily: fonts.display,
    fontSize: fontSize.fs19,
    color: colors.onPhoto,
    letterSpacing: fontSize.fs19 * trackingTight,
  },
  place: { fontFamily: fonts.regular, fontSize: fontSize.fs12, color: colors.onPhotoDim },
});

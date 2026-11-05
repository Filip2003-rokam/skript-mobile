import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fontSize, fonts, heroFade, heroFadeStart, radius, size, space, trackingTight } from '../../constants/theme';
import { SkriptMark } from './SkriptMark';

type EventHeroProps = {
  eventName: string;
  title: string;
  coverUri?: string;
};

export function EventHero({ eventName, title, coverUri }: EventHeroProps) {
  return (
    <View style={[styles.hero, coverUri ? { minHeight: size.hero } : null]}>
      {coverUri ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Image source={{ uri: coverUri }} style={styles.image} />
          {/* Jedino mesto sa gradijentom: fotografija se topi u pozadinu. */}
          <LinearGradient colors={[...heroFade]} locations={[heroFadeStart, 1]} style={StyleSheet.absoluteFill} />
        </View>
      ) : null}
      <View style={styles.content}>
        <View style={styles.pills}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{eventName}</Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.by}>by</Text>
            <SkriptMark size={fontSize.fs13} />
          </View>
        </View>
        <Text style={styles.title}>{title}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { overflow: 'hidden', justifyContent: 'flex-end' },
  image: { width: '100%', height: '100%' },
  content: { gap: space.gap, paddingTop: space.edge, paddingBottom: space.gap },
  pills: { alignItems: 'flex-start', gap: space.tight },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.tight,
    paddingHorizontal: space.chip,
    paddingVertical: space.tight,
    borderRadius: radius.pill,
    backgroundColor: colors.glass,
  },
  pillText: { fontFamily: fonts.semibold, fontSize: fontSize.fs13, color: colors.ink },
  by: { fontFamily: fonts.regular, fontSize: fontSize.fs13, color: colors.text2 },
  title: {
    fontFamily: fonts.display,
    fontSize: fontSize.fs30,
    color: colors.ink,
    letterSpacing: fontSize.fs30 * trackingTight,
  },
});

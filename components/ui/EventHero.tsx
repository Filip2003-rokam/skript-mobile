import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fontSize, fonts, heroFade, heroFadeStart, size, space, trackingTight } from '../../constants/theme';
import { Chip } from './Chip';
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
          <Chip label={eventName} />
          <Chip label="by" trailing={<SkriptMark size={fontSize.fs13} />} />
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
  title: {
    fontFamily: fonts.display,
    fontSize: fontSize.fs30,
    color: colors.ink,
    letterSpacing: fontSize.fs30 * trackingTight,
  },
});

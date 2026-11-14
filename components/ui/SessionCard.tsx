import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, fonts, pressScale, radius, shadow, size, space, tileText, trackingTight } from '../../constants/theme';
import { sessionClock, type SessionRow } from '../../lib/services/sessionService';

type SessionCardProps = {
  session: SessionRow;
  live?: boolean;
  onPress: () => void;
};

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase();
}

// Kartica predavanja kao u demou: vreme i sala gore, naslov, govornik, a desno pločica sa inicijalima.
export function SessionCard({ session, live = false, onPress }: SessionCardProps) {
  const time = sessionClock(session.start_time);
  const [first, ...others] = session.speakers;
  const meta = [time, session.room].filter(Boolean).join(' · ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={session.title}
      onPress={onPress}
      style={({ pressed }) => [styles.card, live && styles.live, pressed && { transform: [{ scale: pressScale }] }]}
    >
      <View style={styles.body}>
        <View style={styles.metaRow}>
          {live ? (
            <>
              <View style={styles.dot} />
              <Text style={styles.liveText}>Uživo</Text>
              <Text style={styles.meta}>·</Text>
            </>
          ) : null}
          <Text style={styles.meta}>{meta}</Text>
        </View>
        <Text style={styles.title}>{session.title}</Text>
        {first ? (
          <Text numberOfLines={1} style={styles.speaker}>
            {first}
            {others.length > 0 ? <Text style={styles.meta}>{` i još ${others.length}`}</Text> : null}
          </Text>
        ) : null}
      </View>
      {first ? (
        <View style={styles.tile}>
          <Text style={styles.tileText}>{initials(first)}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.gap,
    padding: space.card,
    borderRadius: radius.card,
    borderWidth: size.border,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  live: { borderColor: colors.live },
  body: { flex: 1, gap: space.tight },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space.tight },
  dot: { width: size.liveDot, height: size.liveDot, borderRadius: radius.pill, backgroundColor: colors.live },
  liveText: { fontFamily: fonts.semibold, fontSize: fontSize.fs12, color: colors.live },
  meta: { fontFamily: fonts.medium, fontSize: fontSize.fs12, color: colors.text2, fontVariant: ['tabular-nums'] },
  title: {
    fontFamily: fonts.bold,
    fontSize: fontSize.fs15,
    color: colors.ink,
    letterSpacing: fontSize.fs15 * trackingTight,
  },
  speaker: { fontFamily: fonts.semibold, fontSize: fontSize.fs13, color: colors.ink },
  tile: {
    width: size.speakerTile,
    height: size.speakerTile,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.tile,
    backgroundColor: colors.skriptYellowSoft,
  },
  tileText: { fontFamily: fonts.display, fontSize: size.speakerTile * tileText, color: colors.ink },
});

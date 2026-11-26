import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, fonts, opacity, pressScale, radius, shadow, size, space, tileText, trackingTight } from '../../constants/theme';
import { sessionClock, sessionEndClock, type SessionMark, type SessionRow } from '../../lib/services/sessionService';
import { t } from '../../lib/i18n';

type SessionCardProps = {
  session: SessionRow;
  mark?: SessionMark;
  onPress: () => void;
};

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase();
}

// Kartica predavanja kao u demou: vreme i sala u prvom redu, naslov, govornik, pločica desno.
export function SessionCard({ session, mark = 'upcoming', onPress }: SessionCardProps) {
  const time = sessionClock(session.start_time);
  const end = sessionEndClock(session.start_time, session.duration_min);
  const when = session.duration_min != null ? `${session.duration_min} min · ${time}` : end ? `${time}–${end}` : time;
  const [first, ...others] = session.speakers;
  const who = others.length === 0 ? first : others.length === 1 ? `${first}, ${others[0]}` : `${first} +${others.length}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={session.title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        mark === 'live' && styles.live,
        mark === 'ended' && styles.ended,
        pressed && { transform: [{ scale: pressScale }] },
      ]}
    >
      <View style={styles.body}>
        <Text style={styles.meta} numberOfLines={1}>
          {mark === 'live' ? <Text style={styles.liveText}>{`${t('session.live')} · `}</Text> : null}
          {mark === 'ended' ? <Text style={styles.endedText}>{`${t('session.ended')} · `}</Text> : null}
          <Text style={styles.when}>{when}</Text>
          {session.room ? ` · ${session.room}` : ''}
        </Text>
        <Text numberOfLines={2} style={styles.title}>
          {session.title}
        </Text>
        {who ? (
          <Text numberOfLines={1} style={styles.speaker}>
            {who}
          </Text>
        ) : null}
      </View>
      {first ? (
        <View style={styles.tile}>
          <Text style={styles.tileText}>{initials(first)}</Text>
          {others.length > 0 ? (
            <View style={styles.more}>
              <Text style={styles.moreText}>+{others.length}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: space.gap,
    padding: space.gap,
    borderRadius: radius.card,
    borderWidth: size.border,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  live: { borderColor: colors.live, borderWidth: size.ring },
  ended: { opacity: opacity.ended },
  body: { flex: 1, gap: space.tight, paddingVertical: space.tight / 2 },
  meta: { fontFamily: fonts.semibold, fontSize: fontSize.fs11, color: colors.text2, fontVariant: ['tabular-nums'] },
  liveText: { fontFamily: fonts.bold, fontSize: fontSize.fs11, color: colors.live },
  endedText: { fontFamily: fonts.semibold, fontSize: fontSize.fs11, color: colors.text3 },
  when: { fontFamily: fonts.semibold, fontSize: fontSize.fs11, color: colors.ink },
  title: {
    fontFamily: fonts.bold,
    fontSize: fontSize.fs15,
    color: colors.ink,
    letterSpacing: fontSize.fs15 * trackingTight,
  },
  speaker: { fontFamily: fonts.semibold, fontSize: fontSize.fs12, color: colors.ink },
  tile: {
    width: size.speakerTile,
    height: size.speakerTile,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.tile,
    backgroundColor: colors.skriptYellowSoft,
  },
  tileText: { fontFamily: fonts.display, fontSize: size.speakerTile * tileText, color: colors.ink },
  more: {
    position: 'absolute',
    right: -space.tight,
    bottom: -space.tight,
    minWidth: size.chipSm - space.tight,
    height: size.chipSm - space.tight,
    paddingHorizontal: space.tight,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: size.border,
    borderColor: colors.hairline,
  },
  moreText: { fontFamily: fonts.bold, fontSize: fontSize.fs11, color: colors.ink },
});

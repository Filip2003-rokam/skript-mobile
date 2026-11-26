import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { InlineError } from '../ui/State';
import { Sheet } from '../ui/Sheet';
import { colors, fontSize, fonts, radius, size, space, trackingTight } from '../../constants/theme';
import { sessionClock, sessionEndClock, type SessionMark, type SessionRow } from '../../lib/services/sessionService';
import { t } from '../../lib/i18n';

type SessionSheetProps = {
  session: SessionRow | null;
  mark: SessionMark;
  open: boolean;
  onClose: () => void;
  saved?: boolean;
  saveError?: string | null;
  onToggleSave?: () => void;
};

export function SessionSheet({ session, mark, open, onClose, saved = false, saveError = null, onToggleSave }: SessionSheetProps) {
  const time = session ? sessionClock(session.start_time) : '';
  const end = session ? sessionEndClock(session.start_time, session.duration_min) : '';
  const span = time && end ? `${time}–${end}` : time;
  const where = [session?.room, session?.day ? t('agenda.dayN', { day: session.day }) : '', span].filter(Boolean).join(' · ');
  return (
    <Sheet open={open && session != null} onClose={onClose}>
      {session ? (
        <View style={styles.body}>
          {where ? <Text style={styles.meta}>{where}</Text> : null}
          <Text style={styles.title}>{session.title}</Text>
          {session.speakers.map((name) => (
            <View key={name} style={styles.speaker}>
              <Avatar name={name} size={size.logoSm} />
              <Text style={styles.speakerName}>{name}</Text>
            </View>
          ))}
          <Status mark={mark} />
          {onToggleSave ? (
            <Button size="sm" variant={saved ? 'secondary' : 'primary'} label={saved ? t('session.saved') : t('session.save')} onPress={onToggleSave}>
              <Feather name={saved ? 'check' : 'bookmark'} size={size.iconSm} color={saved ? colors.ink : colors.onInk} />
            </Button>
          ) : null}
          {saveError ? <InlineError text={saveError} /> : null}
        </View>
      ) : null}
    </Sheet>
  );
}

function Status({ mark }: { mark: SessionMark }) {
  if (mark === 'live') {
    return (
      <View style={styles.live}>
        <View style={styles.dot} />
        <Text style={styles.liveText}>{t('session.live')}</Text>
      </View>
    );
  }
  return <Text style={mark === 'ended' ? styles.ended : styles.upcoming}>{mark === 'ended' ? t('session.ended') : t('session.soon')}</Text>;
}

const styles = StyleSheet.create({
  body: { gap: space.gap },
  meta: { fontFamily: fonts.semibold, fontSize: fontSize.fs12, color: colors.text2, fontVariant: ['tabular-nums'] },
  title: {
    fontFamily: fonts.bold,
    fontSize: fontSize.fs17,
    color: colors.ink,
    letterSpacing: fontSize.fs17 * trackingTight,
  },
  speaker: { flexDirection: 'row', alignItems: 'center', gap: space.tight * 2 },
  speakerName: { fontFamily: fonts.semibold, fontSize: fontSize.fs12, color: colors.ink },
  live: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.tight,
    height: size.chipSm,
    paddingHorizontal: space.gap,
    borderRadius: radius.pill,
    backgroundColor: colors.live,
  },
  dot: { width: size.liveDot, height: size.liveDot, borderRadius: radius.pill, backgroundColor: colors.onInk },
  liveText: { fontFamily: fonts.bold, fontSize: fontSize.fs12, color: colors.onInk },
  ended: { fontFamily: fonts.semibold, fontSize: fontSize.fs12, color: colors.text3 },
  upcoming: { fontFamily: fonts.semibold, fontSize: fontSize.fs12, color: colors.text2 },
});

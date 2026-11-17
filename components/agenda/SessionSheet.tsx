import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSize, fonts, radius, shadow, size, space, trackingTight } from '../../constants/theme';
import { sessionClock, type SessionRow } from '../../lib/services/sessionService';

type SessionSheetProps = {
  session: SessionRow | null;
  open: boolean;
  onClose: () => void;
};

export function SessionSheet({ session, open, onClose }: SessionSheetProps) {
  const insets = useSafeAreaInsets();
  const time = session ? sessionClock(session.start_time) : '';
  return (
    <Modal visible={open} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.modal}>
        <Pressable accessibilityLabel="Zatvori" style={[StyleSheet.absoluteFill, styles.scrim]} onPress={onClose} />
        {session ? (
          <View style={[styles.sheet, { marginBottom: Math.max(insets.bottom, space.gap) }]}>
            <View style={styles.handle} />
            {time ? <Text style={styles.time}>{time}</Text> : null}
            <Text style={styles.modalTitle}>{session.title}</Text>
            {session.room ? <Text style={styles.meta}>{session.room}</Text> : null}
            {session.speakers.length > 0 ? <Text style={styles.meta}>{session.speakers.join(', ')}</Text> : null}
            {session.duration_min != null ? <Text style={styles.meta}>Trajanje: {session.duration_min} min</Text> : null}
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  time: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.fs13,
    color: colors.text2,
    fontVariant: ['tabular-nums'],
  },
  meta: {
    fontFamily: fonts.regular,
    fontSize: fontSize.fs13,
    color: colors.text2,
  },
  modal: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    backgroundColor: colors.scrim,
  },
  sheet: {
    gap: space.gap,
    marginHorizontal: space.gap,
    maxHeight: '80%',
    borderRadius: radius.panel,
    padding: space.edge,
    backgroundColor: colors.glassStrong,
    ...shadow.lift,
  },
  handle: {
    alignSelf: 'center',
    width: size.emptyIcon,
    height: size.dot + size.ring,
    borderRadius: radius.pill,
    backgroundColor: colors.hairline,
  },
  modalTitle: {
    fontFamily: fonts.bold,
    fontSize: fontSize.fs22,
    color: colors.ink,
    letterSpacing: fontSize.fs22 * trackingTight,
  },
});

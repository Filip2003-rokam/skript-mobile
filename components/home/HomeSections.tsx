import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { SessionCard } from '../ui/SessionCard';
import { colors, fontSize, fonts, size, space, trackingTight, trackingWide } from '../../constants/theme';
import type { SessionRow } from '../../lib/services/sessionService';

export function Section({ title, live = false, children }: { title: string; live?: boolean; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        {live ? <View style={styles.dot} /> : null}
        <Text style={styles.eyebrow}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

export function SessionList({ sessions, live = false }: { sessions: SessionRow[]; live?: boolean }) {
  return sessions.map((session) => (
    <SessionCard key={session.id} session={session} live={live} onPress={() => router.push('/agenda')} />
  ));
}

// Istaknuta kartica na vrhu, kao "Beleške su spremne" u demou: jedna rečenica i jedno dugme.
export function Featured({ eyebrow, title, text, action, onPress }: { eyebrow: string; title: string; text: string; action: string; onPress: () => void }) {
  return (
    <Card variant="featured">
      <View style={styles.featured}>
        <View style={styles.heading}>
          <Feather name="users" size={size.iconSm} color={colors.ink} />
          <Text style={styles.eyebrow}>{eyebrow}</Text>
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.text}>{text}</Text>
        <Button label={action} onPress={onPress} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.gap },
  heading: { flexDirection: 'row', alignItems: 'center', gap: space.tight },
  dot: { width: size.liveDot, height: size.liveDot, borderRadius: size.liveDot, backgroundColor: colors.live },
  eyebrow: {
    fontFamily: fonts.bold,
    fontSize: fontSize.fs11,
    color: colors.text2,
    letterSpacing: trackingWide,
    textTransform: 'uppercase',
  },
  featured: { gap: space.gap },
  title: {
    fontFamily: fonts.display,
    fontSize: fontSize.fs22,
    color: colors.ink,
    letterSpacing: fontSize.fs22 * trackingTight,
  },
  text: { fontFamily: fonts.regular, fontSize: fontSize.fs13, color: colors.text2 },
});

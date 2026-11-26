import type { ReactNode } from 'react';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Chip } from '../ui/Chip';
import { colors, fontSize, fonts, radius, size, space, trackingTight } from '../../constants/theme';
import { MatchOpeners } from './MatchOpeners';
import { actionError, displayName, Kicker, RoleLine } from './personBits';
import { t } from '../../lib/i18n';

type PersonMatchCardProps = {
  name: string | null;
  role: string | null;
  company: string | null;
  score: number;
  why: string | null;
  matchedMine: string | null;
  matchedTheirs: string | null;
  openers: string[];
  saved: boolean;
  onInterest: () => Promise<void>;
  onSkip: () => Promise<void>;
  onToggleSave: () => Promise<void>;
  /** Otvoren ili zakazan sastanak sa ovom osobom. */
  meetingLine?: ReactNode;
  onMeet?: () => void;
};

const tile = size.logo + size.dot;

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase();
}

export function PersonMatchCard(props: PersonMatchCardProps) {
  const [open, setOpen] = useState(false);
  const [tips, setTips] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [acting, setActing] = useState(false);
  const person = displayName(props.name);

  async function run(action: () => Promise<void>) {
    setActing(true);
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(actionError(cause));
    } finally {
      setActing(false);
    }
  }

  async function toggleSave() {
    setSaving(true);
    setError(null);
    try {
      await props.onToggleSave();
    } catch (cause) {
      setError(actionError(cause));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card variant="surface" style={styles.card}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen((value) => !value)} style={styles.top}>
        <View style={styles.identity}>
          <Text style={styles.scoreLine}>
            <Text style={styles.score}>{props.score}/10</Text>
            {` ${t('match.matchWord')}`}
            {props.saved ? ` · ${t('common.saved')}` : ''}
          </Text>
          <Text numberOfLines={1} style={styles.name}>{person}</Text>
          <RoleLine compact role={props.role} company={props.company} />
          <Kicker text={t('match.whyMeet')} />
          {props.why ? <Text numberOfLines={open ? undefined : 2} style={styles.why}>{props.why}</Text> : null}
        </View>
        <View style={styles.side}>
          <View style={styles.tile}><Text style={styles.tileText}>{initials(person)}</Text></View>
          <Feather name={open ? 'chevron-up' : 'chevron-down'} size={size.iconSm} color={colors.text2} />
        </View>
      </Pressable>
      <View style={styles.actions}>
        <Button size="sm" label={t('match.interested')} disabled={acting} onPress={() => void run(props.onInterest)} style={styles.action}>
          <Feather name="heart" size={size.iconSm} color={colors.onInk} />
        </Button>
        <Button size="sm" variant="secondary" label={t('common.skip')} disabled={acting} onPress={() => void run(props.onSkip)} style={styles.action}>
          <Feather name="x" size={size.iconSm} color={colors.ink} />
        </Button>
      </View>
      {open ? (
        <>
          {props.matchedMine && props.matchedTheirs ? (
            <View style={styles.block}>
              <Kicker text={t('match.match')} />
              <View style={styles.chips}>
                <Chip label={props.matchedMine} selected small />
                <Text style={styles.arrow}>↔</Text>
                <Chip label={props.matchedTheirs} small />
              </View>
            </View>
          ) : null}
          <View style={styles.more}>
            <Button size="sm" variant="secondary" label={props.saved ? t('common.saved') : t('common.save')} disabled={saving} onPress={() => void toggleSave()}>
              <Feather name="bookmark" size={size.iconSm} color={colors.ink} />
            </Button>
            <Button size="sm" variant="secondary" label={t('match.howStart')} onPress={() => setTips((value) => !value)}>
              <Feather name="zap" size={size.iconSm} color={colors.ink} />
            </Button>
            {props.onMeet && !props.meetingLine ? (
              <Button size="sm" variant="secondary" label={t('meetings.suggest')} onPress={props.onMeet}>
                <Feather name="calendar" size={size.iconSm} color={colors.ink} />
              </Button>
            ) : null}
          </View>
          {tips ? <MatchOpeners lines={props.openers.slice(0, 2)} /> : null}
        </>
      ) : null}
      {props.meetingLine ?? null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: space.gap, gap: space.chip - size.ring },
  top: { flexDirection: 'row', alignItems: 'stretch', gap: space.gap },
  identity: { flex: 1, minWidth: 0, gap: space.tight },
  scoreLine: { fontFamily: fonts.semibold, fontSize: fontSize.fs11, color: colors.text2 },
  score: { fontFamily: fonts.bold, fontSize: fontSize.fs11, color: colors.ink },
  name: {
    fontFamily: fonts.bold,
    fontSize: fontSize.fs15,
    color: colors.ink,
    letterSpacing: fontSize.fs15 * trackingTight,
  },
  why: { fontFamily: fonts.regular, fontSize: fontSize.fs12, lineHeight: fontSize.fs17, color: colors.ink },
  side: { alignItems: 'center', justifyContent: 'space-between' },
  tile: {
    width: tile,
    height: tile,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.tile,
    backgroundColor: colors.skriptYellowSoft,
  },
  tileText: { fontFamily: fonts.display, fontSize: fontSize.fs22, color: colors.ink },
  actions: { flexDirection: 'row', gap: space.tight * 2 },
  action: { flex: 1, alignSelf: 'stretch' },
  block: { gap: space.tight },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.tight + size.ring },
  arrow: { fontFamily: fonts.regular, fontSize: fontSize.fs13, color: colors.text3 },
  more: { flexDirection: 'row', flexWrap: 'wrap', gap: space.tight * 2 },
  error: { fontFamily: fonts.regular, fontSize: fontSize.fs13, color: colors.destructive },
});

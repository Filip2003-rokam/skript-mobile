import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Chip } from '../ui/Chip';
import { colors, fontSize, fonts, radius, size, space } from '../../constants/theme';
import { MatchOpeners } from './MatchOpeners';
import { actionError, displayName, Kicker, RoleLine } from './personBits';

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
  sent: boolean;
  connected: boolean;
  onConnect: (message: string) => Promise<void>;
  onToggleSave: () => Promise<void>;
};

export function PersonMatchCard(props: PersonMatchCardProps) {
  const [connecting, setConnecting] = useState(false);
  const [note, setNote] = useState('');
  const [tips, setTips] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const person = displayName(props.name);
  const locked = props.sent || props.connected;

  async function send() {
    setSending(true);
    setError(null);
    try {
      await props.onConnect(note);
    } catch (cause) {
      setError(actionError(cause));
    } finally {
      setSending(false);
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
    <Card variant="surface">
      <View style={styles.body}>
        <View style={styles.header}>
          <Avatar name={person} />
          <View style={styles.identity}>
            <Text numberOfLines={1} style={styles.name}>
              {person}
            </Text>
            <RoleLine role={props.role} company={props.company} />
          </View>
          <View style={styles.score}>
            <Text style={styles.scoreText}>{props.score}/10</Text>
          </View>
        </View>
        <View style={styles.block}>
          <Kicker text="ZAŠTO DA SE UPOZNATE" />
          {props.why ? <Text style={styles.why}>{props.why}</Text> : null}
        </View>
        {props.matchedMine && props.matchedTheirs ? (
          <View style={styles.block}>
            <Kicker text="POKLAPANJE" />
            <View style={styles.chips}>
              <Chip label={props.matchedMine} selected small />
              <Text style={styles.arrow}>↔</Text>
              <Chip label={props.matchedTheirs} small />
            </View>
          </View>
        ) : null}
        {connecting && !locked ? (
          <View style={styles.block}>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Dodaj kratku poruku"
              accessibilityLabel="Dodaj kratku poruku"
              placeholderTextColor={colors.text3}
              maxLength={280}
              style={styles.note}
            />
            <Button size="sm" label="Pošalji zahtev" disabled={sending} onPress={() => void send()}>
              <Feather name="send" size={size.iconSm} color={colors.onInk} />
            </Button>
          </View>
        ) : (
          <View style={styles.actions}>
            <Button
              size="sm"
              label={props.connected ? 'Povezani' : props.sent ? 'Zahtev poslat' : 'Poveži se'}
              disabled={locked}
              onPress={() => setConnecting(true)}
            >
              <Feather name={locked ? 'check' : 'user-plus'} size={size.iconSm} color={colors.onInk} />
            </Button>
            <Button size="sm" variant="secondary" label={props.saved ? 'Sačuvano' : 'Sačuvaj'} disabled={saving} onPress={() => void toggleSave()}>
              <Feather name="bookmark" size={size.iconSm} color={colors.ink} />
            </Button>
            <Button size="sm" variant="secondary" label="Kako da počnem?" onPress={() => setTips((open) => !open)}>
              <Feather name="zap" size={size.iconSm} color={colors.ink} />
            </Button>
          </View>
        )}
        {tips ? <MatchOpeners lines={props.openers.slice(0, 2)} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  body: { gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.gap },
  identity: { flex: 1, minWidth: 0 },
  name: { fontFamily: fonts.bold, fontSize: fontSize.fs13, color: colors.ink },
  score: {
    height: 24,
    justifyContent: 'center',
    paddingHorizontal: space.gap,
    borderRadius: radius.pill,
    backgroundColor: colors.skriptYellow,
  },
  scoreText: { fontFamily: fonts.bold, fontSize: fontSize.fs11, color: colors.onSignal, fontVariant: ['tabular-nums'] },
  block: { gap: space.tight },
  why: { fontFamily: fonts.regular, fontSize: fontSize.fs13, lineHeight: 18, color: colors.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  arrow: { fontFamily: fonts.regular, fontSize: fontSize.fs13, color: colors.text3 },
  note: {
    height: size.field,
    paddingHorizontal: space.buttonMd,
    borderRadius: radius.pill,
    backgroundColor: colors.fillSubtle,
    fontFamily: fonts.regular,
    fontSize: fontSize.fs15,
    color: colors.ink,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.gap },
  error: { fontFamily: fonts.regular, fontSize: fontSize.fs13, color: colors.ink },
});

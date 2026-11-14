import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Chip } from '../ui/Chip';
import { colors, fontSize, fonts, size, space } from '../../constants/theme';
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
  onInterest: () => Promise<void>;
  onSkip: () => Promise<void>;
  onToggleSave: () => Promise<void>;
};

export function PersonMatchCard(props: PersonMatchCardProps) {
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
          <Chip label={`${props.score}/10`} selected small />
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
        <View style={styles.actions}>
          <Button size="sm" label="Zainteresovan" disabled={acting} onPress={() => void run(props.onInterest)}>
            <Feather name="user-plus" size={size.iconSm} color={colors.onInk} />
          </Button>
          <Button size="sm" variant="secondary" label="Preskoči" disabled={acting} onPress={() => void run(props.onSkip)}>
            <Feather name="x" size={size.iconSm} color={colors.ink} />
          </Button>
          <Button size="sm" variant="secondary" label={props.saved ? 'Sačuvano' : 'Sačuvaj'} disabled={saving} onPress={() => void toggleSave()}>
            <Feather name="bookmark" size={size.iconSm} color={colors.ink} />
          </Button>
          <Button size="sm" variant="secondary" label="Kako da počnem?" onPress={() => setTips((open) => !open)}>
            <Feather name="zap" size={size.iconSm} color={colors.ink} />
          </Button>
        </View>
        {tips ? <MatchOpeners lines={props.openers.slice(0, 2)} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.gap },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.gap },
  identity: { flex: 1, minWidth: 0 },
  name: { fontFamily: fonts.bold, fontSize: fontSize.fs13, color: colors.ink },
  block: { gap: space.tight },
  why: { fontFamily: fonts.regular, fontSize: fontSize.fs13, color: colors.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.gap },
  arrow: { fontFamily: fonts.regular, fontSize: fontSize.fs13, color: colors.text3 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.gap },
  error: { fontFamily: fonts.regular, fontSize: fontSize.fs13, color: colors.ink },
});

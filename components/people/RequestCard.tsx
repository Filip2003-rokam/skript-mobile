import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { colors, fontSize, fonts, size, space } from '../../constants/theme';
import type { ConnectionStatus } from '../../lib/services/connectionService';
import { actionError, displayName, Kicker, RoleLine } from './personBits';

type RequestCardProps = {
  name: string | null;
  role: string | null;
  company: string | null;
  message: string | null;
  status: ConnectionStatus;
  email: string | null;
  phone: string | null;
  onAccept: () => Promise<void>;
  onDecline: () => Promise<void>;
};

export function RequestCard(props: RequestCardProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const person = displayName(props.name);

  async function answer(next: 'accepted' | 'declined') {
    setBusy(true);
    setError(null);
    try {
      await (next === 'accepted' ? props.onAccept() : props.onDecline());
    } catch (cause) {
      setError(actionError(cause));
    } finally {
      setBusy(false);
    }
  }

  if (props.status === 'declined') {
    return (
      <Card>
        <Text style={styles.aside}>Odbijeno. Kontakt podaci se ne dele.</Text>
      </Card>
    );
  }

  return (
    <Card>
      <View style={styles.body}>
        <View style={styles.header}>
          <Avatar name={person} size={44} />
          <View style={styles.identity}>
            <Text style={styles.title}>{person} želi da se poveže</Text>
            <RoleLine role={props.role} company={props.company} />
          </View>
        </View>
        {props.message ? (
          <View style={styles.block}>
            <Kicker text="NAPISAO/LA JE" />
            <Text style={styles.message}>"{props.message}"</Text>
          </View>
        ) : null}
        {props.status === 'pending' ? (
          <View style={styles.actions}>
            <Button size="sm" label="Prihvati" disabled={busy} onPress={() => void answer('accepted')}>
              <Feather name="check" size={size.iconSm} color={colors.onInk} />
            </Button>
            <Button size="sm" variant="secondary" label="Ne sada" disabled={busy} onPress={() => void answer('declined')} />
          </View>
        ) : (
          <View style={styles.block}>
            {props.email ? <ContactLink icon="mail" value={props.email} url={`mailto:${props.email}`} /> : null}
            {props.phone ? <ContactLink icon="phone" value={props.phone} url={`tel:${props.phone.replace(/\s/g, '')}`} /> : null}
            <Text style={styles.saved}>Sačuvano u kontakte</Text>
          </View>
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </Card>
  );
}

function ContactLink({ icon, value, url }: { icon: 'mail' | 'phone'; value: string; url: string }) {
  return (
    <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(url)} style={styles.link}>
      <Feather name={icon} size={size.iconSm} color={colors.text2} />
      <Text style={styles.linkText}>{value}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.gap },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.gap },
  identity: { flex: 1, minWidth: 0 },
  title: { fontFamily: fonts.bold, fontSize: fontSize.fs15, color: colors.ink },
  block: { gap: space.tight },
  message: { fontFamily: fonts.regular, fontSize: fontSize.fs15, color: colors.ink },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.gap },
  link: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: space.gap },
  linkText: { flex: 1, fontFamily: fonts.regular, fontSize: fontSize.fs15, color: colors.ink },
  saved: { fontFamily: fonts.semibold, fontSize: fontSize.fs13, color: colors.ink },
  aside: { fontFamily: fonts.regular, fontSize: fontSize.fs13, color: colors.text2 },
  error: { fontFamily: fonts.regular, fontSize: fontSize.fs13, color: colors.ink },
});

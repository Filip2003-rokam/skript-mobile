import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { VoiceNote } from '../voice/VoiceNote';
import { colors, fontSize, fonts, size, space, trackingTight } from '../../constants/theme';
import type { Contact } from '../../lib/services/contactService';

type SavedSwapProps = {
  contact: Contact;
  onLater: () => void;
  onSave: (value: { note: string | null; followUpDate: string | null; followUpDraft: string | null }) => Promise<void>;
};

export function SavedSwap({ contact, onLater, onSave }: SavedSwapProps) {
  const [offer, setOffer] = useState(true);
  const role = [contact.jobTitle, contact.company].filter(Boolean).join(' · ');
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Sačuvano u kontakte</Text>
      <Card variant="surface" style={styles.person}>
        <Avatar name={contact.fullName} size={size.buttonSm} />
        <View style={styles.identity}>
          <Text numberOfLines={1} style={styles.name}>{contact.fullName}</Text>
          {role ? <Text numberOfLines={1} style={styles.role}>{role}</Text> : null}
        </View>
        <Feather name="check" size={size.iconMd} color={colors.ink} />
      </Card>
      {offer ? (
        <>
          <Text style={styles.body}>Za nedelju dana nećeš se sećati o čemu ste pričali. Reci sada, do 30 sekundi: Skript to zapiše i napiše follow-up.</Text>
          <Button label="Snimi glasovnu belešku" onPress={() => setOffer(false)}>
            <Feather name="mic" size={size.iconMd} color={colors.onInk} />
          </Button>
          <Button label="Kasnije" variant="ghost" onPress={onLater} />
        </>
      ) : (
        <VoiceNote existingNote={contact.note} existingDate={contact.followUpDate} email={contact.email} onSave={onSave} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.card },
  title: {
    fontFamily: fonts.bold,
    fontSize: fontSize.fs22,
    color: colors.ink,
    letterSpacing: fontSize.fs22 * trackingTight,
  },
  person: { flexDirection: 'row', alignItems: 'center', gap: space.gap, padding: space.gap },
  identity: { flex: 1, minWidth: 0 },
  name: { fontFamily: fonts.bold, fontSize: fontSize.fs15, color: colors.ink },
  role: { fontFamily: fonts.regular, fontSize: fontSize.fs12, color: colors.text2 },
  body: { fontFamily: fonts.regular, fontSize: fontSize.fs13, lineHeight: fontSize.fs22, color: colors.text2 },
});

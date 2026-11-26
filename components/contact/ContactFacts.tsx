import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../ui/Avatar';
import { colors, fontSize, fonts, size, space, trackingWide } from '../../constants/theme';
import { toDisplayDate } from '../../lib/contactDates';
import type { Contact } from '../../lib/services/contactService';
import { t } from '../../lib/i18n';

function linkUrl(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

export function ContactHeading({ name, event }: { name: string; event: string | null }) {
  return (
    <View style={styles.head}>
      <Avatar name={name} size={size.emptyIcon} />
      <View style={styles.identity}>
        <Text style={styles.name}>{name}</Text>
        {event ? <Text style={styles.event}>{event}</Text> : null}
      </View>
    </View>
  );
}

export function ContactFacts({ contact }: { contact: Contact }) {
  return (
    <View style={styles.facts}>
      <Fact label={t('fields.role')} value={contact.jobTitle} />
      <Fact label={t('fields.company')} value={contact.company} />
      <Fact label={t('fields.email')} value={contact.email} onPress={contact.email ? () => void Linking.openURL(`mailto:${contact.email}`) : undefined} />
      <Fact label={t('fields.phone')} value={contact.phone} onPress={contact.phone ? () => void Linking.openURL(`tel:${contact.phone?.replace(/\s/g, '')}`) : undefined} />
      <Fact label={t('fields.linkedin')} value={contact.linkedinUrl} onPress={contact.linkedinUrl ? () => void Linking.openURL(linkUrl(contact.linkedinUrl ?? '')) : undefined} />
      <Fact label={t('fields.note')} value={contact.note} />
      <Fact label={t('fields.followUp')} value={toDisplayDate(contact.followUpDate) || null} />
    </View>
  );
}

function Fact({ label, value, onPress }: { label: string; value: string | null; onPress?: () => void }) {
  const text = value?.trim() ? value : '—';
  const content = <Text style={[styles.value, onPress && value ? styles.link : null]}>{text}</Text>;
  return (
    <View style={styles.fact}>
      <Text style={styles.label}>{label}</Text>
      {onPress && value ? <Pressable onPress={onPress}>{content}</Pressable> : content}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space.gap },
  identity: { flex: 1, minWidth: 0 },
  name: { fontFamily: fonts.bold, fontSize: fontSize.fs17, color: colors.ink },
  event: { fontFamily: fonts.regular, fontSize: fontSize.fs11, color: colors.text2 },
  facts: { gap: space.gap },
  fact: { gap: space.tight },
  label: { fontFamily: fonts.bold, fontSize: fontSize.fs11, color: colors.text2, textTransform: 'uppercase', letterSpacing: trackingWide },
  value: { fontFamily: fonts.regular, fontSize: fontSize.fs15, color: colors.ink },
  link: { textDecorationLine: 'underline' },
});

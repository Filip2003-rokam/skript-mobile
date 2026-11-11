import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { colors, fontSize, fonts, pressScale, radius, size, space } from '../../constants/theme';
import { followUpIsDue, toDisplayDate } from '../../lib/contactDates';
import { authErrorMessage } from '../../lib/services/authService';
import { listContacts, type ContactListItem } from '../../lib/services/contactService';

export function ContactList({ version }: { version: number }) {
  const [search, setSearch] = useState('');
  const [due, setDue] = useState(false);
  const [rows, setRows] = useState<ContactListItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (version === 0) return;
    let active = true;
    const timer = setTimeout(() => {
      listContacts(search)
        .then((list) => {
          if (!active) return;
          setRows(list);
          setError(null);
        })
        .catch((cause) => {
          if (active) setError(authErrorMessage(cause));
        });
    }, search.trim() ? 250 : 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, version]);

  const shown = due ? rows.filter((row) => followUpIsDue(row.followUpDate, row.followUpDone)) : rows;
  const groups = new Map<string, ContactListItem[]>();
  for (const row of shown) {
    const key = row.eventName ?? 'Bez eventa';
    const list = groups.get(key);
    if (list) list.push(row);
    else groups.set(key, [row]);
  }
  const names = [...groups.keys()].sort((a, b) => (a === 'Bez eventa' ? 1 : b === 'Bez eventa' ? -1 : a.localeCompare(b, 'sr')));

  return (
    <View style={styles.list}>
      <View style={styles.tools}>
        <View style={styles.pill}>
          <Feather name="search" size={size.iconSm} color={colors.text2} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Ime, firma, beleška"
            placeholderTextColor={colors.text3}
            accessibilityLabel="Pretraga kontakata"
            style={styles.input}
          />
        </View>
        <Button variant="icon" accessibilityLabel="Nov kontakt" onPress={() => router.push('/contact/new')}>
          <Feather name="plus" size={size.iconMd} color={colors.ink} />
        </Button>
      </View>
      <Chip label="Follow-up na redu" selected={due} icon={<Feather name="bell" size={13} color={colors.ink} />} onPress={() => setDue((value) => !value)} />
      {error ? <Text style={styles.empty}>{error}</Text> : null}
      {shown.length === 0 && !error ? <Text style={styles.empty}>{rows.length ? 'Nema kontakata za ovu pretragu.' : 'Još nema kontakata.'}</Text> : null}
      {names.map((name) => (
        <View key={name} style={styles.group}>
          <Text style={styles.groupTitle}>{name}</Text>
          {groups.get(name)?.map((contact) => (
            <Pressable
              key={contact.id}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/contact/[id]', params: { id: contact.id } })}
              style={({ pressed }) => [styles.row, pressed && { transform: [{ scale: pressScale }] }]}
            >
              <Avatar name={contact.fullName} />
              <View style={styles.identity}>
                <Text numberOfLines={1} style={styles.name}>{contact.fullName}</Text>
                {contact.company ? <Text numberOfLines={1} style={styles.company}>{contact.company}</Text> : null}
                <FollowUp contact={contact} />
              </View>
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}

function FollowUp({ contact }: { contact: ContactListItem }) {
  const date = toDisplayDate(contact.followUpDate);
  if (!contact.followUpDone && !date) return null;
  const due = followUpIsDue(contact.followUpDate, contact.followUpDone);
  return <Text style={[styles.follow, due && styles.followDue]}>{contact.followUpDone ? 'Follow-up poslat' : `Follow-up · ${date}`}</Text>;
}

const styles = StyleSheet.create({
  list: { gap: space.gap },
  tools: { flexDirection: 'row', alignItems: 'center', gap: space.gap },
  pill: {
    flex: 1,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.gap,
    paddingHorizontal: space.buttonMd,
    borderRadius: radius.pill,
    borderWidth: size.border,
    borderColor: colors.hairline,
    backgroundColor: colors.glass,
  },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: fontSize.fs13, color: colors.ink, padding: 0 },
  empty: { fontFamily: fonts.regular, fontSize: fontSize.fs13, color: colors.text2 },
  group: { gap: 6 },
  groupTitle: { marginTop: space.tight, fontFamily: fonts.bold, fontSize: fontSize.fs11, color: colors.text2, textTransform: 'uppercase', letterSpacing: 0.6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.gap, minHeight: 56, paddingVertical: 10, paddingHorizontal: space.gap, borderRadius: radius.card, backgroundColor: colors.surface },
  identity: { flex: 1, minWidth: 0 },
  name: { fontFamily: fonts.bold, fontSize: fontSize.fs13, color: colors.ink },
  company: { fontFamily: fonts.regular, fontSize: fontSize.fs13, color: colors.text2 },
  follow: { fontFamily: fonts.medium, fontSize: fontSize.fs11, color: colors.text2 },
  followDue: { color: colors.ink },
});

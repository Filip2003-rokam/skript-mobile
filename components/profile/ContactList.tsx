import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Chip } from '../ui/Chip';
import { EmptyState } from '../ui/EmptyState';
import { InlineError, LoadingState } from '../ui/State';
import { colors, fontSize, fonts, pressScale, radius, shadow, size, space, trackingWide } from '../../constants/theme';
import { followUpIsDue, toDisplayDate } from '../../lib/contactDates';
import { authErrorMessage } from '../../lib/services/authService';
import { listContacts, type ContactListItem } from '../../lib/services/contactService';

export function ContactList({ version }: { version: number }) {
  const [search, setSearch] = useState('');
  const [due, setDue] = useState(false);
  const [rows, setRows] = useState<ContactListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [attempt, setAttempt] = useState(0);

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
        })
        .finally(() => {
          if (active) setLoaded(true);
        });
    }, search.trim() ? 250 : 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, version, attempt]);

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
        <View style={styles.search}>
          <Feather name="search" size={size.iconSm} color={colors.text2} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Pretraga kontakata"
            placeholderTextColor={colors.text3}
            accessibilityLabel="Pretraga kontakata"
            style={styles.input}
          />
        </View>
        <Button variant="icon" accessibilityLabel="Nov kontakt" onPress={() => router.push('/contact/new')}>
          <Feather name="plus" size={size.iconMd} color={colors.ink} />
        </Button>
      </View>
      <Chip label="Follow-up na redu" selected={due} icon={<Feather name="bell" size={size.iconSm} color={colors.ink} />} onPress={() => setDue((value) => !value)} />
      {version === 0 || (!loaded && rows.length === 0 && !error) ? <LoadingState fill={false} /> : null}
      {error && rows.length === 0 ? (
        <EmptyState
          icon={<Feather name="alert-circle" size={size.iconMd} color={colors.ink} />}
          text={error}
          action="Pokušaj ponovo"
          onAction={() => setAttempt((value) => value + 1)}
        />
      ) : null}
      {error && rows.length > 0 ? <InlineError text={error} onRetry={() => setAttempt((value) => value + 1)} /> : null}
      {loaded && shown.length === 0 && !error ? (
        <EmptyState
          icon={<Feather name="book" size={size.iconMd} color={colors.ink} />}
          text={rows.length ? 'Nema kontakata za ovu pretragu. Obriši reč ili isključi filter.' : 'Još nema kontakata. Dodaj prvi preko plusa.'}
        />
      ) : null}
      {names.map((name) => (
        <View key={name} style={styles.group}>
          <Text style={styles.groupTitle}>{name}</Text>
          {groups.get(name)?.map((contact) => (
            <Pressable
              key={contact.id}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/contact/[id]', params: { id: contact.id } })}
              style={({ pressed }) => [pressed && { transform: [{ scale: pressScale }] }]}
            >
              <Card variant="surface" style={styles.card}>
                <Avatar name={contact.fullName} />
                <View style={styles.identity}>
                  <Text numberOfLines={1} style={styles.name}>{contact.fullName}</Text>
                  {contact.company ? <Text numberOfLines={1} style={styles.company}>{contact.company}</Text> : null}
                  <FollowUp contact={contact} />
                </View>
                <Feather name="chevron-right" size={size.iconSm} color={colors.text2} />
              </Card>
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
  return (
    <View style={styles.followRow}>
      {!contact.followUpDone ? <Feather name="bell" size={fontSize.fs11} color={due ? colors.ink : colors.text2} /> : null}
      <Text numberOfLines={1} style={[styles.follow, due && styles.followDue]}>{contact.followUpDone ? 'Follow-up poslat' : `Follow-up · ${date}`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.gap },
  tools: { flexDirection: 'row', alignItems: 'center', gap: space.gap },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.tight * 2,
    height: size.segmented,
    paddingHorizontal: space.card,
    borderRadius: radius.pill,
    borderWidth: size.border,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  input: { flex: 1, padding: 0, fontFamily: fonts.regular, fontSize: fontSize.fs13, color: colors.ink },
  group: { gap: space.tight + size.ring },
  groupTitle: { marginTop: space.tight, fontFamily: fonts.bold, fontSize: fontSize.fs11, color: colors.text2, textTransform: 'uppercase', letterSpacing: trackingWide },
  card: { flexDirection: 'row', alignItems: 'center', gap: space.gap, minHeight: size.nav, paddingHorizontal: space.gap, paddingVertical: space.chip - size.ring },
  identity: { flex: 1, minWidth: 0 },
  name: { fontFamily: fonts.bold, fontSize: fontSize.fs13, color: colors.ink },
  company: { fontFamily: fonts.regular, fontSize: fontSize.fs12, color: colors.text2 },
  followRow: { flexDirection: 'row', alignItems: 'center', gap: space.tight },
  follow: { flex: 1, fontFamily: fonts.medium, fontSize: fontSize.fs11, color: colors.text2 },
  followDue: { color: colors.ink },
});

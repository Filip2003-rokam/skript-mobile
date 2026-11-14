import { useCallback, useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Linking, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ContactForm } from '../../../components/ContactForm';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Screen, keyboardBehavior } from '../../../components/ui/Screen';
import { ErrorState, InlineError, LoadingState } from '../../../components/ui/State';
import { colors, fontSize, fonts, radius, size, space, trackingWide } from '../../../constants/theme';
import { toDisplayDate } from '../../../lib/contactDates';
import { authErrorMessage } from '../../../lib/services/authService';
import { deleteContact, getContact, updateContact, type Contact, type ContactWrite } from '../../../lib/services/contactService';

function linkUrl(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

export default function ContactScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const contactId = typeof id === 'string' ? id : '';
  const [contact, setContact] = useState<Contact | null>(null);
  const [ready, setReady] = useState(false);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setContact(null);
    setReady(false);
    setMissing(false);
    setError(null);
  }, [contactId]);

  const load = useCallback(() => {
    let active = true;
    getContact(contactId)
      .then((row) => {
        if (!active) return;
        setContact(row);
        setMissing(!row);
        setError(null);
      })
      .catch((cause) => {
        if (active) setError(authErrorMessage(cause));
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [contactId, attempt]);

  useFocusEffect(load);

  async function save(data: ContactWrite) {
    setSaving(true);
    setFormError(null);
    try {
      await updateContact(contactId, data);
      setContact(await getContact(contactId));
      setEditing(false);
      setNotice('Izmenjeno');
    } catch (cause) {
      setFormError(authErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  async function toggleSent(done: boolean) {
    setNotice(null);
    try {
      await updateContact(contactId, { followUpDone: done });
      setContact((current) => (current ? { ...current, followUpDone: done } : current));
      setNotice('Izmenjeno');
    } catch (cause) {
      setError(authErrorMessage(cause));
    }
  }

  function confirmDelete() {
    Alert.alert('Obrisati kontakt?', 'Kontakt se trajno briše.', [
      { text: 'Ne sada', style: 'cancel' },
      {
        text: 'Obriši',
        style: 'destructive',
        onPress: () => {
          deleteContact(contactId)
            .then(() => router.replace({ pathname: '/profile', params: { notice: 'deleted' } }))
            .catch((cause) => setError(authErrorMessage(cause)));
        },
      },
    ]);
  }

  if (!ready && !contact) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }
  if (error && !contact) {
    return (
      <Screen>
        <Button label="Nazad" variant="ghost" onPress={() => router.back()} />
        <ErrorState text={error} onRetry={() => setAttempt((value) => value + 1)} />
      </Screen>
    );
  }
  if (missing || !contact) {
    return (
      <Screen>
        <EmptyState
          icon={<Feather name="user" size={size.iconMd} color={colors.ink} />}
          text="Kontakt nije pronađen. Vrati se na listu kontakata."
          action="Nazad"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Button label="Nazad" variant="ghost" onPress={() => router.back()} />
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <Text style={styles.name}>{contact.fullName}</Text>
      <Fact label="Uloga" value={contact.jobTitle} />
      <Fact label="Firma" value={contact.company} />
      <Fact label="Mejl" value={contact.email} onPress={contact.email ? () => void Linking.openURL(`mailto:${contact.email}`) : undefined} />
      <Fact label="Telefon" value={contact.phone} onPress={contact.phone ? () => void Linking.openURL(`tel:${contact.phone?.replace(/\s/g, '')}`) : undefined} />
      <Fact label="LinkedIn" value={contact.linkedinUrl} onPress={contact.linkedinUrl ? () => void Linking.openURL(linkUrl(contact.linkedinUrl ?? '')) : undefined} />
      <Fact label="Event" value={contact.eventName} />
      <Fact label="Beleška" value={contact.note} />
      <Fact label="Follow-up" value={toDisplayDate(contact.followUpDate) || null} />
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Follow-up poslat</Text>
        <Switch
          value={contact.followUpDone}
          onValueChange={(done) => void toggleSent(done)}
          trackColor={{ true: colors.skriptYellow, false: colors.fillSubtle }}
          thumbColor={colors.surface}
        />
      </View>
      {error ? <InlineError text={error} onRetry={() => setAttempt((value) => value + 1)} /> : null}
      <View style={styles.actions}>
        <Button label="Izmeni" variant="secondary" onPress={() => setEditing(true)} />
        <Button label="Obriši" variant="ghost" onPress={confirmDelete} />
      </View>
      {editing ? (
        <Modal visible transparent animationType="slide" statusBarTranslucent onRequestClose={() => setEditing(false)}>
          <KeyboardAvoidingView behavior={keyboardBehavior} style={styles.modal}>
            <Pressable accessibilityLabel="Zatvori" style={[StyleSheet.absoluteFill, styles.scrim]} onPress={() => setEditing(false)} />
            <ScrollView style={styles.sheet} contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
              <Text style={styles.sheetTitle}>Izmeni kontakt</Text>
              <ContactForm contact={contact} saving={saving} error={formError} onSubmit={(data) => void save(data)} />
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      ) : null}
    </Screen>
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
  name: { fontFamily: fonts.bold, fontSize: fontSize.fs22, color: colors.ink },
  notice: { fontFamily: fonts.semibold, fontSize: fontSize.fs13, color: colors.ink },
  fact: { gap: space.tight },
  label: { fontFamily: fonts.bold, fontSize: fontSize.fs11, color: colors.text2, textTransform: 'uppercase', letterSpacing: trackingWide },
  value: { fontFamily: fonts.regular, fontSize: fontSize.fs15, color: colors.ink },
  link: { textDecorationLine: 'underline' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.gap },
  switchLabel: { fontFamily: fonts.semibold, fontSize: fontSize.fs15, color: colors.ink },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.gap },
  modal: { flex: 1, justifyContent: 'flex-end' },
  scrim: { backgroundColor: colors.scrim },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: radius.panel,
    borderTopRightRadius: radius.panel,
    backgroundColor: colors.appBg,
  },
  sheetContent: { gap: space.gap, padding: space.edge },
  sheetTitle: { fontFamily: fonts.bold, fontSize: fontSize.fs17, color: colors.ink },
});

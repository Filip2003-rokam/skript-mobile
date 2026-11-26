import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ContactFacts, ContactHeading } from '../../../components/contact/ContactFacts';
import { ContactEditModal } from '../../../components/ContactEditModal';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Screen } from '../../../components/ui/Screen';
import { ErrorState, InlineError, LoadingState } from '../../../components/ui/State';
import { WrittenFollowUp } from '../../../components/contact/WrittenFollowUp';
import { VoiceNote } from '../../../components/voice/VoiceNote';
import { colors, fontSize, fonts, size, space } from '../../../constants/theme';
import { authErrorMessage } from '../../../lib/services/authService';
import { deleteContact, getContact, updateContact, type Contact, type ContactWrite } from '../../../lib/services/contactService';
import { t } from '../../../lib/i18n';

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
      setNotice(t('common.edited'));
    } catch (cause) {
      setFormError(authErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  async function saveVoice(value: { note: string | null; followUpDate: string | null; followUpDraft: string | null }) {
    try {
      await updateContact(contactId, value);
      setContact(await getContact(contactId));
      setNotice(t('common.edited'));
    } catch (cause) {
      throw new Error(authErrorMessage(cause));
    }
  }

  async function toggleSent(done: boolean) {
    setNotice(null);
    try {
      await updateContact(contactId, { followUpDone: done });
      setContact((current) => (current ? { ...current, followUpDone: done } : current));
      setNotice(t('common.edited'));
    } catch (cause) {
      setError(authErrorMessage(cause));
    }
  }

  function confirmDelete() {
    Alert.alert(t('contact.deleteTitle'), t('contact.deleteBody'), [
      { text: t('common.notNow'), style: 'cancel' },
      {
        text: t('common.delete'),
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
        <Button label={t('common.back')} variant="ghost" onPress={() => router.back()} />
        <ErrorState text={error} onRetry={() => setAttempt((value) => value + 1)} />
      </Screen>
    );
  }
  if (missing || !contact) {
    return (
      <Screen>
        <EmptyState
          icon={<Feather name="user" size={size.iconMd} color={colors.ink} />}
          text={t('contact.notFound')}
          action={t('common.back')}
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Button label={t('common.back')} variant="ghost" onPress={() => router.back()} />
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <ContactHeading name={contact.fullName} event={contact.eventName} />
      <ContactFacts contact={contact} />
      <WrittenFollowUp
        note={contact.note}
        draft={contact.followUpDraft}
        name={contact.fullName}
        company={contact.company}
        eventName={contact.eventName}
        email={contact.email}
        done={contact.followUpDone}
        onDraft={async (followUpDraft) => {
          await updateContact(contactId, { followUpDraft });
          setContact((current) => (current ? { ...current, followUpDraft } : current));
        }}
        onMarkSent={() => toggleSent(true)}
      />
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>{t('contact.followUpSent')}</Text>
        <Switch
          value={contact.followUpDone}
          onValueChange={(done) => void toggleSent(done)}
          trackColor={{ true: colors.skriptYellow, false: colors.fillSubtle }}
          thumbColor={colors.surface}
        />
      </View>
      <VoiceNote existingNote={contact.note} existingDate={contact.followUpDate} email={contact.email} onSave={saveVoice} />
      {error ? <InlineError text={error} onRetry={() => setAttempt((value) => value + 1)} /> : null}
      <View style={styles.actions}>
        <Button label={t('common.edit')} variant="secondary" onPress={() => setEditing(true)} />
        <Button label={t('common.delete')} variant="ghost" onPress={confirmDelete} />
      </View>
      {editing ? (
        <ContactEditModal contact={contact} saving={saving} error={formError} onClose={() => setEditing(false)} onSubmit={(data) => void save(data)} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  notice: { fontFamily: fonts.semibold, fontSize: fontSize.fs13, color: colors.ink },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.gap },
  switchLabel: { fontFamily: fonts.semibold, fontSize: fontSize.fs15, color: colors.ink },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.gap },
});

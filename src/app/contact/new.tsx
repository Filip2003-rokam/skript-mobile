import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { ContactForm } from '../../../components/ContactForm';
import { Button } from '../../../components/ui/Button';
import { Screen } from '../../../components/ui/Screen';
import { ErrorState, LoadingState } from '../../../components/ui/State';
import { VoiceNote } from '../../../components/voice/VoiceNote';
import { colors, fontSize, fonts, space } from '../../../constants/theme';
import { useCurrentEvent } from '../../../lib/currentEvent';
import { authErrorMessage } from '../../../lib/services/authService';
import { createContact, type Contact, type ContactWrite } from '../../../lib/services/contactService';
import { getEventBySlug } from '../../../lib/services/eventService';
import { noteWithTopic, type VoiceDraft } from '../../../lib/services/voiceNoteService';

export default function NewContactScreen() {
  const { slug } = useCurrentEvent();
  const [eventId, setEventId] = useState<string | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(Boolean(slug));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [seed, setSeed] = useState<Partial<Contact> | null>(null);

  useEffect(() => {
    if (!slug) {
      setEventId(null);
      setLoadError(null);
      setLoadingEvent(false);
      return;
    }
    let active = true;
    setLoadingEvent(true);
    setLoadError(null);
    getEventBySlug(slug)
      .then((event) => {
        if (!active) return;
        if (!event) {
          setEventId(null);
          setLoadError('Ovaj event ne postoji. Vrati se i skeniraj QR kod.');
          return;
        }
        setEventId(event.id);
      })
      .catch((cause) => {
        if (active) setLoadError(authErrorMessage(cause));
      })
      .finally(() => {
        if (active) setLoadingEvent(false);
      });
    return () => {
      active = false;
    };
  }, [slug, attempt]);

  function fillFromVoice(result: VoiceDraft) {
    setSeed({
      fullName: result.fullName,
      jobTitle: result.jobTitle || null,
      company: result.company || null,
      email: result.email || null,
      phone: result.phone || null,
      note: noteWithTopic(result.note, result.topic),
      followUpDate: result.followUpDate,
      followUpDraft: result.followUpDraft,
    });
    setFormKey((value) => value + 1);
  }

  async function save(data: ContactWrite) {
    setSaving(true);
    setError(null);
    try {
      await createContact({ ...data, eventId });
      router.replace({ pathname: '/profile', params: { notice: 'saved' } });
    } catch (cause) {
      setError(authErrorMessage(cause));
      setSaving(false);
    }
  }

  if (loadingEvent && !eventId) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  if (loadError && !eventId) {
    return (
      <Screen>
        <Button label="Nazad" variant="ghost" onPress={() => router.back()} />
        <ErrorState text={loadError} onRetry={() => setAttempt((value) => value + 1)} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Button label="Nazad" variant="ghost" onPress={() => router.back()} />
      <Text style={styles.title}>Nov kontakt</Text>
      <VoiceNote onReady={fillFromVoice} />
      <ContactForm key={formKey} contact={seed} saving={saving} error={error} onSubmit={(data) => void save(data)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: fonts.bold,
    fontSize: fontSize.fs22,
    color: colors.ink,
    marginBottom: space.tight,
  },
});

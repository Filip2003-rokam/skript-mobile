import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { ContactForm } from '../../../components/ContactForm';
import { Button } from '../../../components/ui/Button';
import { Screen } from '../../../components/ui/Screen';
import { colors, fontSize, fonts, space } from '../../../constants/theme';
import { useCurrentEvent } from '../../../lib/currentEvent';
import { authErrorMessage } from '../../../lib/services/authService';
import { createContact, type ContactWrite } from '../../../lib/services/contactService';
import { getEventBySlug } from '../../../lib/services/eventService';

export default function NewContactScreen() {
  const { slug } = useCurrentEvent();
  const [eventId, setEventId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let active = true;
    getEventBySlug(slug)
      .then((event) => {
        if (active) setEventId(event?.id ?? null);
      })
      .catch(() => {
        if (active) setEventId(null);
      });
    return () => {
      active = false;
    };
  }, [slug]);

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

  return (
    <Screen scroll>
      <Button label="Nazad" variant="ghost" onPress={() => router.back()} />
      <Text style={styles.title}>Nov kontakt</Text>
      <ContactForm saving={saving} error={error} onSubmit={(data) => void save(data)} />
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

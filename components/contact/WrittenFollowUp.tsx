import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../ui/Button';
import { FollowUpDraftActions } from '../voice/FollowUpDraftActions';
import { colors, fontSize, fonts, space } from '../../constants/theme';
import { draftFollowUp, splitDraft, type FollowUpTone } from '../../lib/services/voiceNoteService';

type WrittenFollowUpProps = {
  note: string | null;
  draft: string | null;
  name: string;
  company: string | null;
  eventName: string | null;
  email: string | null;
  done: boolean;
  onDraft: (draft: string | null) => Promise<void>;
  onMarkSent: () => Promise<void>;
};

export function WrittenFollowUp({ note, draft, name, company, eventName, email, done, onDraft, onMarkSent }: WrittenFollowUpProps) {
  const saved = splitDraft(draft);
  const [subject, setSubject] = useState(saved.subject);
  const [body, setBody] = useState(saved.body);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function write(tone: FollowUpTone) {
    const source = note?.trim() ?? '';
    if (!source) {
      setError('Napiši belešku o razgovoru, pa onda follow-up.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const draft = await draftFollowUp({ note: source, name, company, event: eventName, tone });
      setSubject(draft.subject);
      setBody(draft.body);
      await onDraft(draft.followUpDraft);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Nacrt nije napisan. Pokušaj ponovo.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const next = splitDraft(draft);
    setSubject(next.subject);
    setBody(next.body);
  }, [draft]);

  return (
    <View style={styles.wrap}>
      <Button label="Napiši follow-up" variant="secondary" loading={busy} onPress={() => void write('plain')} />
      {subject || body ? (
        <>
          <Text style={styles.draft}>{subject ? `Predmet: ${subject}\n\n${body}` : body}</Text>
          <View style={styles.row}>
            <Button label="Kraće" size="sm" variant="secondary" disabled={busy} onPress={() => void write('shorter')} />
            <Button label="Formalnije" size="sm" variant="secondary" disabled={busy} onPress={() => void write('formal')} />
          </View>
          <FollowUpDraftActions email={email} subject={subject} body={body} copyLabel="Kopiraj" />
        </>
      ) : null}
      {done ? <Text style={styles.sent}>Označeno kao poslato. Mejl se ne šalje sam.</Text> : <Button label="Označi kao poslato" variant="ghost" onPress={() => void onMarkSent()} />}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.gap },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.gap },
  draft: { fontFamily: fonts.regular, fontSize: fontSize.fs15, color: colors.ink },
  sent: { fontFamily: fonts.regular, fontSize: fontSize.fs13, color: colors.text2 },
  error: { fontFamily: fonts.regular, fontSize: fontSize.fs13, color: colors.destructive },
});

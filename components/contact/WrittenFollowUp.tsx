import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { FollowUpDraftActions } from '../voice/FollowUpDraftActions';
import { colors, fontSize, fonts, size, space, trackingWide } from '../../constants/theme';
import { draftFollowUp, splitDraft, type FollowUpTone } from '../../lib/services/voiceNoteService';
import { t } from '../../lib/i18n';

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
  const [tone, setTone] = useState<FollowUpTone>('plain');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function write(next: FollowUpTone) {
    const source = note?.trim() ?? '';
    if (!source) {
      setError(t('followUp.writeNoteFirst'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await draftFollowUp({ note: source, name, company, event: eventName, tone: next });
      setTone(next);
      setSubject(result.subject);
      setBody(result.body);
      await onDraft(result.followUpDraft);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('followUp.draftFailed'));
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
      <Text style={styles.kicker}>{t('fields.followUp')}</Text>
      <Text style={styles.to}>{t('followUp.to')} <Text style={styles.who}>{name}</Text></Text>
      <Button label={t('followUp.write')} variant="secondary" loading={busy} onPress={() => void write('plain')} />
      {subject || body ? (
        <>
          {subject ? <Text style={styles.subject}><Text style={styles.to}>{t('followUp.subject')} </Text>{subject}</Text> : null}
          {body ? <Text style={styles.body}>{body}</Text> : null}
          <View style={styles.row}>
            <Chip label={t('followUp.shorter')} selected={tone === 'shorter'} disabled={busy} onPress={() => void write('shorter')} />
            <Chip label={t('followUp.formal')} selected={tone === 'formal'} disabled={busy} onPress={() => void write('formal')} />
          </View>
          <FollowUpDraftActions email={email} subject={subject} body={body} copyLabel={t('common.copy')} />
        </>
      ) : null}
      <Button label={done ? t('followUp.markedSent') : t('followUp.markSent')} variant="ghost" disabled={done} onPress={() => void onMarkSent()}>
        <Feather name="check" size={size.iconSm} color={colors.ink} />
      </Button>
      {done ? <Text style={styles.sent}>{t('followUp.notSentAuto')}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.gap },
  kicker: { fontFamily: fonts.semibold, fontSize: fontSize.fs11, color: colors.text2, textTransform: 'uppercase', letterSpacing: trackingWide },
  to: { fontFamily: fonts.regular, fontSize: fontSize.fs13, color: colors.text2 },
  who: { fontFamily: fonts.semibold, color: colors.ink },
  subject: { fontFamily: fonts.regular, fontSize: fontSize.fs13, color: colors.ink },
  body: { fontFamily: fonts.regular, fontSize: fontSize.fs15, lineHeight: fontSize.fs22 + size.ring, color: colors.ink },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.tight * 2 },
  sent: { fontFamily: fonts.regular, fontSize: fontSize.fs13, color: colors.text2 },
  error: { fontFamily: fonts.regular, fontSize: fontSize.fs13, color: colors.destructive },
});

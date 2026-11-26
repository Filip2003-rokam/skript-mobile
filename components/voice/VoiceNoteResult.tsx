import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';
import { colors, fontSize, fonts, radius, size, space } from '../../constants/theme';
import { fromDisplayDate } from '../../lib/contactDates';
import { formatDraft, noteWithTopic } from '../../lib/services/voiceNoteService';
import { FollowUpDraftActions } from './FollowUpDraftActions';
import { t } from '../../lib/i18n';

type VoiceNoteResultProps = {
  note: string;
  topic: string;
  followUp: string;
  subject: string;
  body: string;
  email?: string | null;
  saving?: boolean;
  error?: string | null;
  onSave: (value: { note: string | null; followUpDate: string | null; followUpDraft: string | null }) => void;
};

export function VoiceNoteResult({ note, topic, followUp, subject, body, email, saving = false, error, onSave }: VoiceNoteResultProps) {
  const [noteText, setNoteText] = useState(note);
  const [topicText, setTopicText] = useState(topic);
  const [dateText, setDateText] = useState(followUp);
  const [subjectText, setSubjectText] = useState(subject);
  const [bodyText, setBodyText] = useState(body);
  const [dateError, setDateError] = useState<string | null>(null);

  function save() {
    const date = dateText.trim();
    const iso = date ? fromDisplayDate(date) : null;
    setDateError(date && !iso ? t('errors.dateFormat') : null);
    if (date && !iso) return;
    onSave({
      note: noteWithTopic(noteText, topicText),
      followUpDate: iso,
      followUpDraft: formatDraft(subjectText, bodyText),
    });
  }

  return (
    <View style={styles.form}>
      <TextField label={t('fields.topic')} value={topicText} onChangeText={setTopicText} />
      <TextField label={t('fields.note')} value={noteText} onChangeText={setNoteText} multiline style={styles.note} />
      <TextField
        label={t('fields.followUp')}
        value={dateText}
        onChangeText={setDateText}
        placeholder={t('fields.datePlaceholder')}
        keyboardType="numbers-and-punctuation"
        error={dateError ?? undefined}
      />
      <TextField label={t('fields.emailSubject')} value={subjectText} onChangeText={setSubjectText} />
      <TextField label={t('fields.emailBody')} value={bodyText} onChangeText={setBodyText} multiline style={styles.note} />
      <FollowUpDraftActions email={email} subject={subjectText} body={bodyText} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label={t('voice.saveToContact')} loading={saving} onPress={save} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: space.gap },
  note: { height: size.field * 2, borderRadius: radius.card, textAlignVertical: 'top', paddingTop: space.gap },
  error: { fontFamily: fonts.regular, fontSize: fontSize.fs13, color: colors.destructive },
});

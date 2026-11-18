import { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Button } from '../ui/Button';
import { colors, fontSize, fonts, space } from '../../constants/theme';
import { formatDraft } from '../../lib/services/voiceNoteService';

type FollowUpDraftActionsProps = {
  email?: string | null;
  subject: string;
  body: string;
  copyLabel?: string;
};

export function FollowUpDraftActions({ email, subject, body, copyLabel = 'Kopiraj nacrt' }: FollowUpDraftActionsProps) {
  const [notice, setNotice] = useState<string | null>(null);
  const draft = formatDraft(subject, body);
  if (!draft) return null;

  async function copy() {
    await Clipboard.setStringAsync(draft ?? '');
    setNotice('Nacrt je kopiran. Mejl se ne šalje sam.');
  }

  async function openMail() {
    const query = `subject=${encodeURIComponent(subject.trim())}&body=${encodeURIComponent(body.trim())}`;
    const url = `mailto:${email?.trim() ?? ''}?${query}`;
    try {
      await Linking.openURL(url);
      setNotice('Mejl je otvoren u aplikaciji. Pošalji ga sam.');
    } catch {
      setNotice('Mejl aplikacija se nije otvorila. Kopiraj nacrt i pošalji ga ručno.');
    }
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Button label={copyLabel} size="sm" variant="secondary" onPress={() => void copy()} />
        <Button label="Otvori u mejlu" size="sm" variant="secondary" onPress={() => void openMail()} />
      </View>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.tight },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.gap },
  notice: { fontFamily: fonts.regular, fontSize: fontSize.fs13, color: colors.text2 },
});

import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from './ui/Button';
import { TextField } from './ui/TextField';
import { FollowUpDraftActions } from './voice/FollowUpDraftActions';
import { colors, fontSize, fonts, radius, size, space } from '../constants/theme';
import { fromDisplayDate, toDisplayDate } from '../lib/contactDates';
import type { Contact, ContactWrite } from '../lib/services/contactService';
import { formatDraft, splitDraft } from '../lib/services/voiceNoteService';

type ContactFormProps = {
  contact?: Partial<Contact> | null;
  saving?: boolean;
  error?: string | null;
  onSubmit: (data: ContactWrite) => void;
};

function empty(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function ContactForm({ contact, saving = false, error, onSubmit }: ContactFormProps) {
  const [fullName, setFullName] = useState(contact?.fullName ?? '');
  const [jobTitle, setJobTitle] = useState(contact?.jobTitle ?? '');
  const [company, setCompany] = useState(contact?.company ?? '');
  const [email, setEmail] = useState(contact?.email ?? '');
  const [phone, setPhone] = useState(contact?.phone ?? '');
  const [linkedinUrl, setLinkedinUrl] = useState(contact?.linkedinUrl ?? '');
  const draft = splitDraft(contact?.followUpDraft ?? null);
  const [note, setNote] = useState(contact?.note ?? '');
  const [followUp, setFollowUp] = useState(toDisplayDate(contact?.followUpDate ?? null));
  const [subject, setSubject] = useState(draft.subject);
  const [mailBody, setMailBody] = useState(draft.body);
  const [nameError, setNameError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);

  function submit() {
    const name = fullName.trim();
    const date = followUp.trim();
    const iso = date ? fromDisplayDate(date) : null;
    setNameError(name ? null : 'Ime je obavezno.');
    setDateError(date && !iso ? 'Unesi datum kao DD.MM.GGGG.' : null);
    if (!name || (date && !iso)) return;
    onSubmit({
      fullName: name,
      jobTitle: empty(jobTitle),
      company: empty(company),
      email: empty(email),
      phone: empty(phone),
      linkedinUrl: empty(linkedinUrl),
      note: empty(note),
      followUpDate: iso,
      followUpDraft: formatDraft(subject, mailBody),
      followUpDone: contact?.followUpDone ?? false,
    });
  }

  return (
    <View style={styles.form}>
      <TextField label="Ime" value={fullName} onChangeText={setFullName} error={nameError ?? undefined} />
      <TextField label="Uloga" value={jobTitle} onChangeText={setJobTitle} />
      <TextField label="Firma" value={company} onChangeText={setCompany} />
      <TextField label="Mejl" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <TextField label="Telefon" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <TextField label="LinkedIn" value={linkedinUrl} onChangeText={setLinkedinUrl} autoCapitalize="none" />
      <TextField label="Beleška" value={note} onChangeText={setNote} multiline style={styles.note} />
      <TextField
        label="Follow-up"
        value={followUp}
        onChangeText={setFollowUp}
        placeholder="DD.MM.GGGG"
        keyboardType="numbers-and-punctuation"
        error={dateError ?? undefined}
      />
      <TextField label="Predmet mejla" value={subject} onChangeText={setSubject} />
      <TextField label="Tekst mejla" value={mailBody} onChangeText={setMailBody} multiline style={styles.note} />
      <FollowUpDraftActions email={email} subject={subject} body={mailBody} />
      {error ? <Text style={styles.dateError}>{error}</Text> : null}
      <Button label="Sačuvaj" loading={saving} onPress={submit} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: space.gap },
  dateError: { fontFamily: fonts.regular, fontSize: fontSize.fs13, color: colors.destructive },
  note: { height: size.field * 2, borderRadius: radius.card, textAlignVertical: 'top', paddingTop: space.gap },
});

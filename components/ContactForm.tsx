import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from './ui/Button';
import { TextField } from './ui/TextField';
import { FollowUpDraftActions } from './voice/FollowUpDraftActions';
import { colors, fontSize, fonts, space } from '../constants/theme';
import { fromDisplayDate, toDisplayDate } from '../lib/contactDates';
import type { Contact, ContactWrite } from '../lib/services/contactService';
import { formatDraft, splitDraft } from '../lib/services/voiceNoteService';
import { t } from '../lib/i18n';

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
    setNameError(name ? null : t('errors.nameRequired'));
    setDateError(date && !iso ? t('errors.dateFormat') : null);
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
      <TextField label={t('fields.name')} value={fullName} onChangeText={setFullName} error={nameError ?? undefined} />
      <TextField label={t('fields.role')} value={jobTitle} onChangeText={setJobTitle} />
      <TextField label={t('fields.company')} value={company} onChangeText={setCompany} />
      <TextField label={t('fields.email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <TextField label={t('fields.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <TextField label={t('fields.linkedin')} value={linkedinUrl} onChangeText={setLinkedinUrl} autoCapitalize="none" />
      <TextField label={t('fields.note')} value={note} onChangeText={setNote} multiline />
      <TextField
        label={t('fields.followUp')}
        value={followUp}
        onChangeText={setFollowUp}
        placeholder={t('fields.datePlaceholder')}
        keyboardType="numbers-and-punctuation"
        error={dateError ?? undefined}
      />
      <TextField label={t('fields.emailSubject')} value={subject} onChangeText={setSubject} />
      <TextField label={t('fields.emailBody')} value={mailBody} onChangeText={setMailBody} multiline />
      <FollowUpDraftActions email={email} subject={subject} body={mailBody} />
      {error ? <Text style={styles.dateError}>{error}</Text> : null}
      <Button label={t('common.save')} loading={saving} onPress={submit} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: space.gap },
  dateError: { fontFamily: fonts.regular, fontSize: fontSize.fs13, color: colors.destructive },
});

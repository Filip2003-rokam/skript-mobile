import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from './ui/Button';
import { TextField } from './ui/TextField';
import { colors, fontSize, fonts, radius, size, space } from '../constants/theme';
import { fromDisplayDate, toDisplayDate } from '../lib/contactDates';
import type { Contact, ContactWrite } from '../lib/services/contactService';

type ContactFormProps = {
  contact?: Contact | null;
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
  const [note, setNote] = useState(contact?.note ?? '');
  const [followUp, setFollowUp] = useState(toDisplayDate(contact?.followUpDate ?? null));
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
      <View style={styles.date}>
        <Text style={styles.dateLabel}>Follow-up</Text>
        <TextInput
          value={followUp}
          onChangeText={setFollowUp}
          placeholder="DD.MM.GGGG"
          placeholderTextColor={colors.text3}
          keyboardType="numbers-and-punctuation"
          style={styles.input}
        />
        {dateError ? <Text style={styles.dateError}>{dateError}</Text> : null}
      </View>
      {error ? <Text style={styles.dateError}>{error}</Text> : null}
      <Button label="Sačuvaj" loading={saving} onPress={submit} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: space.gap },
  date: { gap: space.tight },
  dateLabel: { fontFamily: fonts.semibold, fontSize: fontSize.fs13, color: colors.ink },
  input: {
    height: size.field,
    paddingHorizontal: space.buttonMd,
    borderRadius: radius.pill,
    borderWidth: size.border,
    borderColor: colors.hairline,
    backgroundColor: colors.glass,
    fontFamily: fonts.regular,
    fontSize: fontSize.fs15,
    color: colors.ink,
  },
  dateError: { fontFamily: fonts.regular, fontSize: fontSize.fs13, color: colors.destructive },
  note: { height: 96, borderRadius: radius.card, textAlignVertical: 'top', paddingTop: space.gap },
});

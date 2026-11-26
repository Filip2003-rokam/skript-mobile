import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Button } from '../ui/Button';
import { Sheet } from '../ui/Sheet';
import { TextField } from '../ui/TextField';
import { colors, fontSize, fonts } from '../../constants/theme';
import type { MyProfile } from '../../lib/services/profileService';

type EditProfileProps = {
  profile: MyProfile;
  open: boolean;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (fullName: string, phone: string, linkedinUrl: string) => void;
};

export function EditProfile({ profile, open, saving, error, onClose, onSave }: EditProfileProps) {
  const [name, setName] = useState(profile.fullName ?? '');
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [linkedin, setLinkedin] = useState(profile.linkedinUrl ?? '');
  const [nameError, setNameError] = useState<string | null>(null);

  function submit() {
    if (!name.trim()) {
      setNameError('Ime je obavezno.');
      return;
    }
    setNameError(null);
    onSave(name, phone, linkedin);
  }

  return (
    <Sheet open={open} title="Izmeni profil" onClose={onClose}>
      <TextField quiet label="Ime" value={name} onChangeText={setName} error={nameError ?? undefined} />
      <TextField quiet label="Telefon" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <TextField quiet label="LinkedIn" value={linkedin} onChangeText={setLinkedin} autoCapitalize="none" />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label="Sačuvaj izmene" loading={saving} onPress={submit} />
      <Button label="Otkaži" variant="ghost" onPress={onClose} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  error: { fontFamily: fonts.regular, fontSize: fontSize.fs13, color: colors.destructive },
});

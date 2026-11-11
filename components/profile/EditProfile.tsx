import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';
import { colors, fontSize, fonts, radius, space } from '../../constants/theme';
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
    <Modal visible={open} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.modal}>
        <Pressable accessibilityLabel="Zatvori" style={[StyleSheet.absoluteFill, styles.scrim]} onPress={onClose} />
        <View style={styles.sheet}>
          <Text style={styles.title}>Izmeni profil</Text>
          <TextField label="Ime" value={name} onChangeText={setName} error={nameError ?? undefined} />
          <TextField label="Telefon" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <TextField label="LinkedIn" value={linkedin} onChangeText={setLinkedin} autoCapitalize="none" />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label="Sačuvaj" loading={saving} onPress={submit} />
          <Button label="Otkaži" variant="ghost" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: { flex: 1, justifyContent: 'flex-end' },
  scrim: { backgroundColor: colors.scrim },
  sheet: {
    gap: space.gap,
    padding: space.edge,
    borderTopLeftRadius: radius.panel,
    borderTopRightRadius: radius.panel,
    backgroundColor: colors.appBg,
  },
  title: { fontFamily: fonts.bold, fontSize: fontSize.fs17, color: colors.ink },
  error: { fontFamily: fonts.regular, fontSize: fontSize.fs13, color: colors.destructive },
});

import { KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { ContactForm } from './ContactForm';
import { keyboardBehavior } from './ui/Screen';
import { colors, fontSize, fonts, radius, space } from '../constants/theme';
import type { Contact, ContactWrite } from '../lib/services/contactService';

type ContactEditModalProps = {
  contact: Contact;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (data: ContactWrite) => void;
};

export function ContactEditModal({ contact, saving, error, onClose, onSubmit }: ContactEditModalProps) {
  return (
    <Modal visible transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={keyboardBehavior} style={styles.modal}>
        <Pressable accessibilityLabel="Zatvori" style={[StyleSheet.absoluteFill, styles.scrim]} onPress={onClose} />
        <ScrollView style={styles.sheet} contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.sheetTitle}>Izmeni kontakt</Text>
          <ContactForm contact={contact} saving={saving} error={error} onSubmit={onSubmit} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: { flex: 1, justifyContent: 'flex-end' },
  scrim: { backgroundColor: colors.scrim },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: radius.panel,
    borderTopRightRadius: radius.panel,
    backgroundColor: colors.appBg,
  },
  sheetContent: { gap: space.gap, padding: space.edge },
  sheetTitle: { fontFamily: fonts.bold, fontSize: fontSize.fs17, color: colors.ink },
});

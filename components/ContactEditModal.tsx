import { ContactForm } from './ContactForm';
import { Sheet } from './ui/Sheet';
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
    <Sheet open title="Izmeni kontakt" scroll onClose={onClose}>
      <ContactForm contact={contact} saving={saving} error={error} onSubmit={onSubmit} />
    </Sheet>
  );
}

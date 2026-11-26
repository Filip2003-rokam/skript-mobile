import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { colors, fontSize, fonts, size, space } from '../../constants/theme';
import type { ConnectionPerson, ConnectionStatus } from '../../lib/services/connectionService';
import { openInterestLimit, type InterestPerson } from '../../lib/services/interestService';
import { actionError, Kicker } from './personBits';
import { PersonCard } from './PersonCard';
import { RequestCard } from './RequestCard';
import { t } from '../../lib/i18n';

const statusLabel: Record<ConnectionStatus, string> = {
  get pending() { return t('requests.statusPending'); },
  get accepted() { return t('requests.statusAccepted'); },
  get declined() { return t('requests.statusDeclined'); },
};

type RequestsProps = {
  incoming: ConnectionPerson[];
  outgoing: ConnectionPerson[];
  open: InterestPerson[];
  onAccept: (connectionId: string) => Promise<void>;
  onDecline: (connectionId: string) => Promise<void>;
  onWithdraw: (interestId: string) => Promise<void>;
  onFind: () => void;
};

function qrOnly(people: ConnectionPerson[]): ConnectionPerson[] {
  return people.filter((person) => person.source === 'qr');
}

export function Requests({ incoming, outgoing, open, onAccept, onDecline, onWithdraw, onFind }: RequestsProps) {
  const qrIncoming = qrOnly(incoming);
  const qrOutgoing = qrOnly(outgoing);
  const noQr = qrIncoming.length === 0 && qrOutgoing.length === 0;

  return (
    <View style={styles.list}>
      {noQr && open.length === 0 ? (
        <EmptyState
          icon={<Feather name="users" size={size.iconMd} color={colors.ink} />}
          text={t('requests.none')}
          action={t('people.findMore')}
          onAction={onFind}
        />
      ) : null}
      {qrIncoming.map((person) => (
        <RequestCard
          key={person.id}
          name={person.name}
          role={person.role}
          company={person.company}
          message={person.message}
          status={person.status}
          email={person.email}
          phone={person.phone}
          onAccept={() => onAccept(person.id)}
          onDecline={() => onDecline(person.id)}
        />
      ))}
      {qrOutgoing.length > 0 ? <Kicker text={t('requests.sent')} /> : null}
      {qrOutgoing.map((person) => (
        <PersonCard
          key={person.id}
          name={person.name}
          role={person.role}
          company={person.company}
          trailing={<Text style={styles.status}>{statusLabel[person.status]}</Text>}
        />
      ))}
      <Text style={styles.wait}>{t('requests.waiting')} {open.length} od {openInterestLimit} interesovanja.</Text>
      {open.map((person) => (
        <OpenInterest key={person.id} person={person} onWithdraw={onWithdraw} />
      ))}
    </View>
  );
}

function OpenInterest({ person, onWithdraw }: { person: InterestPerson; onWithdraw: (interestId: string) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function withdraw() {
    setBusy(true);
    setError(null);
    try {
      await onWithdraw(person.id);
    } catch (cause) {
      setError(actionError(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.item}>
      <PersonCard
        name={person.name}
        role={person.role}
        company={person.company}
        trailing={<Button size="sm" variant="secondary" label={t('requests.withdraw')} disabled={busy} onPress={() => void withdraw()} />}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.gap },
  item: { gap: space.tight },
  status: { fontFamily: fonts.semibold, fontSize: fontSize.fs13, color: colors.text2 },
  wait: { fontFamily: fonts.regular, fontSize: fontSize.fs12, color: colors.text2 },
  error: { fontFamily: fonts.regular, fontSize: fontSize.fs13, color: colors.ink },
});

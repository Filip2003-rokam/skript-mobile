import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { EmptyState } from '../ui/EmptyState';
import { colors, fontSize, fonts, size, space } from '../../constants/theme';
import type { ConnectionPerson, ConnectionStatus } from '../../lib/services/connectionService';
import { Kicker } from './personBits';
import { PersonCard } from './PersonCard';
import { RequestCard } from './RequestCard';

const statusLabel: Record<ConnectionStatus, string> = {
  pending: 'čeka',
  accepted: 'prihvaćen',
  declined: 'odbijen',
};

type RequestsProps = {
  incoming: ConnectionPerson[];
  outgoing: ConnectionPerson[];
  onAccept: (connectionId: string) => Promise<void>;
  onDecline: (connectionId: string) => Promise<void>;
  onFind: () => void;
};

export function Requests({ incoming, outgoing, onAccept, onDecline, onFind }: RequestsProps) {
  if (incoming.length === 0 && outgoing.length === 0) {
    return (
      <EmptyState
        icon={<Feather name="users" size={size.iconMd} color={colors.ink} />}
        text="Još nema zahteva."
        action="Nađi još ljudi"
        onAction={onFind}
      />
    );
  }

  return (
    <View style={styles.list}>
      {incoming.map((person) => (
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
      {outgoing.length > 0 ? <Kicker text="Poslati zahtevi" /> : null}
      {outgoing.map((person) => (
        <PersonCard
          key={person.id}
          name={person.name}
          role={person.role}
          company={person.company}
          trailing={<Text style={styles.status}>{statusLabel[person.status]}</Text>}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.gap },
  status: { fontFamily: fonts.semibold, fontSize: fontSize.fs13, color: colors.text2 },
});

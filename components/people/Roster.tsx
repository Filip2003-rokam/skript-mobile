import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { EmptyState } from '../ui/EmptyState';
import { colors, size, space } from '../../constants/theme';
import { PersonCard } from './PersonCard';

type Person = {
  userId: string;
  name: string | null;
  role: string | null;
  company: string | null;
};

type RosterProps = {
  people: Person[];
  empty: string;
  onFind: () => void;
  trailing?: (person: Person) => ReactNode;
};

export function Roster({ people, empty, onFind, trailing }: RosterProps) {
  if (people.length === 0) {
    return (
      <EmptyState
        icon={<Feather name="users" size={size.iconMd} color={colors.ink} />}
        text={empty}
        action="Nađi još ljudi"
        onAction={onFind}
      />
    );
  }

  return (
    <View style={styles.list}>
      {people.map((person) => (
        <PersonCard
          key={person.userId}
          name={person.name}
          role={person.role}
          company={person.company}
          trailing={trailing?.(person)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.gap },
});

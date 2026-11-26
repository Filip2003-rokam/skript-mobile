import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { InlineError, LoadingState } from '../ui/State';
import { colors, fontSize, fonts, size, space } from '../../constants/theme';
import type { InterestPerson } from '../../lib/services/interestService';
import type { Suggestion } from '../../lib/services/matchService';
import { PersonCard } from './PersonCard';
import { PersonMatchCard } from './PersonMatchCard';
import { Kicker } from './personBits';

type SuggestionsProps = {
  suggestions: Suggestion[];
  skipped: InterestPerson[];
  savedIds: Set<string>;
  refreshing: boolean;
  refreshError: string | null;
  onRefresh: () => void;
  onInterest: (userId: string) => Promise<void>;
  onSkip: (userId: string) => Promise<void>;
  onRestore: (interestId: string) => Promise<void>;
  onToggleSave: (userId: string) => Promise<void>;
};

export function Suggestions(props: SuggestionsProps) {
  const [all, setAll] = useState(false);
  const shown = all ? props.suggestions : props.suggestions.slice(0, 3);
  const rest = props.suggestions.length - shown.length;
  const label = props.refreshing ? 'Tražim prave ljude…' : props.suggestions.length === 0 ? 'Napravi predloge' : 'Osveži predloge';

  const showList = props.suggestions.length > 0;

  return (
    <View style={styles.list}>
      {showList ? <Text style={styles.note}>Iz tvog profila. Zainteresovan deli kontakt tek kad i druga strana pristane.</Text> : null}
      {showList ? (
        <Button
          size="sm"
          variant="secondary"
          label={label}
          onPress={() => {
            if (!props.refreshing) props.onRefresh();
          }}
        />
      ) : null}
      {props.refreshing ? <LoadingState fill={false} /> : null}
      {props.refreshError ? <InlineError text={props.refreshError} onRetry={props.onRefresh} /> : null}
      {!props.refreshing && !props.refreshError && !showList ? (
        <EmptyState
          icon={<Feather name="users" size={size.iconMd} color={colors.ink} />}
          text="Još nema poklapanja."
          action="Napravi predloge"
          onAction={props.onRefresh}
        />
      ) : null}
      {shown.map((item) => (
        <PersonMatchCard
          key={item.id}
          name={item.name}
          role={item.role}
          company={item.company}
          score={item.score}
          why={item.why}
          matchedMine={item.matchedMine}
          matchedTheirs={item.matchedTheirs}
          openers={item.openers}
          saved={props.savedIds.has(item.suggestedUserId)}
          onInterest={() => props.onInterest(item.suggestedUserId)}
          onSkip={() => props.onSkip(item.suggestedUserId)}
          onToggleSave={() => props.onToggleSave(item.suggestedUserId)}
        />
      ))}
      {rest > 0 ? <Button size="sm" variant="secondary" label={`Prikaži još ${rest}`} onPress={() => setAll(true)} /> : null}
      {props.skipped.length > 0 ? <Kicker text="Preskočeni" /> : null}
      {props.skipped.map((person) => (
        <PersonCard
          key={person.id}
          name={person.name}
          role={person.role}
          company={person.company}
          trailing={
            <Button size="sm" variant="secondary" label="Vrati" onPress={() => void props.onRestore(person.id)} />
          }
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.gap },
  note: { fontFamily: fonts.regular, fontSize: fontSize.fs12, color: colors.text2 },
});

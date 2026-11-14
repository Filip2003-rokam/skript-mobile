import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { InlineError, LoadingState } from '../ui/State';
import { colors, size, space } from '../../constants/theme';
import type { ConnectionPerson } from '../../lib/services/connectionService';
import type { Suggestion } from '../../lib/services/matchService';
import { PersonMatchCard } from './PersonMatchCard';

type SuggestionsProps = {
  suggestions: Suggestion[];
  savedIds: Set<string>;
  outgoing: ConnectionPerson[];
  connected: ConnectionPerson[];
  refreshing: boolean;
  refreshError: string | null;
  onRefresh: () => void;
  onConnect: (userId: string, message: string) => Promise<void>;
  onToggleSave: (userId: string) => Promise<void>;
};

function linkOf(userId: string, outgoing: ConnectionPerson[], connected: ConnectionPerson[]) {
  if (connected.some((person) => person.userId === userId)) return 'connected' as const;
  if (outgoing.some((person) => person.userId === userId && person.status === 'pending')) return 'sent' as const;
  return 'none' as const;
}

export function Suggestions(props: SuggestionsProps) {
  const [all, setAll] = useState(false);
  const shown = all ? props.suggestions : props.suggestions.slice(0, 3);
  const rest = props.suggestions.length - shown.length;
  const label = props.refreshing ? 'Tražim prave ljude…' : props.suggestions.length === 0 ? 'Napravi predloge' : 'Osveži predloge';

  if (props.suggestions.length === 0) {
    return (
      <View style={styles.list}>
        {props.refreshing ? <LoadingState fill={false} /> : null}
        {props.refreshError ? <InlineError text={props.refreshError} onRetry={props.onRefresh} /> : null}
        {!props.refreshing && !props.refreshError ? (
          <EmptyState
            icon={<Feather name="users" size={size.iconMd} color={colors.ink} />}
            text="Nema predloga. Napravi predloge da vidiš koga da upoznaš."
            action="Napravi predloge"
            onAction={props.onRefresh}
          />
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.list}>
      <Button
        size="sm"
        variant="secondary"
        label={label}
        onPress={() => {
          if (!props.refreshing) props.onRefresh();
        }}
      />
      {props.refreshError ? <InlineError text={props.refreshError} onRetry={props.onRefresh} /> : null}
      {shown.map((item) => {
        const link = linkOf(item.suggestedUserId, props.outgoing, props.connected);
        return (
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
            sent={link === 'sent'}
            connected={link === 'connected'}
            onConnect={(message) => props.onConnect(item.suggestedUserId, message)}
            onToggleSave={() => props.onToggleSave(item.suggestedUserId)}
          />
        );
      })}
      {rest > 0 ? <Button size="sm" variant="secondary" label={`Prikaži još ${rest}`} onPress={() => setAll(true)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.gap },
});

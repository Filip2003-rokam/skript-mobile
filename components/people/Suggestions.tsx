import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../ui/Button';
import { colors, fontSize, fonts, space } from '../../constants/theme';
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

  return (
    <View style={styles.list}>
      <Button
        size="sm"
        variant={props.suggestions.length === 0 && !props.refreshing ? 'primary' : 'secondary'}
        label={label}
        onPress={() => {
          if (!props.refreshing) props.onRefresh();
        }}
      />
      {props.refreshError ? <Text style={styles.error}>{props.refreshError}</Text> : null}
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
  error: { fontFamily: fonts.regular, fontSize: fontSize.fs13, color: colors.ink },
});

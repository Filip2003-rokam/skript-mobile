import { ScrollView, StyleSheet, View } from 'react-native';
import { Chip } from '../ui/Chip';
import { space } from '../../constants/theme';

type AgendaFiltersProps = {
  days: number[];
  day: number;
  onDay: (day: number) => void;
  rooms: string[];
  room: string | null;
  onRoom: (room: string | null) => void;
  listWidth: number;
};

export function AgendaFilters({ days, day, onDay, rooms, room, onRoom, listWidth }: AgendaFiltersProps) {
  return (
    <>
      <View style={styles.days}>
        {days.map((value) => (
          <Chip key={value} label={`Dan ${value}`} selected={day === value} onPress={() => onDay(value)} />
        ))}
      </View>
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        style={[styles.rooms, listWidth > 0 ? { width: listWidth } : null]}
        contentContainerStyle={styles.roomRow}
      >
        <Chip label="Sve sale" selected={room === null} onPress={() => onRoom(null)} />
        {rooms.map((name) => (
          <Chip key={name} label={name} selected={room === name} onPress={() => onRoom(name)} />
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  days: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.gap,
  },
  rooms: {
    flexGrow: 0,
  },
  roomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.gap,
  },
});

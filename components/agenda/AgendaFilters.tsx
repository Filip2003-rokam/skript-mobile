import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, fontSize, fonts, radius, shadow, size, space } from '../../constants/theme';

type Option = { value: string; label: string };

type AgendaFiltersProps = {
  days: number[];
  day: number;
  onDay: (day: number) => void;
  rooms: string[];
  room: string | null;
  onRoom: (room: string | null) => void;
};

export function AgendaFilters({ days, day, onDay, rooms, room, onRoom }: AgendaFiltersProps) {
  return (
    <View style={styles.row}>
      <FilterSelect
        label="Dan"
        value={`Dan ${day}`}
        options={days.map((value) => ({ value: String(value), label: `Dan ${value}` }))}
        selected={String(day)}
        onChange={(value) => onDay(Number(value))}
      />
      <FilterSelect
        label="Sala"
        value={room ?? 'Sve sale'}
        options={[{ value: '', label: 'Sve sale' }, ...rooms.map((name) => ({ value: name, label: name }))]}
        selected={room ?? ''}
        onChange={(value) => onRoom(value || null)}
      />
    </View>
  );
}

function FilterSelect({ label, value, options, selected, onChange }: { label: string; value: string; options: Option[]; selected: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} onPress={() => setOpen(true)} style={styles.trigger}>
        <Text style={styles.triggerText}>{value}</Text>
        <Feather name="chevron-down" size={fontSize.fs12} color={colors.text2} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.modal}>
          <Pressable accessibilityLabel="Zatvori" style={styles.scrim} onPress={() => setOpen(false)} />
          <View style={styles.menu}>
            {options.map((option) => (
              <Pressable
                key={option.value || 'all'}
                accessibilityRole="button"
                onPress={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                style={styles.item}
              >
                <Text style={styles.itemText}>{option.label}</Text>
                {option.value === selected ? <Feather name="check" size={fontSize.fs12} color={colors.ink} /> : null}
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.tight * 2,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.tight,
    height: size.chip + space.tight,
    paddingLeft: space.chip + space.tight,
    paddingRight: space.gap,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: size.border,
    borderColor: colors.surfaceBorder,
    ...shadow.card,
  },
  triggerText: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.fs13,
    color: colors.ink,
  },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: colors.scrim },
  modal: { flex: 1, justifyContent: 'center' },
  menu: {
    marginHorizontal: space.edge,
    gap: space.tight,
    padding: space.tight * 2,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    ...shadow.lift,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.gap,
    paddingHorizontal: space.gap,
    paddingVertical: space.gap,
    borderRadius: radius.control,
  },
  itemText: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.fs13,
    color: colors.ink,
  },
});

import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { Sheet } from '../ui/Sheet';
import { InlineError } from '../ui/State';
import { TextField } from '../ui/TextField';
import { colors, fontSize, fonts, space } from '../../constants/theme';
import { t } from '../../lib/i18n';
import { parseMeetingTime, proposeMeeting } from '../../lib/services/meetingService';

type ProposeMeetingSheetProps = {
  open: boolean;
  eventId: string;
  eventDays: number | null;
  person: { userId: string; name: string | null } | null;
  onClose: () => void;
  onSent: () => void;
};

/** Predlog sastanka: dan, vreme i mesto. Druga strana odlučuje, a kontakt se zbog sastanka ne deli. */
export function ProposeMeetingSheet({ open, eventId, eventDays, person, onClose, onSent }: ProposeMeetingSheetProps) {
  const days = Math.max(1, eventDays ?? 1);
  const [day, setDay] = useState(1);
  const [time, setTime] = useState('');
  const [place, setPlace] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDay(1);
    setTime('');
    setPlace('');
    setError(null);
  }, [open, person?.userId]);

  async function send() {
    if (!person) return;
    if (!parseMeetingTime(time)) {
      setError(t('meetings.timeInvalid'));
      return;
    }
    if (!place.trim()) {
      setError(t('meetings.placeRequired'));
      return;
    }
    setSending(true);
    setError(null);
    try {
      await proposeMeeting({ eventId, inviteeId: person.userId, day, time, place });
      onSent();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('meetings.failed'));
    } finally {
      setSending(false);
    }
  }

  const name = person?.name?.trim() || t('person.unknown');
  return (
    <Sheet open={open && person != null} onClose={onClose} title={t('meetings.sheetTitle', { name })} scroll>
      <View style={styles.body}>
        <Text style={styles.hint}>{t('meetings.sheetHint')}</Text>
        {days > 1 ? (
          <View style={styles.days}>
            {Array.from({ length: days }, (_, index) => index + 1).map((value) => (
              <Chip key={value} label={t('agenda.dayN', { day: value })} selected={value === day} onPress={() => setDay(value)} />
            ))}
          </View>
        ) : null}
        <TextField label={t('meetings.time')} value={time} onChangeText={setTime} placeholder="11:30" keyboardType="numbers-and-punctuation" maxLength={5} />
        <TextField label={t('meetings.place')} value={place} onChangeText={setPlace} placeholder={t('meetings.placePlaceholder')} maxLength={60} />
        {error ? <InlineError text={error} /> : null}
        <Button label={t('meetings.send')} loading={sending} onPress={() => void send()} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.gap },
  hint: { fontFamily: fonts.regular, fontSize: fontSize.fs13, color: colors.text2 },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: space.tight * 2 },
});

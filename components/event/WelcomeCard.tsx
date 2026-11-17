import { Image, StyleSheet, Text, View } from 'react-native';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { EventLogo } from '../ui/EventLogo';
import { SkriptMark } from '../ui/SkriptMark';
import { InlineError } from '../ui/State';
import { colors, fontSize, fonts, radius, size, space } from '../../constants/theme';

type WelcomeCardProps = {
  coverUri: string | null;
  initials: string;
  logoUri: string | null;
  name: string;
  place: string;
  status: string;
  entering: boolean;
  error: string | null;
  onEnter: () => void;
  onRetry: () => void;
};

export function WelcomeCard({ coverUri, initials, logoUri, name, place, status, entering, error, onEnter, onRetry }: WelcomeCardProps) {
  return (
    <>
      {coverUri ? <Image source={{ uri: coverUri }} style={styles.cover} /> : null}
      <Card>
        <View style={styles.card}>
          <EventLogo initials={initials} source={logoUri ? { uri: logoUri } : undefined} />
          <Text style={styles.name}>{name}</Text>
          {place ? <Text style={styles.place}>{place}</Text> : null}
          <Text style={styles.status}>{status}</Text>
        </View>
      </Card>
      <View style={styles.actions}>
        <Button label="Uđi" size="lg" loading={entering} onPress={onEnter} />
        {error ? <InlineError text={error} onRetry={onRetry} /> : null}
        <View style={styles.note}>
          <View style={styles.dot} />
          <Text style={styles.noteText}>Predlozi ljudi · Kontakt se deli tek kad oba prihvate</Text>
        </View>
        <View style={styles.sign}>
          <Text style={styles.by}>by</Text>
          <SkriptMark size={fontSize.fs13} />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  cover: {
    height: size.hero,
    borderRadius: radius.card,
  },
  card: {
    alignItems: 'center',
    gap: space.gap,
  },
  name: {
    fontFamily: fonts.bold,
    fontSize: fontSize.fs22,
    color: colors.ink,
    textAlign: 'center',
  },
  place: {
    fontFamily: fonts.regular,
    fontSize: fontSize.fs13,
    color: colors.text2,
    textAlign: 'center',
  },
  status: {
    fontFamily: fonts.medium,
    fontSize: fontSize.fs13,
    color: colors.ink,
    textAlign: 'center',
  },
  actions: {
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: space.gap,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: space.tight,
  },
  dot: {
    width: size.dot,
    height: size.dot,
    borderRadius: size.dot,
    backgroundColor: colors.live,
  },
  noteText: {
    flexShrink: 1,
    fontFamily: fonts.semibold,
    fontSize: fontSize.fs13,
    color: colors.ink,
    textAlign: 'center',
  },
  sign: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.tight,
  },
  by: {
    fontFamily: fonts.regular,
    fontSize: fontSize.fs13,
    color: colors.text2,
  },
});

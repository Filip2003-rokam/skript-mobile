import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../ui/Button';
import { EventLogo } from '../ui/EventLogo';
import { SkriptMark } from '../ui/SkriptMark';
import { InlineError } from '../ui/State';
import { colors, fontSize, fonts, size, space, trackingTight } from '../../constants/theme';
import { t } from '../../lib/i18n';

type WelcomeCardProps = {
  initials: string;
  logoUri: string | null;
  name: string;
  entering: boolean;
  error: string | null;
  onEnter: () => void;
  onRetry: () => void;
};

export function WelcomeCard({ initials, logoUri, name, entering, error, onEnter, onRetry }: WelcomeCardProps) {
  return (
    <View style={styles.stage}>
      <View style={styles.center}>
        <EventLogo initials={initials} box={size.entryLogo} source={logoUri ? { uri: logoUri } : undefined} />
        <Text style={styles.name}>{name}</Text>
        <Button label={t('scan.enter')} size="lg" loading={entering} onPress={onEnter} />
        {error ? <InlineError text={error} onRetry={onRetry} /> : null}
      </View>
      <View style={styles.sign}>
        <Text style={styles.by}>by</Text>
        <SkriptMark size={fontSize.fs12} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, justifyContent: 'space-between', alignItems: 'center', paddingBottom: space.edge },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.edge, paddingHorizontal: space.edge },
  name: {
    fontFamily: fonts.display,
    fontSize: fontSize.fs22,
    color: colors.ink,
    textAlign: 'center',
    letterSpacing: fontSize.fs22 * trackingTight,
    lineHeight: fontSize.fs30,
  },
  sign: { flexDirection: 'row', alignItems: 'center', gap: space.tight },
  by: { fontFamily: fonts.regular, fontSize: fontSize.fs12, color: colors.text2 },
});

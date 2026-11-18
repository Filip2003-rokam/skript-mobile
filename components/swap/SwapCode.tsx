import { Image, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { EventLogo } from '../ui/EventLogo';
import { colors, fontSize, fonts, opacity, radius, shadow, size, space, trackingWide } from '../../constants/theme';
import { swapQr } from '../../lib/services/swapService';

type SwapCodeProps = {
  token: string;
  eventName: string;
  place: string;
  coverUri?: string | null;
  initials: string;
  logoUri?: string | null;
  person: string;
  company?: string | null;
};

export function SwapCode({ token, eventName, place, coverUri, initials, logoUri, person, company }: SwapCodeProps) {
  return (
    <View style={styles.card}>
      <View style={styles.band}>
        {coverUri ? <Image source={{ uri: coverUri }} style={styles.cover} /> : null}
        <View style={styles.bandRow}>
          <EventLogo initials={initials} source={logoUri ? { uri: logoUri } : undefined} small />
          <View style={styles.bandText}>
            <Text style={styles.eventName}>{eventName}</Text>
            <Text style={styles.eventPlace}>{place}</Text>
          </View>
        </View>
      </View>
      <View style={styles.body}>
        <View style={styles.pill}>
          <Text style={styles.pillText}>UČESNIK</Text>
        </View>
        <Text style={styles.person}>{person}</Text>
        {company ? <Text style={styles.company}>{company}</Text> : null}
        <View style={styles.qr}>
          <QRCode value={swapQr(token)} size={size.qr} color={colors.ink} backgroundColor={colors.surface} quietZone={space.gap} />
        </View>
        <Text style={styles.note}>Kod važi pet minuta i menja se dok je ovaj ekran otvoren. Fotografija kasnije ne radi.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden', borderRadius: radius.panel, backgroundColor: colors.surface, ...shadow.lift },
  band: { minHeight: size.nav + space.edge, justifyContent: 'center', backgroundColor: colors.ink, overflow: 'hidden' },
  cover: { ...StyleSheet.absoluteFill, opacity: opacity.cover },
  bandRow: { flexDirection: 'row', alignItems: 'center', gap: space.gap, paddingHorizontal: space.edge, paddingVertical: space.card },
  bandText: { flex: 1, minWidth: 0 },
  eventName: { fontFamily: fonts.bold, fontSize: fontSize.fs15, color: colors.appBg },
  eventPlace: { fontFamily: fonts.regular, fontSize: fontSize.fs11, color: colors.appBg, opacity: opacity.homeIdle },
  body: { alignItems: 'center', gap: space.gap, paddingHorizontal: space.edge, paddingTop: space.card, paddingBottom: space.edge },
  pill: { paddingHorizontal: space.gap, paddingVertical: space.tight, borderRadius: radius.pill, backgroundColor: colors.skriptYellow },
  pillText: { fontFamily: fonts.bold, fontSize: fontSize.fs11, color: colors.ink, letterSpacing: trackingWide },
  person: { fontFamily: fonts.display, fontSize: fontSize.fs30, color: colors.ink, textAlign: 'center' },
  company: { fontFamily: fonts.regular, fontSize: fontSize.fs13, color: colors.text2, textAlign: 'center' },
  qr: { padding: space.gap, borderRadius: radius.card, backgroundColor: colors.surface, ...shadow.card },
  note: { fontFamily: fonts.regular, fontSize: fontSize.fs13, color: colors.text2, textAlign: 'center' },
});

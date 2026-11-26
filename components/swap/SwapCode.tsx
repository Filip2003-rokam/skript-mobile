import { StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { colors, fontSize, fonts, radius, shadow, size, space } from '../../constants/theme';
import { swapQr } from '../../lib/services/swapService';

type SwapCodeProps = {
  token: string;
  person: string;
  eventName: string;
};

export function SwapCode({ token, person, eventName }: SwapCodeProps) {
  return (
    <View style={styles.card}>
      <QRCode value={swapQr(token)} size={size.qr} color={colors.ink} backgroundColor={colors.surface} />
      <Text style={styles.caption}>{person} · {eventName}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: space.gap,
    padding: space.card,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  caption: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.fs13,
    color: colors.night,
    textAlign: 'center',
  },
});

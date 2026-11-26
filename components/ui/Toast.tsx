import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, fontSize, fonts, radius, shadow, size, space } from '../../constants/theme';

type ToastProps = {
  open: boolean;
  message: string;
};

export function Toast({ open, message }: ToastProps) {
  if (!open) return null;
  return (
    <View pointerEvents="none" style={styles.wrap}>
      <View accessibilityRole="alert" style={styles.toast}>
        <View style={styles.icon}>
          <Feather name="check-circle" size={size.iconSm} color={colors.onSignal} />
        </View>
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: space.edge,
    left: space.edge,
    right: space.edge,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.chip - size.ring,
    paddingVertical: space.chip - size.ring,
    paddingLeft: space.chip,
    paddingRight: space.card,
    borderRadius: radius.pill,
    borderWidth: size.border,
    borderColor: colors.hairline,
    backgroundColor: colors.glassStrong,
    ...shadow.lift,
  },
  icon: {
    width: size.chipSm,
    height: size.chipSm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.skriptYellow,
  },
  message: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.fs13,
    color: colors.ink,
  },
});

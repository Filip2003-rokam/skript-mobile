import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fontSize, fonts, opacity, pressScale, radius, shadow, size, space } from '../../constants/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'accent' | 'icon';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  label?: string;
  variant?: Variant;
  size?: ButtonSize;
  loading?: boolean;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

const height: Record<ButtonSize, number> = { sm: size.buttonHsm, md: size.buttonMd, lg: size.buttonLg };
const padX: Record<ButtonSize, number> = { sm: space.buttonSm, md: space.buttonMd, lg: space.buttonLg };
const labelSize: Record<ButtonSize, number> = { sm: fontSize.fs13, md: fontSize.fs15, lg: fontSize.fs17 };
const labelColor: Record<Variant, string> = {
  primary: colors.onInk,
  secondary: colors.ink,
  ghost: colors.ink,
  accent: colors.onSignal,
  icon: colors.ink,
};

export function Button({
  label,
  variant = 'primary',
  size: buttonSize = 'md',
  loading = false,
  disabled,
  children,
  style,
  ...props
}: ButtonProps) {
  const off = Boolean(disabled || loading);
  return (
    <Pressable
      accessibilityRole="button"
      disabled={off}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        {
          height: height[buttonSize],
          paddingHorizontal: variant === 'icon' ? 0 : padX[buttonSize],
          width: variant === 'icon' ? height[buttonSize] : undefined,
          opacity: off ? opacity.disabled : 1,
        },
        pressed && !off && variant === 'ghost' && styles.ghostPressed,
        pressed && !off && { transform: [{ scale: pressScale }] },
        style,
      ]}
      {...props}
    >
      {loading ? <ActivityIndicator color={labelColor[variant]} /> : children}
      {!loading && label && variant !== 'icon' ? (
        <Text style={[styles.label, { color: labelColor[variant], fontSize: labelSize[buttonSize] }]}>{label}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.tight * 2,
    borderRadius: radius.pill,
  },
  label: { fontFamily: fonts.semibold },
  primary: { backgroundColor: colors.ink },
  secondary: { backgroundColor: colors.glass, borderWidth: size.border, borderColor: colors.hairline, ...shadow.soft },
  ghost: {},
  ghostPressed: { backgroundColor: colors.fillSubtle },
  accent: { backgroundColor: colors.skriptYellow },
  icon: { backgroundColor: colors.glass, borderWidth: size.border, borderColor: colors.hairline, ...shadow.soft },
});

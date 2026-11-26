import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, pressScale, pressScaleSurface, radius, shadow, size, space } from '../../constants/theme';

type CardVariant = 'glass' | 'surface' | 'featured';

type CardProps = {
  children: ReactNode;
  variant?: CardVariant;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

// Staklo je providna bela. Blur iz demoa se ne prenosi.
export function Card({ children, variant = 'glass', onPress, style }: CardProps) {
  const look = [styles.card, styles[variant], style];
  if (!onPress) return <View style={look}>{children}</View>;
  const scale = variant === 'surface' ? pressScaleSurface : pressScale;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [look, pressed && { transform: [{ scale }] }]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    padding: space.card,
    borderWidth: size.border,
  },
  glass: {
    backgroundColor: colors.glass,
    borderColor: colors.hairline,
    ...shadow.soft,
  },
  surface: {
    backgroundColor: colors.surface,
    borderColor: colors.surfaceBorder,
    ...shadow.card,
  },
  featured: {
    backgroundColor: colors.glassStrong,
    borderColor: colors.accentRing,
    ...shadow.lift,
  },
});

import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radius, shadow, size, space } from '../../constants/theme';

type CardProps = {
  children: ReactNode;
  variant?: 'glass' | 'surface' | 'featured';
};

// Staklo je providna bela. Blur iz demoa se ne prenosi.
export function Card({ children, variant = 'glass' }: CardProps) {
  return <View style={[styles.card, styles[variant]]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    padding: space.card,
    borderWidth: size.border,
    ...shadow.card,
  },
  glass: {
    backgroundColor: colors.glass,
    borderColor: colors.hairline,
  },
  surface: {
    backgroundColor: colors.surface,
    borderColor: colors.surfaceBorder,
  },
  featured: {
    backgroundColor: colors.glassStrong,
    borderColor: colors.skriptYellow,
  },
});

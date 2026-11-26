import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, fonts, size, space } from '../../constants/theme';
import { Button } from './Button';

type EmptyStateProps = {
  icon: ReactNode;
  text: string;
  action?: string;
  onAction?: () => void;
};

export function EmptyState({ icon, text, action, onAction }: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.icon}>{icon}</View>
      <Text style={styles.text}>{text}</Text>
      {action && onAction ? <Button label={action} size="sm" onPress={onAction} style={styles.action} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: space.gap,
    paddingHorizontal: space.buttonLg,
    paddingVertical: space.buttonLg,
  },
  icon: {
    width: size.emptyIcon,
    height: size.emptyIcon,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: size.emptyIcon,
    backgroundColor: colors.fillSubtle,
  },
  text: {
    maxWidth: size.emptyText,
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: fontSize.fs13,
    color: colors.text2,
  },
  action: { height: size.emptyIcon },
});

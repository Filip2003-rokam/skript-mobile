import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSize, fonts, radius, shadow, size, space, trackingTight } from '../../constants/theme';
import { keyboardBehavior } from './Screen';
import { t } from '../../lib/i18n';

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  scroll?: boolean;
  children: ReactNode;
};

export function Sheet({ open, onClose, title, scroll = false, children }: SheetProps) {
  const insets = useSafeAreaInsets();
  const body = scroll ? (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    children
  );
  return (
    <Modal visible={open} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={keyboardBehavior} style={styles.modal}>
        <Pressable accessibilityLabel={t('common.close')} style={[StyleSheet.absoluteFill, styles.scrim]} onPress={onClose} />
        <View style={[styles.sheet, { marginBottom: Math.max(insets.bottom, space.tight * 2) }]}>
          <View style={styles.handle} />
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {body}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: { flex: 1, justifyContent: 'flex-end' },
  scrim: { backgroundColor: colors.scrim },
  sheet: {
    maxHeight: '92%',
    marginHorizontal: space.tight * 2,
    gap: space.gap,
    padding: space.edge,
    paddingBottom: space.buttonLg,
    borderRadius: radius.panel,
    borderWidth: size.border,
    borderColor: colors.hairline,
    backgroundColor: colors.glassStrong,
    ...shadow.lift,
  },
  handle: {
    alignSelf: 'center',
    width: size.emptyIcon,
    height: size.liveDot,
    marginBottom: space.tight,
    borderRadius: radius.pill,
    backgroundColor: colors.hairline,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: fontSize.fs22,
    color: colors.ink,
    letterSpacing: fontSize.fs22 * trackingTight,
  },
  scroll: { flexShrink: 1 },
  scrollContent: { gap: space.gap },
});

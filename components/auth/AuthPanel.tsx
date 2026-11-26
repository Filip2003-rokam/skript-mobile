import type { ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSize, fonts, radius, shadow, size, space, trackingTight } from '../../constants/theme';
import { Button } from '../ui/Button';
import { keyboardBehavior } from '../ui/Screen';
import { SkriptMark } from '../ui/SkriptMark';
import { t } from '../../lib/i18n';

type AuthPanelProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function AuthPanel({ title, onClose, children }: AuthPanelProps) {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <KeyboardAvoidingView behavior={keyboardBehavior} style={styles.fill}>
        <ScrollView contentContainerStyle={styles.end} keyboardShouldPersistTaps="handled">
          <View style={[styles.sheet, { marginBottom: Math.max(insets.bottom, space.tight * 2) }]}>
            <View style={styles.handle} />
            <Text style={styles.title}>{title}</Text>
            <View style={styles.brand}>
              <SkriptMark size={fontSize.fs22} />
              <Button variant="icon" accessibilityLabel={t('common.close')} onPress={onClose}>
                <Feather name="x" size={size.iconMd} color={colors.ink} />
              </Button>
            </View>
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.scrim },
  fill: { flex: 1 },
  end: { flexGrow: 1, justifyContent: 'flex-end' },
  sheet: {
    gap: space.card,
    marginHorizontal: space.tight * 2,
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
    borderRadius: radius.pill,
    backgroundColor: colors.hairline,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: fontSize.fs22,
    color: colors.ink,
    letterSpacing: fontSize.fs22 * trackingTight,
  },
  brand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});

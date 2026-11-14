import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, space } from '../../constants/theme';

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  tabBar?: boolean;
};

export const keyboardBehavior = Platform.OS === 'ios' ? 'padding' : 'height';

export function Screen({ children, scroll = false, tabBar = false }: ScreenProps) {
  return (
    <SafeAreaView edges={tabBar ? ['top'] : ['top', 'bottom']} style={styles.screen}>
      <KeyboardAvoidingView style={styles.fill} behavior={keyboardBehavior}>
        {scroll ? (
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.content, styles.fill]}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.appBg,
  },
  fill: {
    flex: 1,
  },
  content: {
    paddingHorizontal: space.edge,
    paddingTop: space.gap,
    paddingBottom: space.edge,
    gap: space.gap,
  },
});

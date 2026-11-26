import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, space } from '../../constants/theme';
import { useTabBarInset } from './TabBar';

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  tabBar?: boolean;
};

export const keyboardBehavior = Platform.OS === 'ios' ? 'padding' : undefined;

export function Screen({ children, scroll = false, tabBar = false }: ScreenProps) {
  const tabInset = useTabBarInset();
  const content = [styles.content, { paddingBottom: tabBar ? tabInset : space.edge }];
  return (
    <SafeAreaView edges={tabBar ? ['top'] : ['top', 'bottom']} style={styles.screen}>
      <KeyboardAvoidingView style={styles.fill} behavior={keyboardBehavior}>
        {scroll ? (
          <ScrollView contentContainerStyle={content} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        ) : (
          <View style={[content, styles.fill]}>{children}</View>
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
    gap: space.gap,
  },
});

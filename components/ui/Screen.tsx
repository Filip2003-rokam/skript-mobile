import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, space } from '../../constants/theme';

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  tabBar?: boolean;
};

export function Screen({ children, scroll = false, tabBar = false }: ScreenProps) {
  return (
    <SafeAreaView edges={tabBar ? ['top'] : ['top', 'bottom']} style={styles.screen}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.fill]}>{children}</View>
      )}
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

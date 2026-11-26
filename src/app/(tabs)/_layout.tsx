import { Tabs } from 'expo-router';
import { TabBar } from '../../../components/ui/TabBar';
import { colors, space } from '../../../constants/theme';
import { t } from '../../../lib/i18n';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => (
        <TabBar
          activeKey={props.state.routes[props.state.index]?.name ?? 'index'}
          bottom={Math.max(props.insets.bottom, space.gap)}
          onPress={(key) => {
            const route = props.state.routes.find((item) => item.name === key);
            if (route) props.navigateToTab(route.key);
          }}
        />
      )}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.appBg,
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.home') }} />
      <Tabs.Screen name="agenda" options={{ title: t('tabs.agenda') }} />
      <Tabs.Screen name="people" options={{ title: t('tabs.people') }} />
      <Tabs.Screen name="profile" options={{ title: t('tabs.me') }} />
    </Tabs>
  );
}

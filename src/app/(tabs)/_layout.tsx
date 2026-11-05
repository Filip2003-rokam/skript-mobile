import { Tabs } from 'expo-router';
import { TabBar } from '../../../components/ui/TabBar';
import { colors, space } from '../../../constants/theme';

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
      <Tabs.Screen name="index" options={{ title: 'Početna' }} />
      <Tabs.Screen name="agenda" options={{ title: 'Agenda' }} />
      <Tabs.Screen name="people" options={{ title: 'Ljudi' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil' }} />
    </Tabs>
  );
}

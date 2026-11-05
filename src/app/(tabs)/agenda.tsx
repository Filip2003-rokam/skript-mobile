import { StyleSheet, Text, View } from 'react-native';

export default function AgendaScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Agenda</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
  },
});

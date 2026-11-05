import { StyleSheet, Text, View } from 'react-native';

export default function PeopleScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Ljudi</Text>
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

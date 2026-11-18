import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { Button } from '../../../components/ui/Button';
import { Screen } from '../../../components/ui/Screen';
import { SkriptMark } from '../../../components/ui/SkriptMark';
import { TextField } from '../../../components/ui/TextField';
import { colors, fontSize, fonts } from '../../../constants/theme';
import { authErrorMessage, signIn } from '../../../lib/services/authService';
import { validateLogin, type AuthFields } from '../../../lib/validation';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fields, setFields] = useState<AuthFields>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    const next = validateLogin(email, password);
    setFields(next);
    setFormError(null);
    if (next.email || next.password) return;

    setLoading(true);
    try {
      await signIn(email, password);
    } catch (error) {
      setFormError(authErrorMessage(error));
      setLoading(false);
    }
  }

  return (
    <Screen scroll>
      <SkriptMark size={fontSize.fs30} />
      <TextField
        label="Mejl"
        value={email}
        onChangeText={setEmail}
        error={fields.email}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="ime@primer.com"
      />
      <TextField
        label="Lozinka"
        value={password}
        onChangeText={setPassword}
        error={fields.password}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="password"
      />
      {formError ? <Text style={styles.error}>{formError}</Text> : null}
      <Button label="Prijavi se" loading={loading} onPress={submit} />
      <Button label="Napravi nalog" variant="ghost" onPress={() => router.push('/register')} />
      <Button label="Imam kod eventa" variant="ghost" onPress={() => router.push('/scan')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: {
    fontFamily: fonts.regular,
    fontSize: fontSize.fs13,
    color: colors.destructive,
  },
});

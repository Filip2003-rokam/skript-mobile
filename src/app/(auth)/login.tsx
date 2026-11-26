import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { AuthPanel } from '../../../components/auth/AuthPanel';
import { Button } from '../../../components/ui/Button';
import { TextField } from '../../../components/ui/TextField';
import { colors, fontSize, fonts, space } from '../../../constants/theme';
import { authErrorMessage, signIn } from '../../../lib/services/authService';
import { validateLogin, type AuthFields } from '../../../lib/validation';
import { t } from '../../../lib/i18n';

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

  function close() {
    if (router.canGoBack()) router.back();
    else router.replace('/scan');
  }

  return (
    <AuthPanel title={t('auth.signIn')} onClose={close}>
      <View style={styles.form}>
        <TextField
          quiet
          label={t('fields.email')}
          value={email}
          onChangeText={setEmail}
          error={fields.email}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="ime@primer.com"
        />
        <TextField
          quiet
          label={t('fields.password')}
          value={password}
          onChangeText={setPassword}
          error={fields.password}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="password"
        />
      </View>
      {formError ? <Text style={styles.error}>{formError}</Text> : null}
      <Button label={t('auth.signIn')} loading={loading} onPress={submit} />
      <Button label={t('auth.createAccount')} variant="ghost" onPress={() => router.push('/register')} />
      <Button label={t('auth.haveEventCode')} variant="ghost" onPress={() => router.push('/scan')} />
    </AuthPanel>
  );
}

const styles = StyleSheet.create({
  form: { gap: space.gap },
  error: { fontFamily: fonts.regular, fontSize: fontSize.fs13, color: colors.destructive },
});

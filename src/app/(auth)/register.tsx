import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { AuthPanel } from '../../../components/auth/AuthPanel';
import { Button } from '../../../components/ui/Button';
import { TextField } from '../../../components/ui/TextField';
import { colors, fontSize, fonts, space } from '../../../constants/theme';
import { authErrorMessage, signUp } from '../../../lib/services/authService';
import { validateRegister, type AuthFields } from '../../../lib/validation';
import { t } from '../../../lib/i18n';

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fields, setFields] = useState<AuthFields>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    const next = validateRegister(fullName, email, password);
    setFields(next);
    setFormError(null);
    if (next.fullName || next.email || next.password) return;

    setLoading(true);
    try {
      const session = await signUp(email, password, fullName);
      if (!session) {
        setFormError(t('auth.accountCreated'));
        setLoading(false);
      }
    } catch (error) {
      setFormError(authErrorMessage(error));
      setLoading(false);
    }
  }

  function close() {
    if (router.canGoBack()) router.back();
    else router.replace('/login');
  }

  return (
    <AuthPanel title={t('auth.createAccount')} onClose={close}>
      <View style={styles.form}>
        <TextField quiet label={t('fields.name')} value={fullName} onChangeText={setFullName} error={fields.fullName} autoComplete="name" />
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
          autoComplete="new-password"
        />
      </View>
      {formError ? <Text style={styles.error}>{formError}</Text> : null}
      <Button label={t('auth.createAccount')} loading={loading} onPress={submit} />
      <Button label={t('auth.haveAccount')} variant="ghost" onPress={() => router.back()} />
    </AuthPanel>
  );
}

const styles = StyleSheet.create({
  form: { gap: space.gap },
  error: { fontFamily: fonts.regular, fontSize: fontSize.fs13, color: colors.destructive },
});

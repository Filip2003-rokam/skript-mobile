import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, fontSize, fonts, radius, size, space } from '../../constants/theme';

type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
};

export function TextField({ label, error, style, ...props }: TextFieldProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.text3}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: space.tight,
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.fs13,
    color: colors.ink,
  },
  input: {
    height: size.field,
    paddingHorizontal: space.buttonMd,
    borderRadius: radius.pill,
    borderWidth: size.border,
    borderColor: colors.hairline,
    backgroundColor: colors.glass,
    fontFamily: fonts.regular,
    fontSize: fontSize.fs15,
    color: colors.ink,
  },
  inputError: {
    borderColor: colors.destructive,
  },
  error: {
    fontFamily: fonts.regular,
    fontSize: fontSize.fs13,
    color: colors.destructive,
  },
});

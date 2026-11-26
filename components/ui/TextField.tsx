import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, fontSize, fonts, opacity, radius, shadow, size, space } from '../../constants/theme';

type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
  quiet?: boolean;
  hideLabel?: boolean;
};

export function TextField({ label, error, quiet = false, hideLabel = false, editable = true, style, ...props }: TextFieldProps) {
  return (
    <View style={[styles.wrap, quiet && styles.quietWrap]}>
      {hideLabel ? null : <Text style={[styles.label, quiet && styles.quietLabel]}>{label}</Text>}
      <TextInput
        accessibilityLabel={label}
        editable={editable}
        placeholderTextColor={colors.text3}
        underlineColorAndroid="transparent"
        style={[styles.input, props.multiline ? styles.area : null, error ? styles.inputError : null, editable === false && styles.off, style]}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.tight },
  quietWrap: { gap: space.tight * 2 },
  label: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.fs13,
    color: colors.ink,
  },
  quietLabel: {
    fontFamily: fonts.regular,
    color: colors.text2,
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
    ...shadow.soft,
  },
  inputError: { borderColor: colors.destructive },
  area: {
    height: size.field * 2,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    textAlignVertical: 'top',
    paddingTop: space.gap,
  },
  off: { opacity: opacity.disabled },
  error: {
    fontFamily: fonts.regular,
    fontSize: fontSize.fs13,
    color: colors.destructive,
  },
});

import { t } from './i18n';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AuthFields = {
  fullName?: string;
  email?: string;
  password?: string;
};

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

export function validateLogin(email: string, password: string): AuthFields {
  const errors: AuthFields = {};
  if (!isValidEmail(email)) {
    errors.email = t('errors.emailInvalid');
  }
  if (password.length < 8) {
    errors.password = t('errors.passwordShort');
  }
  return errors;
}

export function validateRegister(fullName: string, email: string, password: string): AuthFields {
  const errors = validateLogin(email, password);
  if (!fullName.trim()) {
    errors.fullName = t('errors.nameEmpty');
  }
  return errors;
}

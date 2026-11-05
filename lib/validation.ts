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
    errors.email = 'Unesi ispravnu imejl adresu.';
  }
  if (password.length < 8) {
    errors.password = 'Lozinka mora imati najmanje 8 znakova.';
  }
  return errors;
}

export function validateRegister(fullName: string, email: string, password: string): AuthFields {
  const errors = validateLogin(email, password);
  if (!fullName.trim()) {
    errors.fullName = 'Unesi ime.';
  }
  return errors;
}

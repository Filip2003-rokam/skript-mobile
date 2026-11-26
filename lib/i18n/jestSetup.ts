// Testovi proveravaju srpske tekstove, bez obzira na jezik računara.
import i18n from './index';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

void i18n.changeLanguage('sr');

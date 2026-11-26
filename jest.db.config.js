// Testovi baze: pravi Postgres (PGlite) u Node okruženju, bez React Native-a.
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/supabase/tests/**/*.test.ts'],
  transform: { '^.+\\.tsx?$': ['babel-jest', { presets: ['babel-preset-expo'] }] },
  testTimeout: 60000,
};

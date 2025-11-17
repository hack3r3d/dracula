module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/?(*.)+(spec|test).ts'],
  testPathIgnorePatterns: ['/node_modules/', '\\.(d)\\.ts$'],
  setupFiles: ['<rootDir>/tests/setup-env.ts'],
};

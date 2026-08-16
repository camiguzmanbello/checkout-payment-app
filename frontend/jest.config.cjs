module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEach: [],
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  moduleNameMapper: {
    '\\.(css|less|scss)$': '<rootDir>/src/__mocks__/styleMock.js',
  },
  collectCoverageFrom: ['src/**/*.{js,jsx}', '!src/main.jsx'],
  coverageDirectory: 'coverage',
};

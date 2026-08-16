module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  moduleNameMapper: {
    '\\.(css|less|scss)$': '<rootDir>/src/__mocks__/styleMock.js',
    // import.meta no es parseable por Jest: se sustituye por un stub
    '^\\./apiBaseUrl$': '<rootDir>/src/__mocks__/apiBaseUrl.js',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/main.jsx', // solo monta la app en el DOM
    '!src/api/apiBaseUrl.js', // se sustituye por un stub, no puede ejecutarse aquí
  ],
  coverageDirectory: 'coverage',
};

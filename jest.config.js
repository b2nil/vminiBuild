module.exports = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: [],
  globals: {
    __PLATFORM__: "weapp"
  },
  transform: {
    "^.+\\.tsx?$": "esbuild-jest"
  },
  rootDir: __dirname,
  testMatch: ['<rootDir>/tests/**/*.spec.ts'],
  // CoverageProvider: 'v8',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/index.ts'
  ],
  watchPathIgnorePatterns: ['/node_modules/'],
}
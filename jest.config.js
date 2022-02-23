module.exports = {
  testEnvironment: "jsdom",
  setupFiles: [
    "<rootDir>/tests/setup.ts"
  ],
  globals: {
    "process.env.__PLATFORM__": "weapp"
  },
  moduleFileExtensions: ["js", "ts"],
  transform: {
    "^.+\\.tsx?$": "esbuild-jest",
    "^.+\\.vue$": "@vue/vue3-jest"
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
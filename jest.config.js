module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  testMatch: ["**/tests/**/*.(test|spec).tsx?", "**/tests/**/*.test.ts"],
  moduleFileExtensions: ['ts','tsx','js','jsx','json','node']
};

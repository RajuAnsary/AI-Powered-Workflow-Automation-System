module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  testTimeout: 30000,
  // Increase timeout for mongodb-memory-server startup
  globalSetup: undefined,
};

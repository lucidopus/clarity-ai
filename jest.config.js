/* eslint-disable @typescript-eslint/no-require-imports */
const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    // Next.js's `server-only` import is a runtime guard, not a real module.
    // Aliased to a no-op so pure-function tests can import server helpers.
    '^server-only$': '<rootDir>/lib/test/server-only-shim.ts',
  },
};
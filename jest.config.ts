// See https://jestjs.io/docs/configuration for more about configuration files.

import { Config } from "jest";

const config = {
    preset: "ts-jest",
    testEnvironment: "node",
    testMatch: ["**/*.test.ts"],
} satisfies Config;

export default config;

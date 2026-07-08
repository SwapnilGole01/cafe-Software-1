module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.json" }],
  },
  moduleNameMapper: {
    // Handle ESM imports in test files if they end in .ts/.tsx
    "^(\\./.*)\\.tsx?$": "$1",
  },
};

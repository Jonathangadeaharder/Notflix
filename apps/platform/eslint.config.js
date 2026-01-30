import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import svelteParser from "svelte-eslint-parser";
import eslintPluginSvelte from "eslint-plugin-svelte";
import sonarjs from "eslint-plugin-sonarjs";

import testingLibrary from "eslint-plugin-testing-library";
import vitest from "@vitest/eslint-plugin";
import globals from "globals";

const MAX_COGNITIVE_COMPLEXITY = 15;
const MAX_CYCLOMATIC_COMPLEXITY = 10;
const MAX_LINES_PER_FUNCTION = 50;

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...eslintPluginSvelte.configs["flat/recommended"],
  sonarjs.configs.recommended,
  {
    plugins: {
      "testing-library": testingLibrary,
      vitest: vitest,
    },
  },
  {
    files: ["**/*.test.ts"],
    rules: {
      ...vitest.configs.recommended.rules,
      "vitest/no-focused-tests": "error",
      "vitest/no-disabled-tests": "warn",
      "vitest/consistent-test-it": [
        "error",
        { fn: "it", withinDescribe: "it" },
      ],
      "vitest/no-conditional-expect": "error",
      "vitest/no-identical-title": "error",
      "vitest/prefer-to-have-length": "warn",
      "vitest/prefer-expect-resolves": "warn",
    },
  },
  {
    files: ["**/*.test.ts", "**/*.spec.ts"],
    rules: {
      ...testingLibrary.configs.svelte.rules,

      // Testing Library rules
      "testing-library/prefer-user-event": "warn",
      "testing-library/no-container": "error",
      "testing-library/no-node-access": "warn",
      "testing-library/no-debugging-utils": "warn",
    },
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2017,
      },
    },
  },
  {
    files: ["**/*.svelte"],
    languageOptions: {
      parser: svelteParser,
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "sonarjs/cognitive-complexity": ["error", MAX_COGNITIVE_COMPLEXITY],
      "sonarjs/no-duplicate-string": "error",
      "sonarjs/no-unused-collection": "off",
      complexity: ["error", MAX_CYCLOMATIC_COMPLEXITY],
      "max-lines-per-function": [
        "error",
        {
          max: MAX_LINES_PER_FUNCTION,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
      "no-magic-numbers": [
        "error",
        { ignore: [0, 1], ignoreArrayIndexes: true },
      ],
    },
  },
  {
    ignores: [
      "build/",
      ".svelte-kit/",
      "dist/",
      "report/",
      "src/lib/server/infrastructure/brain-api.d.ts",
    ],
  },
);

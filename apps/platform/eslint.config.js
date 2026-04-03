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
      "testing-library/prefer-user-event": "off",
      "testing-library/no-container": "off",
      "testing-library/no-node-access": "warn",
      "testing-library/no-debugging-utils": "warn",
      "testing-library/prefer-screen-queries": "off",
      "sonarjs/unused-import": "off"
    },
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2017,
        Hst: "readonly"
      },
    },
  },
  {
    files: ["**/*.svelte", "**/*.story.svelte"],
    languageOptions: {
      parser: svelteParser,
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "sonarjs/cognitive-complexity": ["warn", MAX_COGNITIVE_COMPLEXITY],
      "sonarjs/no-duplicate-string": "warn",
      "sonarjs/no-unused-collection": "off",
      "svelte/no-useless-children-snippet": "off",
      complexity: ["warn", MAX_CYCLOMATIC_COMPLEXITY],
      "max-lines-per-function": "warn",
      "no-magic-numbers": "warn",
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
  {
    files: ["**/*.test.ts", "**/*.spec.ts", "tests/**/*.ts", "src/**/*.test.ts"],
    rules: {
      "no-magic-numbers": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "max-lines-per-function": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "sonarjs/no-unused-vars": "off",
      "sonarjs/no-dead-store": "off"
    },
  }
);

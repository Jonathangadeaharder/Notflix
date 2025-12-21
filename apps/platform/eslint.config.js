import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import svelteParser from 'svelte-eslint-parser';
import eslintPluginSvelte from 'eslint-plugin-svelte';
import sonarjs from 'eslint-plugin-sonarjs';
import globals from 'globals';

export default tseslint.config(
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	...eslintPluginSvelte.configs['flat/recommended'],
	sonarjs.configs.recommended,
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
				...globals.es2017
			}
		}
	},
	{
		files: ['**/*.svelte'],
		languageOptions: {
			parser: svelteParser,
			parserOptions: {
				parser: tseslint.parser
			}
		}
	},
	{
		rules: {
			'@typescript-eslint/no-explicit-any': 'error',
			'sonarjs/cognitive-complexity': ['error', 15],
			'sonarjs/no-duplicate-string': 'warn',
			'sonarjs/no-unused-collection': 'off',
			'complexity': ['error', 10],
			'max-lines-per-function': ['warn', { max: 50, skipBlankLines: true, skipComments: true }],
			'no-magic-numbers': ['warn', { ignore: [0, 1, 100], ignoreArrayIndexes: true }]
		}
	},
	{
		ignores: ['build/', '.svelte-kit/', 'dist/']
	}
);

// https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from 'eslint-plugin-storybook';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { createDesktopEslintConfig } from '@rolodex/eslint-config';

export default createDesktopEslintConfig({
  reactRefresh,
  reactHooksRecommended: reactHooks.configs['recommended-latest'],
  storybookFlatRecommended: storybook.configs['flat/recommended'],
});

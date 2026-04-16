import type { Preview } from '@storybook/react-vite';
import '../src/globals.css';

const preview: Preview = {
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'canvas',
      values: [
        { name: 'canvas', value: '#FFFFFF' },
        { name: 'warm', value: '#F6F5F4' },
        { name: 'dark', value: '#0A0B0D' },
      ],
    },
    controls: {
      expanded: true,
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;

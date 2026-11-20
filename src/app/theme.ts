import { Card, createTheme, Modal, Paper } from '@mantine/core';

export const appTheme = createTheme({
  primaryColor: 'cyan',
  primaryShade: { light: 6, dark: 5 },
  defaultRadius: 'md',
  fontFamily:
    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  fontFamilyMonospace:
    '"JetBrains Mono", "Fira Code", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  headings: {
    fontFamily:
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    fontWeight: '700',
  },
  colors: {
    dark: [
      '#e4eef8',
      '#b7c7dc',
      '#8ea3be',
      '#647996',
      '#2a364a',
      '#1e2839',
      '#131b29',
      '#0b101b',
      '#070b13',
      '#04070d',
    ],
  },
  components: {
    Card: Card.extend({
      classNames: {
        root: 'cyber-glass-card',
      },
    }),
    Paper: Paper.extend({
      classNames: {
        root: 'cyber-glass-paper',
      },
    }),
    Modal: Modal.extend({
      defaultProps: {
        overlayProps: {
          backgroundOpacity: 0.72,
          blur: 6,
        },
      },
    }),
  },
});

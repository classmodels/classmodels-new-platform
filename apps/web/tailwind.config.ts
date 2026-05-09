import type { Config } from 'tailwindcss';
import { cmDesign } from '@cm/shared';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: cmDesign.colors.ink,
        burgundy: cmDesign.colors.burgundy,
        burgundyDeep: cmDesign.colors.burgundyDeep,
        muted: cmDesign.colors.muted,
        line: cmDesign.colors.line,
        panel: cmDesign.colors.panel,
        success: cmDesign.colors.success,
        danger: cmDesign.colors.danger,
      },
      fontFamily: {
        serif: [cmDesign.font.serif],
        sans: [cmDesign.font.sans],
      },
      borderRadius: {
        cm: cmDesign.radius.md,
      },
    },
  },
  plugins: [],
};

export default config;

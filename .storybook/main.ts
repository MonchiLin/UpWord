import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig, Plugin } from "vite";
import astroConfig from "../astro.config.mjs";

/**
 * 因为 storybook 不支持 astro:env/client，所以需要一个虚拟的插件来提供这个环境变量
 */
function virtualAstroEnv(): Plugin {
  return {
    name: 'vite-plugin-astro-env',
    resolveId(id) {
      if (id === 'astro:env/client') {
        return '\0astro:env/client';
      }
    },
    load(id) {
      if (id === '\0astro:env/client') {
        return `export const PUBLIC_API_BASE = "${process.env.PUBLIC_API_BASE}"`;
      }
    }
  }
}

const config: StorybookConfig = {
  "stories": [
    "../src/**/*.mdx",
    "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "addons": [
    "@chromatic-com/storybook",
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
    "@storybook/addon-onboarding"
  ],
  "framework": "@storybook/react-vite",
  viteFinal: (config) => {
    config.plugins?.push(virtualAstroEnv());
    return mergeConfig(config, astroConfig.vite!);
  },
};
export default config;
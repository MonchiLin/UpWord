import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import {fileURLToPath} from "node:url";
import astroConfig from "../astro.config.mjs";

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
  viteFinal: (config)=>  {
    return mergeConfig(config, astroConfig.vite!);
  },
};
export default config;
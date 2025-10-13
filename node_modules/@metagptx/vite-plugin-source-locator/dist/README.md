# vite-plugin-source-locator

A Vite plugin for DOM element source location tracking. This plugin helps you locate DOM elements in your source code during development.

## Features

- Support for Vue 3 components
- Support for React components (JSX/TSX)
- Automatic source location tracking
- Customizable configuration

## Installation

```bash
npm install vite-plugin-source-locator
# or
yarn add vite-plugin-source-locator
# or
pnpm add vite-plugin-source-locator
```

## Usage

```js
// vite.config.js
import { defineConfig } from "vite";
import { viteSourceLocator } from "vite-plugin-source-locator";
import vue from "@vitejs/plugin-vue"; // for Vue projects
import react from "@vitejs/plugin-react"; // for React projects

export default defineConfig({
  plugins: [
    // For Vue projects, use after vue() plugin
    vue(),
    viteSourceLocator({
      // options
    }),

    // For React projects, use before react() plugin
    viteSourceLocator({
      // options
    }),
    react(),
  ],
});
```

> **Important**: Plugin ordering matters:
>
> - For Vue projects: Use `viteSourceLocator` after `vue()` plugin
> - For React projects: Use `viteSourceLocator` before `react()` plugin

## Options

```ts
interface PluginOptions {
  // Directories to include (default: ['src'])
  include?: string[];

  // Prefix for data attributes (default: 'locator')
  prefix?: string;

  // Enable/disable the plugin (default: true)
  enable?: boolean;
}
```

## Example

Input:

```vue
<template>
  <div>Hello World</div>
</template>
```

Output:

```vue
<template>
  <div data-locator-path="src/components/Hello.vue" data-locator-line="2">Hello World</div>
</template>
```

## Upgrade Notes

- **v0.0.5**
  - fix issure:
    - Page crash when dom content has “"” character.
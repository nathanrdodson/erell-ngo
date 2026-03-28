import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
	// Enable React to support React JSX components.
	integrations: [react()],

	// GitHub Pages — subdirectory deployment (no custom domain)
	site: 'https://nathanrdodson.github.io',
	base: '/erell-ngo',
	trailingSlash: 'always',
});

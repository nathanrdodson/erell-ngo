import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
	// Enable React to support React JSX components.
	integrations: [react()],

	// GitHub Pages deployment — set site to custom domain.
	// If deploying to nathanrdodson.github.io/erell-ngo instead,
	// change site to 'https://nathanrdodson.github.io' and add base: '/erell-ngo'.
	//site: 'https://www.erell.ngo',
	site: 'https://nathanrdodson.github.io',
  	base: '/erell-ngo',
});

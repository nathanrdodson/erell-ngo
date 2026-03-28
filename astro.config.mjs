import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
	// Enable React to support React JSX components.
	integrations: [react()],

	// GitHub Pages deployment with custom domain.
	// DNS: CNAME www.erell.ngo → nathanrdodson.github.io
	// GitHub: Settings → Pages → Custom domain → www.erell.ngo
	site: 'https://www.erell.ngo',
});

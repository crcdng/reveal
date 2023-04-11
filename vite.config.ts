import { defineConfig, mergeConfig } from "vite";
import * as path from "path";
import { svelte } from "@sveltejs/vite-plugin-svelte";  

export default ({ command }) => {
	const isBuild = command === "build";
	
	return defineConfig({
        base: '/reveal/', // https://hrishikeshpathak.com/blog/svelte-gh-pages/

		plugins: [svelte()],
			define: {
				global: {}
			},
		build: {
			target: "esnext",
			commonjsOptions: {
				transformMixedEsModules: true
			}
		},
		resolve: {
			alias: {
				"@airgap/beacon-sdk": path.resolve(
					path.resolve(),
					`./node_modules/@airgap/beacon-sdk/dist/${
					isBuild ? "esm" : "cjs"
					}/index.js`
				),
				// polyfills
				"readable-stream": "vite-compatible-readable-stream",
				stream: "vite-compatible-readable-stream"
			}
		}
	});
};

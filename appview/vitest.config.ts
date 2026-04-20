import { defineConfig, mergeConfig } from "vitest/config";

import viteConfig from "./vite.config";

const resolvedViteConfig =
	typeof viteConfig === "function"
		? viteConfig({
				command: "serve",
				mode: "test",
				isSsrBuild: false,
				isPreview: false,
			})
		: viteConfig;

export default mergeConfig(
	resolvedViteConfig,
	defineConfig({
		test: {
			include: ["src/**/*.{test,spec}.{js,ts}"],
		},
	}),
);

import { defineConfig, loadEnv } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";

export function resolveLocalDevServer(env: Record<string, string | undefined>) {
	const origin = env.ORIGIN
		? new URL(env.ORIGIN)
		: new URL(`http://127.0.0.1:${env.PORT || "3000"}`);

	return {
		host: origin.hostname === "[::1]" ? "::1" : origin.hostname,
		port: Number(origin.port || (origin.protocol === "https:" ? "443" : "80")),
	};
}

export default defineConfig(({ command, mode, isPreview }) => {
	const config = {
		plugins: [sveltekit()],
	};

	if (command !== "serve" || isPreview || mode === "test") {
		return config;
	}

	const env = loadEnv(mode, process.cwd(), "");
	Object.assign(process.env, env);
	const server = resolveLocalDevServer(env);

	return {
		...config,
		server: {
			host: server.host,
			port: server.port,
			strictPort: true,
		},
	};
});

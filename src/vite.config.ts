import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Base path matches the GitHub repository name so all asset URLs resolve
// correctly when served from https://tonyraoul.github.io/station-alpha/
// During local dev the base is "/" so localhost works normally.
export default defineConfig(({ command }) => ({
    base: command === "build" ? "/station-alpha/" : "/",
    plugins: [react()],
    build: {
        outDir: "../dist",
        emptyOutDir: true,
    },
}));

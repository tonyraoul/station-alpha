import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Base path matches the GitHub repository name so all asset URLs resolve
// correctly when served from https://tonyraoul.github.io/station-alpha/
export default defineConfig({
    base: "/station-alpha/",
    plugins: [react()],
    build: {
        outDir: "../dist",
        emptyOutDir: true,
    },
});

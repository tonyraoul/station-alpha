import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => ({
    base: command === "build" ? "/station-alpha/" : "/",
    plugins: [react()],
    build: {
        outDir: "../dist",
        emptyOutDir: true,
    },
}));

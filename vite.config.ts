// @lovable.dev/vite-tanstack-config already includes the core plugins — do NOT add them manually.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// CAPACITOR=1 builds a static offline app (dist/client/index.html) for Android Studio.
const isCapacitor = !!process.env.CAPACITOR;

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
    ...(isCapacitor ? { spa: { enabled: true, prerender: { outputPath: "/index.html" } } } : {}),
  },
});

import deno from "@deno/vite-plugin";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [deno()],

  /*
   * Vite does not recognize a Deno workspace as a monorepo workspace root,
   * so explicitly allow the development server to serve the sibling Core
   * package resolved through @chip8nx/core.
   */
  server: {
    fs: {
      allow: ["../.."],
    },
  },
});

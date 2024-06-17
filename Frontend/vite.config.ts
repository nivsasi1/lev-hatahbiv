import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import svgr from "vite-plugin-svgr";
import fs from "fs"
// https://vitejs.dev/config/
// const URL = import.meta.env.URL;

const URL = "http://localhost:5000";

export default defineConfig({
  plugins: [preact(),svgr()],
  build: {
    target: "chrome70"
  },
  server: {
    proxy: {
        '/LevHatahbiv': {
            target: URL,
            changeOrigin: true,
        },
        '/public': {
            target: URL,
            changeOrigin: true,
        },
    },
    https: {
      key: fs.readFileSync("key.pem"),
      cert: fs.readFileSync("cert.pem"),
      passphrase: "Itay"
    }
},
})
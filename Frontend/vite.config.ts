import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import svgr from "vite-plugin-svgr";
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
        '/AtalReservesApi': {
            target: URL,
            changeOrigin: true,
        },
        '/public': {
            target: URL,
            changeOrigin: true,
        },
    },
},
})
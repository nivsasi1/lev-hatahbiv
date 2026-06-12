// Builds the storefront and publishes it to the `gh-pages` branch, which
// GitHub serves at https://nivsasi1.github.io/lev-hatahbiv/ — a preview link
// that works from any device with this PC off. (The final site will live on
// the lev-hatahbiv.com domain instead.)
//
//   cd Frontend && node scripts/deploy-ghpages.mjs
//
// The manager dashboard / newsletter / order-logging need the local backend,
// so those are inert on the preview; browsing, cart and WhatsApp checkout work.
import { execSync } from "child_process";
import { cpSync, writeFileSync, rmSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const frontend = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(frontend, "dist");
const REPO = "https://github.com/nivsasi1/lev-hatahbiv.git";
const run = (cmd, cwd) =>
  execSync(cmd, { cwd, stdio: "inherit", shell: true });

console.log("→ building for GitHub Pages…");
process.env.GHPAGES = "1"; // read by vite.config.ts to set the subfolder base
run("npx vite build", frontend);

// SPA fallback + Jekyll opt-out
cpSync(join(dist, "index.html"), join(dist, "404.html"));
writeFileSync(join(dist, ".nojekyll"), "");

console.log("→ publishing to gh-pages…");
rmSync(join(dist, ".git"), { recursive: true, force: true });
run("git init -q", dist);
run("git checkout -q -b gh-pages", dist);
run("git add -A", dist);
run('git -c user.name="nivsasi1" -c user.email="nivsasi@gmail.com" commit -q -m "Deploy preview"', dist);
run(`git push -q -f ${REPO} gh-pages`, dist);

console.log("\n✓ live at https://nivsasi1.github.io/lev-hatahbiv/ (give it ~1 min)");

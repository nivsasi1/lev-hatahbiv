// Preload with `node -r ./scripts/dns-public.js dump-products.js` when the local
// resolver refuses SRV lookups (Atlas mongodb+srv:// fails with querySrv ECONNREFUSED).
require("dns").setServers(["8.8.8.8", "1.1.1.1"]);

if (process.argv.includes("--version") || process.argv.includes("-v")) {
  console.log(process.env.PKG_VERSION);
  process.exit(0);
}

import "../src/index.js";

// Node's markup tests inspect semantics; Next.js owns CSS Module compilation.
// Load this alongside tsx when rendering components that import .module.css.
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
require.extensions[".css"] = (module) => {
  module.exports = { __esModule: true, default: new Proxy({}, { get: (_, name) => String(name) }) };
};

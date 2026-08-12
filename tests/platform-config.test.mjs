import assert from "node:assert/strict";
import test from "node:test";

import nextConfig from "../next.config.mjs";

test("new site is not mounted under the old online-course base path", () => {
  assert.equal(nextConfig.basePath, undefined);
  assert.equal(nextConfig.assetPrefix, undefined);
});

test("production build checks TypeScript and uses the Next server runtime", () => {
  assert.notEqual(nextConfig.typescript?.ignoreBuildErrors, true);
  assert.equal(nextConfig.output, undefined);
  assert.equal(nextConfig.reactStrictMode, true);
});

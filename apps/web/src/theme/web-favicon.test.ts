import { assert, assertStringIncludes } from "@std/assert";

import { createWebFaviconDataUrl } from "./web-favicon.ts";

Deno.test("creates an SVG data URL using the supplied theme palette", () => {
  const dataUrl = createWebFaviconDataUrl({
    background: "#010203",
    foreground: "#112233",
    border: "#445566",
    accent: "#778899",
  });

  assert(dataUrl.startsWith("data:image/svg+xml,"));

  const svg = decodeURIComponent(dataUrl.slice("data:image/svg+xml,".length));

  assertStringIncludes(svg, 'fill="#010203"');
  assertStringIncludes(svg, 'fill="#112233"');
  assertStringIncludes(svg, 'stroke="#445566"');
  assertStringIncludes(svg, 'fill="#778899"');
});

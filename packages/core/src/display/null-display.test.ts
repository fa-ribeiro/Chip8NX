import { DisplayBuffer } from "./display-buffer.ts";
import { NullDisplay } from "./null-display.ts";

Deno.test("NullDisplay can render a display buffer", () => {
  const display = new NullDisplay();
  const buffer = new DisplayBuffer(64, 32, "clip");

  display.render(buffer);
});

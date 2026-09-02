import { assertEquals } from "@std/assert";
import { TerminalKeyEventParser } from "./terminal-key-event-parser.ts";

const encoder = new TextEncoder();

Deno.test("parses legacy characters as press events", () => {
  const parser = new TerminalKeyEventParser();

  assertEquals(parser.feed(encoder.encode("qw")), [
    {
      source: "legacy",
      type: "press",
      character: "q",
      modifiers: noModifiers(),
    },
    {
      source: "legacy",
      type: "press",
      character: "w",
      modifiers: noModifiers(),
    },
  ]);
});

Deno.test("parses CSI-u press events", () => {
  const parser = new TerminalKeyEventParser();

  assertEquals(parser.feed(encoder.encode("\x1b[113;1:1u")), [
    {
      source: "csi-u",
      type: "press",
      character: "q",
      modifiers: noModifiers(),
    },
  ]);
});

Deno.test("parses CSI-u repeat and release events", () => {
  const parser = new TerminalKeyEventParser();

  assertEquals(parser.feed(encoder.encode("\x1b[119;1:2u\x1b[119;1:3u")), [
    {
      source: "csi-u",
      type: "repeat",
      character: "w",
      modifiers: noModifiers(),
    },
    {
      source: "csi-u",
      type: "release",
      character: "w",
      modifiers: noModifiers(),
    },
  ]);
});

Deno.test("decodes CSI-u modifiers", () => {
  const parser = new TerminalKeyEventParser();

  /*
   * CSI-u modifier values are encoded as 1 + bitmask.
   *
   * shift | ctrl = 0b101
   * encoded value = 0b101 + 1 = 6
   */
  assertEquals(parser.feed(encoder.encode("\x1b[99;6:1u")), [
    {
      source: "csi-u",
      type: "press",
      character: "c",
      modifiers: {
        ...noModifiers(),
        shift: true,
        ctrl: true,
      },
    },
  ]);
});

Deno.test("buffers CSI-u sequences split across input chunks", () => {
  const parser = new TerminalKeyEventParser();

  assertEquals(parser.feed(encoder.encode("\x1b[120;1:")), []);

  assertEquals(parser.feed(encoder.encode("3u")), [
    {
      source: "csi-u",
      type: "release",
      character: "x",
      modifiers: noModifiers(),
    },
  ]);
});

Deno.test("parses CSI-u press with default event type", () => {
  const parser = new TerminalKeyEventParser();

  assertEquals(parser.feed(encoder.encode("\x1b[120u")), [
    {
      source: "csi-u",
      type: "press",
      character: "x",
      modifiers: noModifiers(),
    },
  ]);
});

Deno.test("ignores unsupported CSI sequences without losing later input", () => {
  const parser = new TerminalKeyEventParser();

  assertEquals(parser.feed(encoder.encode("\x1b[Aq")), [
    {
      source: "legacy",
      type: "press",
      character: "q",
      modifiers: noModifiers(),
    },
  ]);
});

Deno.test("ignores ESC-prefixed legacy modifier sequences", () => {
  const parser = new TerminalKeyEventParser();

  assertEquals(parser.feed(encoder.encode("\x1bq")), []);
});

function noModifiers() {
  return {
    shift: false,
    alt: false,
    ctrl: false,
    super: false,
    hyper: false,
    meta: false,
    capsLock: false,
    numLock: false,
  };
}

import { assertEquals } from "@std/assert";
import { address } from "@chip8nx/core";
import { AddressBreakpoints } from "./address-breakpoints.ts";

Deno.test(
  "AddressBreakpoints adds enabled breakpoints and snapshots them in address order",
  () => {
    const breakpoints = new AddressBreakpoints();

    assertEquals(breakpoints.add(address(0x300)), true);
    assertEquals(breakpoints.add(address(0x204)), true);
    assertEquals(breakpoints.add(address(0x300)), false);

    assertEquals(breakpoints.snapshot(), [
      { address: address(0x204), enabled: true },
      { address: address(0x300), enabled: true },
    ]);
  },
);

Deno.test("AddressBreakpoints removes an existing breakpoint", () => {
  const breakpoints = new AddressBreakpoints();

  breakpoints.add(address(0x204));

  assertEquals(breakpoints.remove(address(0x204)), true);
  assertEquals(breakpoints.remove(address(0x204)), false);
  assertEquals(breakpoints.snapshot(), []);
});

Deno.test("AddressBreakpoints enables and disables an existing breakpoint", () => {
  const breakpoints = new AddressBreakpoints();

  breakpoints.add(address(0x204));

  assertEquals(breakpoints.setEnabled(address(0x204), false), true);
  assertEquals(breakpoints.setEnabled(address(0x204), false), false);
  assertEquals(breakpoints.snapshot(), [{ address: address(0x204), enabled: false }]);

  assertEquals(breakpoints.setEnabled(address(0x204), true), true);
  assertEquals(breakpoints.setEnabled(address(0x300), false), false);
  assertEquals(breakpoints.snapshot(), [{ address: address(0x204), enabled: true }]);
});

Deno.test("AddressBreakpoints denies an enabled breakpoint and records its hit", () => {
  const breakpoints = new AddressBreakpoints();

  breakpoints.add(address(0x204));

  assertEquals(breakpoints.shouldExecute(address(0x204)), false);
  assertEquals(breakpoints.takeHit(), address(0x204));
  assertEquals(breakpoints.takeHit(), undefined);
});

Deno.test("AddressBreakpoints allows execution at a disabled breakpoint", () => {
  const breakpoints = new AddressBreakpoints();

  breakpoints.add(address(0x204));
  breakpoints.setEnabled(address(0x204), false);

  assertEquals(breakpoints.shouldExecute(address(0x204)), true);
  assertEquals(breakpoints.takeHit(), undefined);
});

Deno.test("AddressBreakpoints suppresses one matching breakpoint attempt only", () => {
  const breakpoints = new AddressBreakpoints();

  breakpoints.add(address(0x204));
  breakpoints.suppressOnce(address(0x204));

  assertEquals(breakpoints.shouldExecute(address(0x204)), true);
  assertEquals(breakpoints.shouldExecute(address(0x204)), false);
  assertEquals(breakpoints.takeHit(), address(0x204));
});

Deno.test(
  "AddressBreakpoints expires one-shot suppression when execution reaches a different address",
  () => {
    const breakpoints = new AddressBreakpoints();

    breakpoints.add(address(0x204));
    breakpoints.add(address(0x206));
    breakpoints.suppressOnce(address(0x204));

    assertEquals(breakpoints.shouldExecute(address(0x206)), false);
    assertEquals(breakpoints.takeHit(), address(0x206));
    assertEquals(breakpoints.shouldExecute(address(0x204)), false);
  },
);

Deno.test(
  "AddressBreakpoints resets transient execution state without removing configured breakpoints",
  () => {
    const breakpoints = new AddressBreakpoints();

    breakpoints.add(address(0x204));
    breakpoints.shouldExecute(address(0x204));
    breakpoints.suppressOnce(address(0x204));

    breakpoints.resetExecutionState();

    assertEquals(breakpoints.takeHit(), undefined);
    assertEquals(breakpoints.shouldExecute(address(0x204)), false);
    assertEquals(breakpoints.snapshot(), [{ address: address(0x204), enabled: true }]);
  },
);

Deno.test(
  "AddressBreakpoints clear removes configured breakpoints and transient execution state",
  () => {
    const breakpoints = new AddressBreakpoints();

    breakpoints.add(address(0x204));
    breakpoints.shouldExecute(address(0x204));
    breakpoints.suppressOnce(address(0x204));

    breakpoints.clear();

    assertEquals(breakpoints.snapshot(), []);
    assertEquals(breakpoints.takeHit(), undefined);
    assertEquals(breakpoints.shouldExecute(address(0x204)), true);
  },
);

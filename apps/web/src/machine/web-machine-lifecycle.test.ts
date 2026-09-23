import { assertEquals, assertStrictEquals } from "@std/assert";
import { address, ExitState } from "@chip8nx/core";
import { AddressBreakpoints } from "../debugger/address-breakpoints.ts";
import { WebMachineLifecycle } from "./web-machine-lifecycle.ts";

Deno.test("WebMachineLifecycle activates input and starts user-paused", () => {
  const runtime = new FakeRuntime();
  const exitState = new ExitState();
  const input = new FakeInput();
  const breakpoints = new AddressBreakpoints();
  const lifecycle = new WebMachineLifecycle(runtime, exitState, () => {}, [input], breakpoints);

  lifecycle.activate();

  assertEquals(lifecycle.state, {
    kind: "paused",
    reason: { kind: "user" },
  });
  assertEquals(runtime.isPaused, true);
  assertEquals(input.started, true);
});

Deno.test(
  "WebMachineLifecycle starts and user-pauses scheduled execution without stopping input",
  () => {
    const runtime = new FakeRuntime();
    const exitState = new ExitState();
    const input = new FakeInput();
    const breakpoints = new AddressBreakpoints();
    const lifecycle = new WebMachineLifecycle(
      runtime,
      exitState,
      () => {},
      [input],
      breakpoints,
    );

    lifecycle.activate();
    const startState = lifecycle.start();

    assertEquals(startState.kind, "running");
    assertEquals(lifecycle.state.kind, "running");
    assertEquals(runtime.isPaused, false);
    assertEquals(input.started, true);

    lifecycle.pause();

    assertEquals(lifecycle.state, {
      kind: "paused",
      reason: { kind: "user" },
    });
    assertEquals(runtime.isPaused, true);
    assertEquals(input.started, true);
  },
);

Deno.test("WebMachineLifecycle records a breakpoint pause after a denied runtime tick", () => {
  const runtime = new FakeRuntime();
  const exitState = new ExitState();
  const input = new FakeInput();
  const breakpoints = new AddressBreakpoints();
  const breakpointAddress = address(0x204);
  const lifecycle = new WebMachineLifecycle(runtime, exitState, () => {}, [input], breakpoints);

  breakpoints.add(breakpointAddress);

  runtime.onTick = () => {
    if (!breakpoints.shouldExecute(breakpointAddress)) {
      runtime.pause();
    }
  };

  lifecycle.activate();
  lifecycle.start();
  const tickState = lifecycle.tick();

  assertEquals(tickState, {
    kind: "paused",
    reason: {
      kind: "breakpoint",
      address: breakpointAddress,
    },
  });
  assertEquals(runtime.isPaused, true);
  assertEquals(input.started, true);
});

Deno.test(
  "WebMachineLifecycle continue from breakpoint permits retries until execution leaves the stopped address",
  () => {
    const runtime = new FakeRuntime();
    const exitState = new ExitState();
    const input = new FakeInput();
    const breakpoints = new AddressBreakpoints();
    const breakpointAddress = address(0x204);
    const nextAddress = address(0x206);
    const lifecycle = new WebMachineLifecycle(
      runtime,
      exitState,
      () => {},
      [input],
      breakpoints,
    );
    let currentAddress = breakpointAddress;

    breakpoints.add(breakpointAddress);

    runtime.onTick = () => {
      if (!breakpoints.shouldExecute(currentAddress)) {
        runtime.pause();
      }
    };

    lifecycle.activate();
    lifecycle.start();
    lifecycle.tick();

    const continueState = lifecycle.start();

    assertEquals(continueState.kind, "running");

    assertEquals(lifecycle.tick().kind, "running");
    assertEquals(lifecycle.tick().kind, "running");
    assertEquals(runtime.isPaused, false);

    currentAddress = nextAddress;

    assertEquals(lifecycle.tick().kind, "running");

    currentAddress = breakpointAddress;

    assertEquals(lifecycle.tick(), {
      kind: "paused",
      reason: {
        kind: "breakpoint",
        address: breakpointAddress,
      },
    });
    assertEquals(runtime.isPaused, true);
  },
);

Deno.test(
  "WebMachineLifecycle manual step from breakpoint becomes a user pause without suppression",
  () => {
    const runtime = new FakeRuntime();
    const exitState = new ExitState();
    const input = new FakeInput();
    const breakpoints = new AddressBreakpoints();
    const breakpointAddress = address(0x204);
    const lifecycle = new WebMachineLifecycle(
      runtime,
      exitState,
      () => {},
      [input],
      breakpoints,
    );
    let stepCount = 0;

    breakpoints.add(breakpointAddress);

    runtime.onTick = () => {
      if (!breakpoints.shouldExecute(breakpointAddress)) {
        runtime.pause();
      }
    };
    runtime.onStep = () => {
      stepCount++;
    };

    lifecycle.activate();
    lifecycle.start();
    lifecycle.tick();

    const stepState = lifecycle.step();

    assertEquals(stepCount, 1);
    assertEquals(stepState, {
      kind: "paused",
      reason: { kind: "user" },
    });
    assertEquals(breakpoints.shouldExecute(breakpointAddress), false);
  },
);

Deno.test("WebMachineLifecycle user pause clears pending breakpoint resume suppression", () => {
  const runtime = new FakeRuntime();
  const exitState = new ExitState();
  const input = new FakeInput();
  const breakpoints = new AddressBreakpoints();
  const breakpointAddress = address(0x204);
  const lifecycle = new WebMachineLifecycle(runtime, exitState, () => {}, [input], breakpoints);

  breakpoints.add(breakpointAddress);

  runtime.onTick = () => {
    if (!breakpoints.shouldExecute(breakpointAddress)) {
      runtime.pause();
    }
  };

  lifecycle.activate();
  lifecycle.start();
  lifecycle.tick();
  lifecycle.start();
  lifecycle.pause();

  assertEquals(breakpoints.shouldExecute(breakpointAddress), false);
});

Deno.test(
  "WebMachineLifecycle enters exited state when a runtime tick exits the interpreter",
  () => {
    const runtime = new FakeRuntime();
    const exitState = new ExitState();
    const input = new FakeInput();
    const breakpoints = new AddressBreakpoints();
    const lifecycle = new WebMachineLifecycle(
      runtime,
      exitState,
      () => {},
      [input],
      breakpoints,
    );

    runtime.onTick = () => {
      exitState.exit();
    };

    lifecycle.activate();
    lifecycle.start();
    const tickState = lifecycle.tick();

    assertEquals(tickState.kind, "exited");
    assertEquals(lifecycle.state.kind, "exited");
    assertEquals(runtime.isPaused, true);
    assertEquals(input.started, false);
  },
);

Deno.test(
  "WebMachineLifecycle enters exited state when a manual step exits the interpreter",
  () => {
    const runtime = new FakeRuntime();
    const exitState = new ExitState();
    const input = new FakeInput();
    const breakpoints = new AddressBreakpoints();
    const lifecycle = new WebMachineLifecycle(
      runtime,
      exitState,
      () => {},
      [input],
      breakpoints,
    );

    runtime.onStep = () => {
      exitState.exit();
    };

    lifecycle.activate();
    const stepState = lifecycle.step();

    assertEquals(stepState.kind, "exited");
    assertEquals(lifecycle.state.kind, "exited");
    assertEquals(runtime.isPaused, true);
    assertEquals(input.started, false);
  },
);

Deno.test("WebMachineLifecycle stops input and records a runtime tick failure", () => {
  const runtime = new FakeRuntime();
  const exitState = new ExitState();
  const input = new FakeInput();
  const breakpoints = new AddressBreakpoints();
  const expectedError = new Error("tick failed");
  const lifecycle = new WebMachineLifecycle(runtime, exitState, () => {}, [input], breakpoints);

  runtime.onTick = () => {
    throw expectedError;
  };

  lifecycle.activate();
  lifecycle.start();

  let actualError: unknown;

  try {
    lifecycle.tick();
  } catch (error) {
    actualError = error;
  }

  assertStrictEquals(actualError, expectedError);
  assertEquals(lifecycle.state.kind, "failed");

  if (lifecycle.state.kind !== "failed") {
    throw new Error("Expected failed lifecycle state.");
  }

  assertStrictEquals(lifecycle.state.error, expectedError);
  assertEquals(runtime.isPaused, true);
  assertEquals(input.started, false);
});

Deno.test("WebMachineLifecycle stops input and records a manual step failure", () => {
  const runtime = new FakeRuntime();
  const exitState = new ExitState();
  const input = new FakeInput();
  const breakpoints = new AddressBreakpoints();
  const expectedError = new Error("step failed");
  const lifecycle = new WebMachineLifecycle(runtime, exitState, () => {}, [input], breakpoints);

  runtime.onStep = () => {
    throw expectedError;
  };

  lifecycle.activate();

  let actualError: unknown;

  try {
    lifecycle.step();
  } catch (error) {
    actualError = error;
  }

  assertStrictEquals(actualError, expectedError);
  assertEquals(lifecycle.state.kind, "failed");
  assertEquals(runtime.isPaused, true);
  assertEquals(input.started, false);
});

Deno.test(
  "WebMachineLifecycle reset after failure restarts input and returns user-paused",
  () => {
    const runtime = new FakeRuntime();
    const exitState = new ExitState();
    const input = new FakeInput();
    const breakpoints = new AddressBreakpoints();
    let resetCount = 0;
    const lifecycle = new WebMachineLifecycle(
      runtime,
      exitState,
      () => {
        resetCount++;
        exitState.reset();
      },
      [input],
      breakpoints,
    );

    runtime.onTick = () => {
      throw new Error("tick failed");
    };

    lifecycle.activate();
    lifecycle.start();

    try {
      lifecycle.tick();
    } catch {
      // Expected failure establishes the recovery scenario under test.
    }

    lifecycle.reset();

    assertEquals(resetCount, 1);
    assertEquals(lifecycle.state, {
      kind: "paused",
      reason: { kind: "user" },
    });
    assertEquals(runtime.isPaused, true);
    assertEquals(input.started, true);
  },
);

Deno.test(
  "WebMachineLifecycle reset after interpreter exit restarts input and returns user-paused",
  () => {
    const runtime = new FakeRuntime();
    const exitState = new ExitState();
    const input = new FakeInput();
    const breakpoints = new AddressBreakpoints();
    const lifecycle = new WebMachineLifecycle(
      runtime,
      exitState,
      () => {
        exitState.reset();
      },
      [input],
      breakpoints,
    );

    runtime.onStep = () => {
      exitState.exit();
    };

    lifecycle.activate();
    lifecycle.step();
    lifecycle.reset();

    assertEquals(exitState.isExited, false);
    assertEquals(lifecycle.state, {
      kind: "paused",
      reason: { kind: "user" },
    });
    assertEquals(runtime.isPaused, true);
    assertEquals(input.started, true);
  },
);

Deno.test(
  "WebMachineLifecycle reset preserves configured breakpoints and clears transient execution state",
  () => {
    const runtime = new FakeRuntime();
    const exitState = new ExitState();
    const input = new FakeInput();
    const breakpoints = new AddressBreakpoints();
    const breakpointAddress = address(0x204);
    const lifecycle = new WebMachineLifecycle(
      runtime,
      exitState,
      () => {},
      [input],
      breakpoints,
    );

    breakpoints.add(breakpointAddress);

    runtime.onTick = () => {
      if (!breakpoints.shouldExecute(breakpointAddress)) {
        runtime.pause();
      }
    };

    lifecycle.activate();
    lifecycle.start();
    lifecycle.tick();
    lifecycle.start();
    lifecycle.reset();

    assertEquals(lifecycle.state, {
      kind: "paused",
      reason: { kind: "user" },
    });
    assertEquals(breakpoints.snapshot(), [{ address: breakpointAddress, enabled: true }]);
    assertEquals(breakpoints.shouldExecute(breakpointAddress), false);
  },
);

Deno.test(
  "WebMachineLifecycle deactivate pauses runtime, stops input, and clears transient breakpoint state",
  () => {
    const runtime = new FakeRuntime();
    const exitState = new ExitState();
    const input = new FakeInput();
    const breakpoints = new AddressBreakpoints();
    const breakpointAddress = address(0x204);
    const lifecycle = new WebMachineLifecycle(
      runtime,
      exitState,
      () => {},
      [input],
      breakpoints,
    );

    breakpoints.add(breakpointAddress);
    breakpoints.suppressWhileAt(breakpointAddress);

    lifecycle.activate();
    lifecycle.start();
    lifecycle.deactivate();

    assertEquals(lifecycle.state.kind, "inactive");
    assertEquals(runtime.isPaused, true);
    assertEquals(input.started, false);
    assertEquals(breakpoints.shouldExecute(breakpointAddress), false);
  },
);

class FakeRuntime {
  public isPaused = true;

  public onStep: () => void = () => {};
  public onTick: () => void = () => {};

  public pause(): void {
    this.isPaused = true;
  }

  public resume(): void {
    this.isPaused = false;
  }

  public step(): void {
    this.onStep();
  }

  public tick(): void {
    this.onTick();
  }
}

class FakeInput {
  public started = false;

  public start(): void {
    this.started = true;
  }

  public stop(): void {
    this.started = false;
  }
}

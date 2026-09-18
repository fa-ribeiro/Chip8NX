import { assertEquals, assertStrictEquals } from "@std/assert";
import { ExitState } from "@chip8nx/core";
import { WebMachineLifecycle } from "./web-machine-lifecycle.ts";

Deno.test("WebMachineLifecycle activates input and starts paused", () => {
  const runtime = new FakeRuntime();
  const exitState = new ExitState();
  const input = new FakeInput();
  const lifecycle = new WebMachineLifecycle(runtime, exitState, () => {}, [input]);

  lifecycle.activate();

  assertEquals(lifecycle.state.kind, "paused");
  assertEquals(runtime.isPaused, true);
  assertEquals(input.started, true);
});

Deno.test(
  "WebMachineLifecycle starts and pauses scheduled execution without stopping input",
  () => {
    const runtime = new FakeRuntime();
    const exitState = new ExitState();
    const input = new FakeInput();
    const lifecycle = new WebMachineLifecycle(runtime, exitState, () => {}, [input]);

    lifecycle.activate();
    const startState = lifecycle.start();

    assertEquals(startState.kind, "running");
    assertEquals(lifecycle.state.kind, "running");
    assertEquals(runtime.isPaused, false);
    assertEquals(input.started, true);

    lifecycle.pause();

    assertEquals(lifecycle.state.kind, "paused");
    assertEquals(runtime.isPaused, true);
    assertEquals(input.started, true);
  },
);

Deno.test(
  "WebMachineLifecycle enters exited state when a runtime tick exits the interpreter",
  () => {
    const runtime = new FakeRuntime();
    const exitState = new ExitState();
    const input = new FakeInput();
    const lifecycle = new WebMachineLifecycle(runtime, exitState, () => {}, [input]);

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
    const lifecycle = new WebMachineLifecycle(runtime, exitState, () => {}, [input]);

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
  const expectedError = new Error("tick failed");
  const lifecycle = new WebMachineLifecycle(runtime, exitState, () => {}, [input]);

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
  const expectedError = new Error("step failed");
  const lifecycle = new WebMachineLifecycle(runtime, exitState, () => {}, [input]);

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

Deno.test("WebMachineLifecycle reset after failure restarts input and returns paused", () => {
  const runtime = new FakeRuntime();
  const exitState = new ExitState();
  const input = new FakeInput();
  let resetCount = 0;
  const lifecycle = new WebMachineLifecycle(
    runtime,
    exitState,
    () => {
      resetCount++;
      exitState.reset();
    },
    [input],
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
  assertEquals(lifecycle.state.kind, "paused");
  assertEquals(runtime.isPaused, true);
  assertEquals(input.started, true);
});

Deno.test(
  "WebMachineLifecycle reset after interpreter exit restarts input and returns paused",
  () => {
    const runtime = new FakeRuntime();
    const exitState = new ExitState();
    const input = new FakeInput();
    const lifecycle = new WebMachineLifecycle(
      runtime,
      exitState,
      () => {
        exitState.reset();
      },
      [input],
    );

    runtime.onStep = () => {
      exitState.exit();
    };

    lifecycle.activate();
    lifecycle.step();
    lifecycle.reset();

    assertEquals(exitState.isExited, false);
    assertEquals(lifecycle.state.kind, "paused");
    assertEquals(runtime.isPaused, true);
    assertEquals(input.started, true);
  },
);

Deno.test("WebMachineLifecycle deactivate pauses runtime and stops input", () => {
  const runtime = new FakeRuntime();
  const exitState = new ExitState();
  const input = new FakeInput();
  const lifecycle = new WebMachineLifecycle(runtime, exitState, () => {}, [input]);

  lifecycle.activate();
  lifecycle.start();
  lifecycle.deactivate();

  assertEquals(lifecycle.state.kind, "inactive");
  assertEquals(runtime.isPaused, true);
  assertEquals(input.started, false);
});

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

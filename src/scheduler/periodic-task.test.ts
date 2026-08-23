import { assertEquals, assertThrows } from "@std/assert";

import { Frequency } from "../core/types/frequency.ts";
import { PeriodicTask } from "./periodic-task.ts";

Deno.test("does not execute before one period has elapsed", () => {
  let executions = 0;

  const task = new PeriodicTask(
    "test",
    Frequency.fromInteger(100n),
    () => {
      executions++;
    },
  );

  task.advance(5_000_000n); // 5 ms; period is 10 ms.

  assertEquals(executions, 0);
});

Deno.test("executes once when one period has elapsed", () => {
  let executions = 0;

  const task = new PeriodicTask(
    "test",
    Frequency.fromInteger(100n),
    () => {
      executions++;
    },
  );

  task.advance(10_000_000n);

  assertEquals(executions, 1);
});

Deno.test("executes multiple times when multiple periods elapsed", () => {
  let executions = 0;

  const task = new PeriodicTask(
    "test",
    Frequency.fromInteger(100n),
    () => {
      executions++;
    },
  );

  task.advance(50_000_000n);

  assertEquals(executions, 5);
});

Deno.test("preserves fractional elapsed time", () => {
  let executions = 0;

  const task = new PeriodicTask(
    "test",
    Frequency.fromInteger(100n),
    () => {
      executions++;
    },
  );

  task.advance(5_000_000n);

  assertEquals(executions, 0);

  task.advance(5_000_000n);

  assertEquals(executions, 1);
});

Deno.test("suspending a task prevents execution", () => {
  let executions = 0;

  const task = new PeriodicTask(
    "test",
    Frequency.fromInteger(100n),
    () => {
      executions++;
    },
  );

  task.suspend();

  task.advance(1_000_000_000n);

  assertEquals(executions, 0);
});

Deno.test("suspending discards accumulated time", () => {
  let executions = 0;

  const task = new PeriodicTask(
    "test",
    Frequency.fromInteger(100n),
    () => {
      executions++;
    },
  );

  // Accumulate half a period.
  task.advance(5_000_000n);

  task.suspend();
  task.resume();

  // Another half period should not cause an execution because the
  // accumulated time from before suspension was discarded.
  task.advance(5_000_000n);

  assertEquals(executions, 0);
});

Deno.test("resuming allows execution again", () => {
  let executions = 0;

  const task = new PeriodicTask(
    "test",
    Frequency.fromInteger(100n),
    () => {
      executions++;
    },
  );

  task.suspend();
  task.resume();

  task.advance(10_000_000n);

  assertEquals(executions, 1);
});

Deno.test("reports its suspension state", () => {
  const task = new PeriodicTask(
    "test",
    Frequency.fromInteger(100n),
    () => {},
  );

  assertEquals(task.isSuspended, false);

  task.suspend();

  assertEquals(task.isSuspended, true);

  task.resume();

  assertEquals(task.isSuspended, false);
});

Deno.test("returns the number of executions performed", () => {
  const task = new PeriodicTask(
    "test",
    Frequency.fromInteger(100n),
    () => {},
  );

  const executions = task.advance(50_000_000n);

  assertEquals(executions, 5);
});

Deno.test("propagates callback errors", () => {
  const task = new PeriodicTask(
    "test",
    Frequency.fromInteger(100n),
    () => {
      throw new Error("callback failure");
    },
  );

  assertThrows(
    () => task.advance(10_000_000n),
    Error,
    "callback failure",
  );
});

Deno.test("supports an exact fractional frequency", () => {
  let executions = 0;

  // 59.94 Hz = 2997 / 50.
  const task = new PeriodicTask(
    "test",
    new Frequency(2997n, 50n),
    () => {
      executions++;
    },
  );

  // One second should produce exactly 59 executions,
  // with the fractional remainder preserved.
  const executed = task.advance(1_000_000_000n);

  assertEquals(executed, 59);
  assertEquals(executions, 59);
});

Deno.test("preserves fractional frequency remainder", () => {
  let executions = 0;

  const task = new PeriodicTask(
    "test",
    new Frequency(2997n, 50n),
    () => {
      executions++;
    },
  );

  task.advance(1_000_000_000n);
  task.advance(1_000_000_000n);

  assertEquals(executions, 119);
});

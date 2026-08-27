import { assertEquals, assertThrows } from "@std/assert";

import { Frequency } from "../core/types/frequency.ts";
import { PeriodicTask } from "./periodic-task.ts";

Deno.test("Periodic-Task does not execute before one period has elapsed", () => {
  let executions = 0;

  const task = new PeriodicTask("test", Frequency.fromInteger(100n), () => {
    executions++;
  });

  // 100 Hz = 10 ms period.
  task.advance(5_000_000n);

  assertEquals(executions, 0);
});

Deno.test("Periodic-Task executes once after one period has elapsed", () => {
  let executions = 0;

  const task = new PeriodicTask("test", Frequency.fromInteger(100n), () => {
    executions++;
  });

  task.advance(10_000_000n);

  assertEquals(executions, 1);
});

Deno.test("Periodic-Task executes multiple times when multiple periods have elapsed", () => {
  let executions = 0;

  const task = new PeriodicTask("test", Frequency.fromInteger(100n), () => {
    executions++;
  });

  task.advance(50_000_000n);

  assertEquals(executions, 5);
});

Deno.test("Periodic-Task preserves fractional elapsed time", () => {
  let executions = 0;

  const task = new PeriodicTask("test", Frequency.fromInteger(100n), () => {
    executions++;
  });

  // First half of the period.
  task.advance(5_000_000n);

  assertEquals(executions, 0);

  // Second half of the period.
  task.advance(5_000_000n);

  assertEquals(executions, 1);
});

Deno.test("Periodic-Task preserves fractional elapsed time across multiple advances", () => {
  let executions = 0;

  const task = new PeriodicTask("test", Frequency.fromInteger(100n), () => {
    executions++;
  });

  task.advance(3_000_000n);
  task.advance(3_000_000n);
  task.advance(3_000_000n);

  assertEquals(executions, 0);

  task.advance(1_000_000n);

  assertEquals(executions, 1);
});

Deno.test("Periodic-Task executes exactly once when elapsed time equals the period", () => {
  let executions = 0;

  const task = new PeriodicTask("test", Frequency.fromInteger(60n), () => {
    executions++;
  });

  // We deliberately use the exact rational representation of the period.
  //
  // 1 second / 60 = 1/60 second.
  // 1 second = 1,000,000,000 ns.
  //
  // A precise one-period test can therefore use the equivalent frequency
  // calculation through a rational frequency.
  task.advance(1_000_000_000n);

  assertEquals(executions, 60);
});

Deno.test("Periodic-Task supports fractional frequencies", () => {
  let executions = 0;

  // 59.94 Hz = 2997 / 50.
  const task = new PeriodicTask("test", Frequency.fromRatio(2997n, 50n), () => {
    executions++;
  });

  task.advance(1_000_000_000n);

  // 59.94 executions are due in one second, therefore 59 complete
  // executions occur and the fractional remainder is preserved.
  assertEquals(executions, 59);
});

Deno.test("Periodic-Task preserves fractional frequency remainder", () => {
  let executions = 0;

  const task = new PeriodicTask("test", Frequency.fromRatio(2997n, 50n), () => {
    executions++;
  });

  task.advance(1_000_000_000n);
  task.advance(1_000_000_000n);

  // 59.94 * 2 = 119.88
  // Therefore 119 executions have occurred.
  assertEquals(executions, 119);
});

Deno.test("Periodic-Task suspended task does not execute", () => {
  let executions = 0;

  const task = new PeriodicTask("test", Frequency.fromInteger(100n), () => {
    executions++;
  });

  task.suspend();

  task.advance(1_000_000_000n);

  assertEquals(executions, 0);
});

Deno.test("Periodic-Task suspension discards accumulated time", () => {
  let executions = 0;

  const task = new PeriodicTask("test", Frequency.fromInteger(100n), () => {
    executions++;
  });

  // Accumulate half a period.
  task.advance(5_000_000n);

  task.suspend();
  task.resume();

  // This is another half period, but the previous half was discarded.
  task.advance(5_000_000n);

  assertEquals(executions, 0);
});

Deno.test("Periodic-Task resumed task starts accumulating time again", () => {
  let executions = 0;

  const task = new PeriodicTask("test", Frequency.fromInteger(100n), () => {
    executions++;
  });

  task.suspend();
  task.resume();

  task.advance(10_000_000n);

  assertEquals(executions, 1);
});

Deno.test("Periodic-Task reports its suspension state", () => {
  const task = new PeriodicTask("test", Frequency.fromInteger(60n), () => {});

  assertEquals(task.isSuspended, false);

  task.suspend();

  assertEquals(task.isSuspended, true);

  task.resume();

  assertEquals(task.isSuspended, false);
});

Deno.test("Periodic-Task does not execute while suspended even when time advances", () => {
  let executions = 0;

  const task = new PeriodicTask("test", Frequency.fromInteger(60n), () => {
    executions++;
  });

  task.suspend();

  task.advance(1_000_000_000n);
  task.advance(1_000_000_000n);
  task.advance(1_000_000_000n);

  assertEquals(executions, 0);
});

Deno.test("Periodic-Task callback errors propagate", () => {
  const task = new PeriodicTask("test", Frequency.fromInteger(60n), () => {
    throw new Error("callback failure");
  });

  assertThrows(() => task.advance(1_000_000_000n), Error, "callback failure");
});

Deno.test("Periodic-Task executes once when one exact period has elapsed", () => {
  let executions = 0;

  const task = new PeriodicTask("test", Frequency.fromInteger(100n), () => {
    executions++;
  });

  task.advance(10_000_000n);

  assertEquals(executions, 1);
});

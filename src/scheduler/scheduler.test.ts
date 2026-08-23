import { assertEquals, assertThrows } from "@std/assert";

import { Frequency } from "../core/types/frequency.ts";
import { Duration, duration } from "../core/types/duration.ts";
import { TestClock } from "../clock/test-clock.ts";

import { Scheduler } from "./scheduler.ts";

Deno.test("Scheduler executes a task once when one period has elapsed", () => {
  const clock = new TestClock();
  const scheduler = new Scheduler(clock);

  let executions = 0;

  scheduler.addPeriodicTask(
    "test",
    Frequency.fromInteger(100n),
    () => {
      executions++;
    },
  );

  clock.advance(duration(10_000_000n as Duration));

  scheduler.tick();

  assertEquals(executions, 1);
});

Deno.test("Scheduler does not execute a task before its period", () => {
  const clock = new TestClock();
  const scheduler = new Scheduler(clock);

  let executions = 0;

  scheduler.addPeriodicTask(
    "test",
    Frequency.fromInteger(100n),
    () => {
      executions++;
    },
  );

  clock.advance(duration(5_000_000n as Duration));

  scheduler.tick();

  assertEquals(executions, 0);
});

Deno.test("Scheduler preserves fractional elapsed time", () => {
  const clock = new TestClock();
  const scheduler = new Scheduler(clock);

  let executions = 0;

  scheduler.addPeriodicTask(
    "test",
    Frequency.fromInteger(100n),
    () => {
      executions++;
    },
  );

  // Half a period.
  clock.advance(duration(5_000_000n as Duration));
  scheduler.tick();

  assertEquals(executions, 0);

  // Second half of the period.
  clock.advance(duration(5_000_000n as Duration));
  scheduler.tick();

  assertEquals(executions, 1);
});

Deno.test("Scheduler executes multiple times when multiple periods elapsed", () => {
  const clock = new TestClock();
  const scheduler = new Scheduler(clock);

  let executions = 0;

  scheduler.addPeriodicTask(
    "test",
    Frequency.fromInteger(100n),
    () => {
      executions++;
    },
  );

  clock.advance(duration(50_000_000n as Duration));
  scheduler.tick();

  assertEquals(executions, 5);
});

Deno.test("Scheduler supports multiple tasks with different frequencies", () => {
  const clock = new TestClock();
  const scheduler = new Scheduler(clock);

  let fastExecutions = 0;
  let slowExecutions = 0;

  scheduler.addPeriodicTask(
    "fast",
    Frequency.fromInteger(100n),
    () => {
      fastExecutions++;
    },
  );

  scheduler.addPeriodicTask(
    "slow",
    Frequency.fromInteger(20n),
    () => {
      slowExecutions++;
    },
  );

  clock.advance(duration(100_000_000n as Duration));
  scheduler.tick();

  assertEquals(fastExecutions, 10);
  assertEquals(slowExecutions, 2);
});

Deno.test("Scheduler executes tasks in registration order", () => {
  const clock = new TestClock();
  const scheduler = new Scheduler(clock);

  const executionOrder: string[] = [];

  scheduler.addPeriodicTask(
    "first",
    Frequency.fromInteger(1n),
    () => {
      executionOrder.push("first");
    },
  );

  scheduler.addPeriodicTask(
    "second",
    Frequency.fromInteger(1n),
    () => {
      executionOrder.push("second");
    },
  );

  clock.advance(duration(1_000_000_000n as Duration));
  scheduler.tick();

  assertEquals(executionOrder, ["first", "second"]);
});

Deno.test("Scheduler rejects duplicate task IDs", () => {
  const clock = new TestClock();
  const scheduler = new Scheduler(clock);

  scheduler.addPeriodicTask(
    "test",
    Frequency.fromInteger(60n),
    () => {},
  );

  assertThrows(() => {
    scheduler.addPeriodicTask(
      "test",
      Frequency.fromInteger(60n),
      () => {},
    );
  });
});

Deno.test("Scheduler removing an existing task returns true", () => {
  const clock = new TestClock();
  const scheduler = new Scheduler(clock);

  scheduler.addPeriodicTask(
    "test",
    Frequency.fromInteger(60n),
    () => {},
  );

  assertEquals(
    scheduler.removePeriodicTask("test"),
    true,
  );
});

Deno.test("Scheduler removing a missing task returns false", () => {
  const clock = new TestClock();
  const scheduler = new Scheduler(clock);

  assertEquals(
    scheduler.removePeriodicTask("missing"),
    false,
  );
});

Deno.test("Scheduler suspended tasks do not execute", () => {
  const clock = new TestClock();
  const scheduler = new Scheduler(clock);

  let executions = 0;

  scheduler.addPeriodicTask(
    "test",
    Frequency.fromInteger(60n),
    () => {
      executions++;
    },
  );

  scheduler.suspendTask("test");

  clock.advance(duration(1_000_000_000n as Duration));
  scheduler.tick();

  assertEquals(executions, 0);
});

Deno.test("Scheduler suspended time is discarded when task resumes", () => {
  const clock = new TestClock();
  const scheduler = new Scheduler(clock);

  let executions = 0;

  scheduler.addPeriodicTask(
    "test",
    Frequency.fromInteger(10n),
    () => {
      executions++;
    },
  );

  scheduler.suspendTask("test");

  clock.advance(duration(1_000_000_000n as Duration));
  scheduler.tick();

  scheduler.resumeTask("test");

  scheduler.tick();

  assertEquals(executions, 0);
});

Deno.test("Scheduler callback errors propagate to the caller", () => {
  const clock = new TestClock();
  const scheduler = new Scheduler(clock);

  scheduler.addPeriodicTask(
    "failing",
    Frequency.fromInteger(1n),
    () => {
      throw new Error("failure");
    },
  );

  clock.advance(duration(1_000_000_000n as Duration));

  assertThrows(
    () => scheduler.tick(),
    Error,
    "failure",
  );
});

Deno.test("Scheduler suspend and resume on a missing task throw", () => {
  const clock = new TestClock();
  const scheduler = new Scheduler(clock);

  assertThrows(() => {
    scheduler.suspendTask("missing");
  });

  assertThrows(() => {
    scheduler.resumeTask("missing");
  });
});

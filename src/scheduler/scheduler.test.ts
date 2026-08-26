import { assertEquals, assertThrows } from "@std/assert";

import { TestClock } from "../clock/test-clock.ts";
import { type Duration, duration } from "../core/types/duration.ts";
import { Frequency } from "../core/types/frequency.ts";
import { Scheduler } from "./scheduler.ts";

Deno.test("does not execute tasks before they are due", () => {
  const clock = new TestClock();
  const scheduler = new Scheduler(clock);

  let executions = 0;

  scheduler.addTask(
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

Deno.test("executes a task when it becomes due", () => {
  const clock = new TestClock();
  const scheduler = new Scheduler(clock);

  let executions = 0;

  scheduler.addTask(
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

Deno.test("passes elapsed time to tasks through the scheduler clock", () => {
  const clock = new TestClock();
  const scheduler = new Scheduler(clock);

  let executions = 0;

  scheduler.addTask(
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

Deno.test("supports multiple tasks with different frequencies", () => {
  const clock = new TestClock();
  const scheduler = new Scheduler(clock);

  let fastExecutions = 0;
  let slowExecutions = 0;

  scheduler.addTask(
    "fast",
    Frequency.fromInteger(100n),
    () => {
      fastExecutions++;
    },
  );

  scheduler.addTask(
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

Deno.test("executes tasks in registration order", () => {
  const clock = new TestClock();
  const scheduler = new Scheduler(clock);

  const executionOrder: string[] = [];

  scheduler.addTask(
    "first",
    Frequency.fromInteger(1n),
    () => {
      executionOrder.push("first");
    },
  );

  scheduler.addTask(
    "second",
    Frequency.fromInteger(1n),
    () => {
      executionOrder.push("second");
    },
  );

  clock.advance(duration(1_000_000_000n as Duration));
  scheduler.tick();

  assertEquals(
    executionOrder,
    ["first", "second"],
  );
});

Deno.test("rejects duplicate task IDs", () => {
  const clock = new TestClock();
  const scheduler = new Scheduler(clock);

  scheduler.addTask(
    "test",
    Frequency.fromInteger(60n),
    () => {},
  );

  assertThrows(
    () => {
      scheduler.addTask(
        "test",
        Frequency.fromInteger(60n),
        () => {},
      );
    },
    Error,
    "Task already exists: test",
  );
});

Deno.test("removes an existing task", () => {
  const clock = new TestClock();
  const scheduler = new Scheduler(clock);

  let executions = 0;

  scheduler.addTask(
    "test",
    Frequency.fromInteger(60n),
    () => {
      executions++;
    },
  );

  assertEquals(
    scheduler.removeTask("test"),
    true,
  );

  clock.advance(duration(1_000_000_000n as Duration));
  scheduler.tick();

  assertEquals(executions, 0);
});

Deno.test("removing a missing task returns false", () => {
  const clock = new TestClock();
  const scheduler = new Scheduler(clock);

  assertEquals(
    scheduler.removeTask("missing"),
    false,
  );
});

Deno.test("suspends an individual task", () => {
  const clock = new TestClock();
  const scheduler = new Scheduler(clock);

  let cpuExecutions = 0;
  let renderExecutions = 0;

  scheduler.addTask(
    "cpu",
    Frequency.fromInteger(100n),
    () => {
      cpuExecutions++;
    },
  );

  scheduler.addTask(
    "render",
    Frequency.fromInteger(100n),
    () => {
      renderExecutions++;
    },
  );

  scheduler.suspendTask("cpu");

  clock.advance(duration(10_000_000n as Duration));
  scheduler.tick();

  assertEquals(cpuExecutions, 0);
  assertEquals(renderExecutions, 1);
});

Deno.test("resumes an individual task", () => {
  const clock = new TestClock();
  const scheduler = new Scheduler(clock);

  let executions = 0;

  scheduler.addTask(
    "cpu",
    Frequency.fromInteger(100n),
    () => {
      executions++;
    },
  );

  scheduler.suspendTask("cpu");

  clock.advance(duration(1_000_000_000n as Duration));
  scheduler.tick();

  scheduler.resumeTask("cpu");

  clock.advance(duration(10_000_000n as Duration));
  scheduler.tick();

  assertEquals(executions, 1);
});

Deno.test("suspended tasks do not accumulate execution debt", () => {
  const clock = new TestClock();
  const scheduler = new Scheduler(clock);

  let executions = 0;

  scheduler.addTask(
    "cpu",
    Frequency.fromInteger(500n),
    () => {
      executions++;
    },
  );

  scheduler.suspendTask("cpu");

  // Five seconds would represent 2,500 CPU executions.
  clock.advance(duration(5_000_000_000n as Duration));
  scheduler.tick();

  scheduler.resumeTask("cpu");

  // Resuming must not immediately execute the accumulated 2,500 steps.
  scheduler.tick();

  assertEquals(executions, 0);
});

Deno.test("throws when suspending an unknown task", () => {
  const clock = new TestClock();
  const scheduler = new Scheduler(clock);

  assertThrows(
    () => scheduler.suspendTask("missing"),
    Error,
    "Unknown task: missing",
  );
});

Deno.test("throws when resuming an unknown task", () => {
  const clock = new TestClock();
  const scheduler = new Scheduler(clock);

  assertThrows(
    () => scheduler.resumeTask("missing"),
    Error,
    "Unknown task: missing",
  );
});

Deno.test("propagates callback errors", () => {
  const clock = new TestClock();
  const scheduler = new Scheduler(clock);

  scheduler.addTask(
    "failing",
    Frequency.fromInteger(1n),
    () => {
      throw new Error("callback failure");
    },
  );

  clock.advance(duration(1_000_000_000n as Duration));

  assertThrows(
    () => scheduler.tick(),
    Error,
    "callback failure",
  );
});

Deno.test("does not execute later tasks after an earlier task fails", () => {
  const clock = new TestClock();
  const scheduler = new Scheduler(clock);

  let secondExecuted = false;

  scheduler.addTask(
    "failing",
    Frequency.fromInteger(1n),
    () => {
      throw new Error("failure");
    },
  );

  scheduler.addTask(
    "second",
    Frequency.fromInteger(1n),
    () => {
      secondExecuted = true;
    },
  );

  clock.advance(duration(1_000_000_000n as Duration));

  assertThrows(
    () => scheduler.tick(),
    Error,
    "failure",
  );

  assertEquals(secondExecuted, false);
});

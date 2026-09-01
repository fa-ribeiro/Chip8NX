import { assertEquals, assertThrows } from "@std/assert";

import { TestClock } from "../clock/test-clock.ts";
import { type Duration, duration } from "../core/types/duration.ts";
import { Frequency } from "../core/types/frequency.ts";
import { Scheduler } from "./scheduler.ts";

function advanceClock(clock: TestClock, nanoseconds: bigint): void {
  clock.advance(duration(nanoseconds as Duration));
}

Deno.test("Scheduler does not execute a task before its deadline", () => {
  const clock = new TestClock();
  const scheduler = new Scheduler(clock);

  let executions = 0;

  scheduler.addTask("test", Frequency.fromInteger(100n), () => {
    executions++;
  });

  advanceClock(clock, 5_000_000n);

  scheduler.tick();

  assertEquals(executions, 0);
});

Deno.test("Scheduler executes a task when its deadline is reached", () => {
  const clock = new TestClock();
  const scheduler = new Scheduler(clock);

  let executions = 0;

  scheduler.addTask("test", Frequency.fromInteger(100n), () => {
    executions++;
  });

  advanceClock(clock, 10_000_000n);

  scheduler.tick();

  assertEquals(executions, 1);
});

Deno.test(
  "Scheduler catches up every occurrence due by the current time",
  () => {
    const clock = new TestClock();
    const scheduler = new Scheduler(clock);

    let executions = 0;

    scheduler.addTask("test", Frequency.fromInteger(100n), () => {
      executions++;
    });

    advanceClock(clock, 50_000_000n);

    scheduler.tick();

    assertEquals(executions, 5);
  },
);

Deno.test("Scheduler schedules a task from its registration time", () => {
  const clock = new TestClock();
  const scheduler = new Scheduler(clock);

  advanceClock(clock, 1_000_000_000n);

  let executions = 0;

  scheduler.addTask("test", Frequency.fromInteger(100n), () => {
    executions++;
  });

  scheduler.tick();

  assertEquals(executions, 0);

  advanceClock(clock, 10_000_000n);

  scheduler.tick();

  assertEquals(executions, 1);
});

Deno.test("Scheduler supports exact fractional frequencies", () => {
  const clock = new TestClock();
  const scheduler = new Scheduler(clock);

  let executions = 0;

  scheduler.addTask("test", Frequency.fromRatio(2997n, 50n), () => {
    executions++;
  });

  advanceClock(clock, 1_000_000_000n);

  scheduler.tick();

  assertEquals(executions, 59);

  advanceClock(clock, 1_000_000_000n);

  scheduler.tick();

  assertEquals(executions, 119);
});

Deno.test("Scheduler does not round fractional deadlines down", () => {
  const clock = new TestClock();
  const scheduler = new Scheduler(clock);

  let executions = 0;

  scheduler.addTask("timer", Frequency.fromInteger(60n), () => {
    executions++;
  });

  advanceClock(clock, 16_666_666n);

  scheduler.tick();

  assertEquals(executions, 0);

  advanceClock(clock, 1n);

  scheduler.tick();

  assertEquals(executions, 1);
});

Deno.test("Scheduler preserves exact frequency over one second", () => {
  const clock = new TestClock();
  const scheduler = new Scheduler(clock);

  let executions = 0;

  scheduler.addTask("timer", Frequency.fromInteger(60n), () => {
    executions++;
  });

  advanceClock(clock, 1_000_000_000n);

  scheduler.tick();

  assertEquals(executions, 60);
});

Deno.test(
  "Scheduler executes different-frequency tasks in chronological order",
  () => {
    const clock = new TestClock();
    const scheduler = new Scheduler(clock);

    const executionOrder: string[] = [];

    scheduler.addTask("fast", Frequency.fromInteger(4n), () => {
      executionOrder.push("fast");
    });

    scheduler.addTask("slow", Frequency.fromInteger(2n), () => {
      executionOrder.push("slow");
    });

    advanceClock(clock, 1_000_000_000n);

    scheduler.tick();

    assertEquals(executionOrder, [
      "fast", // 250 ms
      "fast", // 500 ms
      "slow", // 500 ms
      "fast", // 750 ms
      "fast", // 1000 ms
      "slow", // 1000 ms
    ]);
  },
);

Deno.test(
  "Scheduler chronologically interleaves 500 Hz and 60 Hz tasks",
  () => {
    const clock = new TestClock();
    const scheduler = new Scheduler(clock);

    const executionOrder: string[] = [];

    scheduler.addTask("cpu", Frequency.fromInteger(500n), () => {
      executionOrder.push("cpu");
    });

    scheduler.addTask("timer", Frequency.fromInteger(60n), () => {
      executionOrder.push("timer");
    });

    advanceClock(clock, 20_000_000n);

    scheduler.tick();

    assertEquals(executionOrder, [
      "cpu", // 2 ms
      "cpu", // 4 ms
      "cpu", // 6 ms
      "cpu", // 8 ms
      "cpu", // 10 ms
      "cpu", // 12 ms
      "cpu", // 14 ms
      "cpu", // 16 ms
      "timer", // 16.666... ms
      "cpu", // 18 ms
      "cpu", // 20 ms
    ]);
  },
);

Deno.test("Scheduler executes equal deadlines in registration order", () => {
  const clock = new TestClock();
  const scheduler = new Scheduler(clock);

  const executionOrder: string[] = [];

  scheduler.addTask("first", Frequency.fromInteger(1n), () => {
    executionOrder.push("first");
  });

  scheduler.addTask("second", Frequency.fromInteger(1n), () => {
    executionOrder.push("second");
  });

  advanceClock(clock, 1_000_000_000n);

  scheduler.tick();

  assertEquals(executionOrder, ["first", "second"]);
});

Deno.test("Scheduler rejects duplicate task IDs", () => {
  const clock = new TestClock();
  const scheduler = new Scheduler(clock);

  scheduler.addTask("test", Frequency.fromInteger(60n), () => {});

  assertThrows(
    () => {
      scheduler.addTask("test", Frequency.fromInteger(60n), () => {});
    },
    Error,
    "Task already exists: test",
  );
});

Deno.test("Scheduler removes an existing task", () => {
  const clock = new TestClock();
  const scheduler = new Scheduler(clock);

  let executions = 0;

  scheduler.addTask("test", Frequency.fromInteger(60n), () => {
    executions++;
  });

  assertEquals(scheduler.removeTask("test"), true);

  advanceClock(clock, 1_000_000_000n);

  scheduler.tick();

  assertEquals(executions, 0);
});

Deno.test("Scheduler removing a missing task returns false", () => {
  const clock = new TestClock();
  const scheduler = new Scheduler(clock);

  assertEquals(scheduler.removeTask("missing"), false);
});

Deno.test("Scheduler suspends one task without affecting others", () => {
  const clock = new TestClock();
  const scheduler = new Scheduler(clock);

  let cpuExecutions = 0;
  let timerExecutions = 0;

  scheduler.addTask("cpu", Frequency.fromInteger(100n), () => {
    cpuExecutions++;
  });

  scheduler.addTask("timer", Frequency.fromInteger(100n), () => {
    timerExecutions++;
  });

  scheduler.suspendTask("cpu");

  advanceClock(clock, 10_000_000n);

  scheduler.tick();

  assertEquals(cpuExecutions, 0);
  assertEquals(timerExecutions, 1);
});

Deno.test(
  "Scheduler resume schedules a new full period from the resume time",
  () => {
    const clock = new TestClock();
    const scheduler = new Scheduler(clock);

    let executions = 0;

    scheduler.addTask("cpu", Frequency.fromInteger(100n), () => {
      executions++;
    });

    advanceClock(clock, 5_000_000n);

    scheduler.suspendTask("cpu");

    advanceClock(clock, 1_000_000_000n);

    scheduler.resumeTask("cpu");

    advanceClock(clock, 5_000_000n);

    scheduler.tick();

    assertEquals(executions, 0);

    advanceClock(clock, 5_000_000n);

    scheduler.tick();

    assertEquals(executions, 1);
  },
);

Deno.test(
  "Scheduler suspended tasks accumulate no execution debt without intermediate ticks",
  () => {
    const clock = new TestClock();
    const scheduler = new Scheduler(clock);

    let executions = 0;

    scheduler.addTask("cpu", Frequency.fromInteger(500n), () => {
      executions++;
    });

    scheduler.suspendTask("cpu");

    // No scheduler tick occurs during these five seconds.
    advanceClock(clock, 5_000_000_000n);

    scheduler.resumeTask("cpu");

    scheduler.tick();

    assertEquals(executions, 0);

    advanceClock(clock, 2_000_000n);

    scheduler.tick();

    assertEquals(executions, 1);
  },
);

Deno.test("Scheduler resuming an active task has no effect", () => {
  const clock = new TestClock();
  const scheduler = new Scheduler(clock);

  let executions = 0;

  scheduler.addTask("cpu", Frequency.fromInteger(100n), () => {
    executions++;
  });

  advanceClock(clock, 5_000_000n);

  scheduler.resumeTask("cpu");

  advanceClock(clock, 5_000_000n);

  scheduler.tick();

  assertEquals(executions, 1);
});

Deno.test("Scheduler throws when suspending an unknown task", () => {
  const clock = new TestClock();
  const scheduler = new Scheduler(clock);

  assertThrows(
    () => scheduler.suspendTask("missing"),
    Error,
    "Unknown task: missing",
  );
});

Deno.test("Scheduler throws when resuming an unknown task", () => {
  const clock = new TestClock();
  const scheduler = new Scheduler(clock);

  assertThrows(
    () => scheduler.resumeTask("missing"),
    Error,
    "Unknown task: missing",
  );
});

Deno.test("Scheduler propagates callback errors", () => {
  const clock = new TestClock();
  const scheduler = new Scheduler(clock);

  scheduler.addTask("failing", Frequency.fromInteger(1n), () => {
    throw new Error("callback failure");
  });

  advanceClock(clock, 1_000_000_000n);

  assertThrows(() => scheduler.tick(), Error, "callback failure");
});

Deno.test(
  "Scheduler does not execute later equal-deadline tasks after a callback fails",
  () => {
    const clock = new TestClock();
    const scheduler = new Scheduler(clock);

    let secondExecuted = false;

    scheduler.addTask("failing", Frequency.fromInteger(1n), () => {
      throw new Error("failure");
    });

    scheduler.addTask("second", Frequency.fromInteger(1n), () => {
      secondExecuted = true;
    });

    advanceClock(clock, 1_000_000_000n);

    assertThrows(() => scheduler.tick(), Error, "failure");

    assertEquals(secondExecuted, false);
  },
);

Deno.test(
  "Scheduler consumes a scheduled occurrence before invoking its callback",
  () => {
    const clock = new TestClock();
    const scheduler = new Scheduler(clock);

    let failingExecutions = 0;
    let secondExecutions = 0;

    scheduler.addTask("failing", Frequency.fromInteger(1n), () => {
      failingExecutions++;

      if (failingExecutions === 1) {
        throw new Error("failure");
      }
    });

    scheduler.addTask("second", Frequency.fromInteger(1n), () => {
      secondExecutions++;
    });

    advanceClock(clock, 1_000_000_000n);

    assertThrows(() => scheduler.tick(), Error, "failure");

    /*
     * The failed occurrence was already consumed. At the same clock time the
     * second task remains due, but the failing task is now scheduled for the
     * next second.
     */
    scheduler.tick();

    assertEquals(failingExecutions, 1);
    assertEquals(secondExecutions, 1);
  },
);

import { assertEquals, assertRejects } from "@std/assert";
import { byte } from "@chip8nx/core";

import { WebRomLoader, type WebRomSource } from "./web-rom-loader.ts";

Deno.test(
  "WebRomLoader ignores an older load that completes after a newer request",
  async () => {
    const loader = new WebRomLoader();
    const first = deferred<ArrayBuffer>();
    const second = deferred<ArrayBuffer>();

    const firstLoad = loader.load(sourceFrom(first.promise));
    const secondLoad = loader.load(sourceFrom(second.promise));

    second.resolve(arrayBufferOf(0x22));

    const secondProgram = await secondLoad;

    assertEquals(secondProgram?.bytes, [byte(0x22)]);

    first.resolve(arrayBufferOf(0x11));

    assertEquals(await firstLoad, undefined);
  },
);

Deno.test(
  "WebRomLoader ignores an older load failure after a newer request starts",
  async () => {
    const loader = new WebRomLoader();
    const first = deferred<ArrayBuffer>();
    const second = deferred<ArrayBuffer>();

    const firstLoad = loader.load(sourceFrom(first.promise));
    const secondLoad = loader.load(sourceFrom(second.promise));

    second.resolve(arrayBufferOf(0x22));

    const secondProgram = await secondLoad;

    assertEquals(secondProgram?.bytes, [byte(0x22)]);

    first.reject(new Error("stale read failed"));

    assertEquals(await firstLoad, undefined);
  },
);

Deno.test("WebRomLoader propagates a failure from the current load request", async () => {
  const loader = new WebRomLoader();

  await assertRejects(
    () => loader.load(sourceFrom(Promise.reject(new Error("current read failed")))),
    Error,
    "current read failed",
  );
});

function sourceFrom(buffer: Promise<ArrayBuffer>): WebRomSource {
  return {
    arrayBuffer: () => buffer,
  };
}

function arrayBufferOf(...values: number[]): ArrayBuffer {
  const buffer = new ArrayBuffer(values.length);

  new Uint8Array(buffer).set(values);

  return buffer;
}

interface Deferred<T> {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
  readonly reject: (reason?: unknown) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve: ((value: T) => void) | undefined;
  let reject: ((reason?: unknown) => void) | undefined;

  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  if (resolve === undefined || reject === undefined) {
    throw new Error("Deferred promise callbacks were not initialized");
  }

  return { promise, resolve, reject };
}

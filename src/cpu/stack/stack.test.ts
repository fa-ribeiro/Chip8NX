import { assertEquals, assertThrows } from "@std/assert";

import { address } from "../../core/types/address.ts";
import { Stack } from "./stack.ts";

Deno.test("Stack new stack is empty", () => {
  const stack = new Stack();

  assertEquals(stack.isEmpty(), true);
  assertEquals(stack.isFull(), false);
  assertEquals(stack.getSize(), 0);
});

Deno.test("Stack default capacity is 16", () => {
  const stack = new Stack();

  assertEquals(stack.getCapacity(), 16);
});

Deno.test("Stack custom capacity can be specified", () => {
  const stack = new Stack(4);

  assertEquals(stack.getCapacity(), 4);
});

Deno.test("Stack push adds an address", () => {
  const stack = new Stack();
  const value = address(0x234);

  stack.push(value);

  assertEquals(stack.getSize(), 1);
  assertEquals(stack.peek(), value);
});

Deno.test("Stack pop returns the most recently pushed address", () => {
  const stack = new Stack();

  const first = address(0x200);
  const second = address(0x300);

  stack.push(first);
  stack.push(second);

  assertEquals(stack.pop(), second);
  assertEquals(stack.pop(), first);
});

Deno.test("Stack follows LIFO order", () => {
  const stack = new Stack();

  const first = address(0x100);
  const second = address(0x200);
  const third = address(0x300);

  stack.push(first);
  stack.push(second);
  stack.push(third);

  assertEquals(stack.pop(), third);
  assertEquals(stack.pop(), second);
  assertEquals(stack.pop(), first);
});

Deno.test("Stack peek does not remove the top address", () => {
  const stack = new Stack();
  const value = address(0x234);

  stack.push(value);

  assertEquals(stack.peek(), value);
  assertEquals(stack.getSize(), 1);
});

Deno.test("Stack pop removes the top address", () => {
  const stack = new Stack();
  const value = address(0x234);

  stack.push(value);
  stack.pop();

  assertEquals(stack.isEmpty(), true);
  assertEquals(stack.getSize(), 0);
});

Deno.test("Stack cannot pop an empty stack", () => {
  const stack = new Stack();

  assertThrows(() => stack.pop(), RangeError);
});

Deno.test("Stack cannot peek at an empty stack", () => {
  const stack = new Stack();

  assertThrows(() => stack.peek(), RangeError);
});

Deno.test("Stack cannot push beyond capacity", () => {
  const stack = new Stack(2);

  stack.push(address(0x100));
  stack.push(address(0x200));

  assertThrows(() => stack.push(address(0x300)), RangeError);
});

Deno.test("Stack is full at capacity", () => {
  const stack = new Stack(2);

  stack.push(address(0x100));
  stack.push(address(0x200));

  assertEquals(stack.isFull(), true);
  assertEquals(stack.getSize(), 2);
});

Deno.test("Stack can be reused after pop", () => {
  const stack = new Stack(1);

  stack.push(address(0x100));
  stack.pop();

  stack.push(address(0x200));

  assertEquals(stack.peek(), address(0x200));
});

Deno.test("Stack invalid capacity is rejected", () => {
  assertThrows(() => new Stack(0), RangeError);

  assertThrows(() => new Stack(-1), RangeError);

  assertThrows(() => new Stack(1.5), RangeError);
});

Deno.test("Stack snapshot is independent from live stack", () => {
  const stack = new Stack();

  stack.push(address(0x200));
  stack.push(address(0x300));

  const snapshot = stack.snapshot();

  stack.pop();

  assertEquals(snapshot, [address(0x200), address(0x300)]);
  assertEquals(stack.getSize(), 1);
});

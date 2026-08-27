import { assertEquals } from "@std/assert";

import { address } from "../../core/types/address.ts";
import { IndexRegister } from "./index-register.ts";

Deno.test("IndexRegister initializes to address 0 by default", () => {
  const register = new IndexRegister();

  assertEquals(register.getValue(), address(0x000));
});

Deno.test("IndexRegister initializes with the provided address", () => {
  const initialValue = address(0xabc);
  const register = new IndexRegister(initialValue);

  assertEquals(register.getValue(), initialValue);
});

Deno.test("setValue changes the register value", () => {
  const register = new IndexRegister();
  const value = address(0x456);

  register.setValue(value);

  assertEquals(register.getValue(), value);
});

Deno.test("setValue can replace the current value", () => {
  const register = new IndexRegister(address(0x123));

  register.setValue(address(0x789));

  assertEquals(register.getValue(), address(0x789));
});

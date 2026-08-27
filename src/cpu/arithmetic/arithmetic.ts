import { type Byte, byte } from "../../core/types/byte.ts";

export interface ArithmeticResult {
  readonly value: Byte;
  readonly flag: boolean;
}

export function add8(a: Byte, b: Byte): ArithmeticResult {
  const result = a + b;

  return {
    value: byte(result & 0xff),
    flag: result > 0xff,
  };
}

export function subtract8(a: Byte, b: Byte): ArithmeticResult {
  return {
    value: byte((a - b) & 0xff),
    flag: a >= b,
  };
}

export function shiftRight8(value: Byte): ArithmeticResult {
  return {
    value: byte(value >> 1),
    flag: (value & 0x01) !== 0,
  };
}

export function shiftLeft8(value: Byte): ArithmeticResult {
  return {
    value: byte((value << 1) & 0xff),
    flag: (value & 0x80) !== 0,
  };
}

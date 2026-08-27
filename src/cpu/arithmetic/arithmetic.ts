import { type Byte, byte } from "../../core/types/byte.ts";

/**
 * Result of an 8-bit arithmetic or shift operation.
 *
 * The flag is deliberately represented as a boolean here. The CHIP-8
 * execution layer decides whether and where that flag is stored (normally
 * in VF).
 */
export interface ArithmeticResult {
  readonly value: Byte;
  readonly flag: boolean;
}

/**
 * Adds two bytes using CHIP-8 8-bit arithmetic.
 *
 * The result wraps at 0xFF. The flag is true when the mathematical sum
 * requires more than eight bits.
 */
export function add8(a: Byte, b: Byte): ArithmeticResult {
  const result = a + b;

  return {
    value: byte(result & 0xFF),
    flag: result > 0xFF,
  };
}

/**
 * Subtracts one byte from another using CHIP-8 8-bit arithmetic.
 *
 * The result wraps at zero. The flag is true when no borrow is required.
 */
export function subtract8(a: Byte, b: Byte): ArithmeticResult {
  return {
    value: byte((a - b) & 0xFF),
    flag: a >= b,
  };
}

/**
 * Shifts an 8-bit value right by one bit.
 *
 * The flag contains the least-significant bit of the original value.
 */
export function shiftRight8(value: Byte): ArithmeticResult {
  return {
    value: byte(value >> 1),
    flag: (value & 0x01) !== 0,
  };
}

/**
 * Shifts an 8-bit value left by one bit.
 *
 * The result is truncated to eight bits. The flag contains the
 * most-significant bit of the original value.
 */
export function shiftLeft8(value: Byte): ArithmeticResult {
  return {
    value: byte((value << 1) & 0xFF),
    flag: (value & 0x80) !== 0,
  };
}

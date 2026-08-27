import type { Address } from "../core/types/address.ts";
import { address } from "../core/types/address.ts";
import type { Byte } from "../core/types/byte.ts";
import { byte } from "../core/types/byte.ts";
import type { RegisterIndex } from "../cpu/registers/register-index.ts";
import { registerIndex } from "../cpu/registers/register-index.ts";
import type { Opcode } from "../core/types/opcode.ts";

/**
 * Extracts specific fields from a 16-bit opcode.
 *
 * The opcode is structured as follows:
 *
 * 15             12 11              8 7               4 3               0
 * ┌────────────────┬─────────────────┬─────────────────┬─────────────────┐
 * │       N0       │        X        │        Y        │        N        │
 * └────────────────┴─────────────────┴─────────────────┴─────────────────┘
 *                                    │<--------------- NN -------------->│
 *                  │<----------------------- NNN ----------------------->│
 *
 * The fields are defined as follows:
 * N0   → bits 15..12
 * X    → bits 11..8
 * Y    → bits 7..4
 * N    → bits 3..0
 * NN   → bits 7..0
 * NNN  → bits 11..0
 */

/**
 * Extracts the highest nibble from an opcode.
 *
 * N0 occupies bits 15..12.
 */
export function getN0(opcode: Opcode): number {
  return (opcode >> 12) & 0x0f;
}

/**
 * Extracts the X register index from an opcode.
 *
 * X occupies bits 11..8.
 */
export function getX(opcode: Opcode): RegisterIndex {
  return registerIndex((opcode >> 8) & 0x0f);
}

/**
 * Extracts the Y register index from an opcode.
 *
 * Y occupies bits 7..4.
 */
export function getY(opcode: Opcode): RegisterIndex {
  return registerIndex((opcode >> 4) & 0x0f);
}

/**
 * Extracts the lowest nibble from an opcode.
 *
 * N occupies bits 3..0.
 */
export function getN(opcode: Opcode): number {
  return opcode & 0x0f;
}

/**
 * Extracts the lowest byte from an opcode.
 *
 * NN occupies bits 7..0.
 */
export function getNN(opcode: Opcode): Byte {
  return byte(opcode & 0x00ff);
}

/**
 * Extracts the lowest 12 bits from an opcode.
 *
 * NNN occupies bits 11..0 and represents a memory address.
 */
export function getNNN(opcode: Opcode): Address {
  return address(opcode & 0x0fff);
}

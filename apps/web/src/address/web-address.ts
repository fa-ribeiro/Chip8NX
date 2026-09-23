import { type Address, address } from "@chip8nx/core";

export type WebAddressParseResult =
  | {
    readonly outcome: "success";
    readonly address: Address;
  }
  | {
    readonly outcome: "failure";
    readonly message: string;
  };

/**
 * Parses one hexadecimal address for Web debugger and inspection controls.
 *
 * @remarks
 * Bare values are interpreted as hexadecimal so address input matches the
 * notation used throughout the Web inspection UI.
 */
export function parseWebAddress(text: string, memorySize: number): WebAddressParseResult {
  const normalized = text.trim();

  if (normalized.length === 0) {
    return {
      outcome: "failure",
      message: "Enter a hexadecimal address such as 0x200.",
    };
  }

  const hexadecimal = normalized.toLowerCase().startsWith("0x")
    ? normalized.slice(2)
    : normalized;

  if (!/^[0-9a-f]+$/i.test(hexadecimal)) {
    return {
      outcome: "failure",
      message: "Enter a hexadecimal address such as 0x200.",
    };
  }

  const value = Number.parseInt(hexadecimal, 16);

  if (!Number.isSafeInteger(value) || value >= memorySize) {
    return {
      outcome: "failure",
      message: `Address must be between 0x000 and ${
        formatWebAddress(
          address(memorySize - 1),
        )
      }.`,
    };
  }

  return {
    outcome: "success",
    address: address(value),
  };
}

/** Formats one Web address using the canonical uppercase 0xNNN notation. */
export function formatWebAddress(value: Address): string {
  return `0x${value.toString(16).toUpperCase().padStart(3, "0")}`;
}

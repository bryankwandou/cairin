import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Joins class names and lets later Tailwind utilities win over earlier ones. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats whole rupiah the way Indonesian bank statements do: a dot every three
 * digits, no decimals, prefix separated by a space.
 */
export function formatIdr(amount: number, options?: { withPrefix?: boolean }): string {
  const withPrefix = options?.withPrefix ?? true;
  const digits = new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
  return withPrefix ? `Rp ${digits}` : digits;
}

/**
 * Shortens a hash or address for display while keeping enough of both ends to
 * compare against a block explorer by eye.
 */
export function truncateHash(value: string, lead = 6, tail = 4): string {
  if (value.length <= lead + tail + 1) return value;
  return `${value.slice(0, lead)}…${value.slice(-tail)}`;
}

/**
 * Builds QRIS payloads.
 *
 * Two uses. In tests it gives us fixtures that are correct by construction
 * rather than by hand-counting characters. In the product it turns a static
 * merchant code into a dynamic one by writing an amount into tag 54 and
 * resealing the checksum — the ordinary way a cashier fixes a price to a
 * printed code.
 */

import { crc16ccitt, parseQris, type QrisPayload } from "./qris.ts";

/** Encodes one tag-length-value triple. Length is always two digits. */
export function tlv(tag: string, value: string): string {
  if (!/^\d{2}$/.test(tag)) {
    throw new Error(`Tag must be two digits, received "${tag}".`);
  }
  if (value.length > 99) {
    throw new Error(
      `Field ${tag} is ${value.length} characters; QRIS length is two digits, so 99 is the ceiling.`,
    );
  }
  return tag + String(value.length).padStart(2, "0") + value;
}

/** Encodes a template whose value is itself a run of triples. */
export function template(tag: string, entries: Array<[string, string]>): string {
  return tlv(tag, entries.map(([t, v]) => tlv(t, v)).join(""));
}

/** Appends tag 63 with a freshly computed checksum. */
export function seal(body: string): string {
  const withMarker = body + "6304";
  return withMarker + crc16ccitt(withMarker);
}

export interface BuildQrisOptions {
  merchantName: string;
  merchantCity: string;
  /** Reverse-domain scheme identifier for the acquirer template. */
  acquirerGuid?: string;
  /** National Merchant ID. */
  nmid: string;
  /** Merchant size band: UMI, UKE, UME, UBE. */
  criteria?: string;
  /** Four-digit merchant category code. */
  merchantCategoryCode?: string;
  postalCode?: string;
  /** Leave unset for a static code; set it to produce a dynamic one. */
  amount?: number;
}

/** Assembles a complete, checksum-sealed QRIS string. */
export function buildQris(options: BuildQrisOptions): string {
  const {
    merchantName,
    merchantCity,
    acquirerGuid = "ID.CO.QRIS.WWW",
    nmid,
    criteria = "UMI",
    merchantCategoryCode = "5812",
    postalCode,
    amount,
  } = options;

  const parts: string[] = [
    tlv("00", "01"),
    tlv("01", amount === undefined ? "11" : "12"),
    template("51", [
      ["00", acquirerGuid],
      ["02", nmid],
      ["03", criteria],
    ]),
    tlv("52", merchantCategoryCode),
    tlv("53", "360"),
  ];

  if (amount !== undefined) {
    // Rupiah amounts are whole numbers; QRIS writes them without separators.
    parts.push(tlv("54", String(Math.round(amount))));
  }

  parts.push(tlv("58", "ID"), tlv("59", merchantName), tlv("60", merchantCity));

  if (postalCode) parts.push(tlv("61", postalCode));

  return seal(parts.join(""));
}

/**
 * Writes an amount into an existing code and reseals it.
 *
 * A merchant's printed sticker is normally static: it names the shop but not
 * the price. Fixing an amount to it is what a cashier's terminal does, and it
 * is what lets us show the payer an exact figure before they commit.
 */
export function withAmount(rawQris: string, amount: number): string {
  const parsed: QrisPayload = parseQris(rawQris);

  if (!parsed.crcValid) {
    throw new Error(
      "Refusing to rewrite a code whose checksum does not match. Scan it again.",
    );
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be a positive number of rupiah.");
  }

  const rebuilt: string[] = [];

  for (const entry of parsed.tlv) {
    if (entry.tag === "63") continue; // resealed at the end
    if (entry.tag === "01") {
      rebuilt.push(tlv("01", "12")); // now a dynamic code
      continue;
    }
    if (entry.tag === "54") continue; // replaced below
    if (entry.tag === "53") {
      // Amount belongs immediately after currency, per the tag ordering.
      rebuilt.push(tlv("53", entry.value));
      rebuilt.push(tlv("54", String(Math.round(amount))));
      continue;
    }
    rebuilt.push(tlv(entry.tag, entry.value));
  }

  // If the code had no currency tag, append the amount before sealing.
  if (!parsed.tlv.some((e) => e.tag === "53")) {
    rebuilt.push(tlv("54", String(Math.round(amount))));
  }

  return seal(rebuilt.join(""));
}

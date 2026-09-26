/**
 * QRIS payload reader.
 *
 * QRIS follows the EMVCo Merchant-Presented Mode spec: a flat string of
 * tag-length-value triples, where a handful of tags nest another TLV block
 * inside their value. Reading it needs no licence and no agreement with any
 * acquirer — the encoding is public, and every field below is described in
 * EMVCo's published specification.
 *
 * What this file does NOT do, and cannot do: move money to the merchant behind
 * the code. Settling against a QRIS merchant is a regulated activity in
 * Indonesia and requires a Bank Indonesia payment licence. We read the code to
 * learn who is being paid and how much; the payout itself travels a separate,
 * licensed rail. See src/lib/idrx.ts.
 */

export interface QrisTlv {
  tag: string;
  value: string;
  nested?: QrisTlv[];
}

export interface QrisMerchantAccount {
  /** Template tag the account was found under, 26 through 51. */
  tag: string;
  /** Reverse-domain scheme identifier, e.g. ID.CO.QRIS.WWW */
  guid?: string;
  /** National Merchant ID, the stable identifier for the merchant. */
  nmid?: string;
  /** Acquirer's own merchant identifier. */
  merchantId?: string;
  /** Merchant size band: UMI, UKE, UME, UBE, URE. */
  criteria?: string;
}

export interface QrisPayload {
  raw: string;
  /** True when the trailing CRC matches a recomputation over the payload. */
  crcValid: boolean;
  crcExpected: string;
  crcFound: string;
  /** "static" when the code carries no amount, "dynamic" when it does. */
  initiationMethod: "static" | "dynamic" | "unknown";
  merchantName?: string;
  merchantCity?: string;
  postalCode?: string;
  /** ISO 3166-1 alpha-2, "ID" for Indonesian codes. */
  countryCode?: string;
  /** ISO 4217 numeric, "360" for rupiah. */
  currencyCode?: string;
  /** Merchant category code, four digits. */
  merchantCategoryCode?: string;
  /** Amount in rupiah when the code is dynamic; undefined when static. */
  amount?: number;
  /** Fee the merchant adds on top, if the code specifies one. */
  convenienceFee?: { kind: "fixed" | "percent"; value: number };
  accounts: QrisMerchantAccount[];
  billNumber?: string;
  referenceLabel?: string;
  terminalLabel?: string;
  tlv: QrisTlv[];
}

export class QrisParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QrisParseError";
  }
}

/** Tags whose value is itself a TLV block rather than a plain string. */
const NESTED_TAGS = new Set<string>([
  // Merchant account templates.
  ...Array.from({ length: 26 }, (_, i) => String(26 + i).padStart(2, "0")),
  "62", // Additional data
  "64", // Merchant name in an alternate language
]);

/**
 * CRC-16/CCITT-FALSE, the checksum QRIS uses in tag 63.
 * Polynomial 0x1021, initial value 0xFFFF, no reflection, no final xor.
 */
export function crc16ccitt(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Walks one level of tag-length-value triples. */
function readTlv(input: string, depth = 0): QrisTlv[] {
  const out: QrisTlv[] = [];
  let cursor = 0;

  while (cursor < input.length) {
    if (cursor + 4 > input.length) {
      throw new QrisParseError(
        `Truncated field at offset ${cursor}: a tag and length need four characters, only ${input.length - cursor} remain.`,
      );
    }

    const tag = input.slice(cursor, cursor + 2);
    const lengthText = input.slice(cursor + 2, cursor + 4);
    const length = Number.parseInt(lengthText, 10);

    if (!/^\d{2}$/.test(lengthText) || Number.isNaN(length)) {
      throw new QrisParseError(
        `Field ${tag} declares a length of "${lengthText}", which is not two digits.`,
      );
    }

    const start = cursor + 4;
    const end = start + length;
    if (end > input.length) {
      throw new QrisParseError(
        `Field ${tag} claims ${length} characters but only ${input.length - start} remain.`,
      );
    }

    const value = input.slice(start, end);
    const entry: QrisTlv = { tag, value };

    // Only descend one level. QRIS never nests deeper than that, and refusing
    // to recurse further keeps a malformed code from spinning.
    if (depth === 0 && NESTED_TAGS.has(tag)) {
      try {
        entry.nested = readTlv(value, depth + 1);
      } catch {
        // A template that will not parse is kept as an opaque string rather
        // than failing the whole code — the fields we care about may still
        // be readable elsewhere.
      }
    }

    out.push(entry);
    cursor = end;
  }

  return out;
}

function findValue(tlv: QrisTlv[], tag: string): string | undefined {
  return tlv.find((entry) => entry.tag === tag)?.value;
}

function findNested(tlv: QrisTlv[], tag: string): QrisTlv[] | undefined {
  return tlv.find((entry) => entry.tag === tag)?.nested;
}

/**
 * Reads a scanned QRIS string into its fields.
 *
 * Throws QrisParseError when the string is not a QRIS code at all. A code that
 * parses but fails its checksum is returned with `crcValid: false` rather than
 * thrown, so the caller can decide whether to warn or refuse.
 */
export function parseQris(raw: string): QrisPayload {
  const trimmed = raw.trim();

  if (trimmed.length < 8) {
    throw new QrisParseError("That is too short to be a QRIS code.");
  }

  // Tag 63 is always last and always four characters of CRC.
  const crcMarker = trimmed.lastIndexOf("6304");
  if (crcMarker === -1 || crcMarker + 8 !== trimmed.length) {
    throw new QrisParseError(
      "No QRIS checksum found. The code should end with tag 6304 followed by four characters.",
    );
  }

  const body = trimmed.slice(0, crcMarker + 4);
  const crcFound = trimmed.slice(crcMarker + 4).toUpperCase();
  const crcExpected = crc16ccitt(body);

  const tlv = readTlv(trimmed);

  const formatIndicator = findValue(tlv, "00");
  if (formatIndicator !== "01") {
    throw new QrisParseError(
      `Payload format indicator is "${formatIndicator ?? "absent"}", expected "01".`,
    );
  }

  const initiationRaw = findValue(tlv, "01");
  const initiationMethod =
    initiationRaw === "11" ? "static" : initiationRaw === "12" ? "dynamic" : "unknown";

  // Merchant account templates live in tags 26 through 51.
  const accounts: QrisMerchantAccount[] = [];
  for (const entry of tlv) {
    const tagNumber = Number.parseInt(entry.tag, 10);
    if (tagNumber < 26 || tagNumber > 51 || !entry.nested) continue;
    accounts.push({
      tag: entry.tag,
      guid: findValue(entry.nested, "00"),
      nmid: findValue(entry.nested, "01") ?? findValue(entry.nested, "02"),
      merchantId: findValue(entry.nested, "02"),
      criteria: findValue(entry.nested, "03"),
    });
  }

  const additional = findNested(tlv, "62");

  const amountRaw = findValue(tlv, "54");
  const amount = amountRaw ? Number.parseFloat(amountRaw) : undefined;

  const tipIndicator = findValue(tlv, "55");
  let convenienceFee: QrisPayload["convenienceFee"];
  if (tipIndicator === "02") {
    const fixed = findValue(tlv, "56");
    if (fixed) convenienceFee = { kind: "fixed", value: Number.parseFloat(fixed) };
  } else if (tipIndicator === "03") {
    const percent = findValue(tlv, "57");
    if (percent) convenienceFee = { kind: "percent", value: Number.parseFloat(percent) };
  }

  return {
    raw: trimmed,
    crcValid: crcFound === crcExpected,
    crcExpected,
    crcFound,
    initiationMethod,
    merchantName: findValue(tlv, "59"),
    merchantCity: findValue(tlv, "60"),
    postalCode: findValue(tlv, "61"),
    countryCode: findValue(tlv, "58"),
    currencyCode: findValue(tlv, "53"),
    merchantCategoryCode: findValue(tlv, "52"),
    amount: Number.isFinite(amount) ? amount : undefined,
    convenienceFee,
    accounts,
    billNumber: additional ? findValue(additional, "01") : undefined,
    referenceLabel: additional ? findValue(additional, "05") : undefined,
    terminalLabel: additional ? findValue(additional, "07") : undefined,
    tlv,
  };
}

/** Merchant size bands as they appear in tag 26-51 sub-tag 03. */
export const MERCHANT_CRITERIA: Record<string, string> = {
  UMI: "Usaha Mikro",
  UKE: "Usaha Kecil",
  UME: "Usaha Menengah",
  UBE: "Usaha Besar",
  URE: "Usaha Regular",
};

/** Picks the account entry most likely to identify the merchant nationally. */
export function primaryAccount(payload: QrisPayload): QrisMerchantAccount | undefined {
  return (
    payload.accounts.find((a) => a.guid?.toUpperCase().includes("ID.CO.QRIS")) ??
    payload.accounts[0]
  );
}

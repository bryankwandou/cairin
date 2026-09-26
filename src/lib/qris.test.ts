/**
 * Checks the QRIS reader against payloads it did not build itself, and against
 * payloads it did.
 *
 * Run with:  npm test
 * Node strips the TypeScript annotations, so there is no build step.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { parseQris, crc16ccitt, primaryAccount, QrisParseError } from "./qris.ts";
import { buildQris, withAmount, tlv, template, seal } from "./qris-build.ts";

test("checksum matches the published CRC-16/CCITT-FALSE vector", () => {
  // The reference vector every implementation is checked against.
  assert.equal(crc16ccitt("123456789"), "29B1");
});

// A payload captured from a real merchant sticker, published alongside its
// expected decode by an unrelated QRIS library. Checking against it proves we
// read codes we did not write ourselves.
const REAL_WORLD_CODE =
  "00020101021126680016ID.CO.TELKOM.WWW011893600898026635207502150001952663520750303UMI" +
  "51440014ID.CO.QRIS.WWW0215ID10211254059720303UMI5204549953033605502015802ID" +
  "5906BIOLBE6011KAB. MALANG610565168622005091147938120703A03630404CB";

test("reads a real merchant sticker and agrees with its published decode", () => {
  const parsed = parseQris(REAL_WORLD_CODE);

  assert.equal(parsed.crcValid, true, "a genuine sticker must pass its own checksum");
  assert.equal(parsed.crcFound, "04CB");
  assert.equal(parsed.initiationMethod, "static");
  assert.equal(parsed.merchantName, "BIOLBE");
  assert.equal(parsed.merchantCity, "KAB. MALANG");
  assert.equal(parsed.postalCode, "65168");
  assert.equal(parsed.countryCode, "ID");
  assert.equal(parsed.currencyCode, "360");
  assert.equal(parsed.merchantCategoryCode, "5499");
  assert.equal(parsed.amount, undefined, "a static sticker carries no amount");

  // Two templates: the acquirer's own, and the national QRIS one.
  assert.equal(parsed.accounts.length, 2);
  const telkom = parsed.accounts.find((a) => a.guid === "ID.CO.TELKOM.WWW");
  assert.ok(telkom, "expected the acquirer template in tag 26");
  assert.equal(telkom.criteria, "UMI");

  const national = primaryAccount(parsed);
  assert.equal(national?.guid, "ID.CO.QRIS.WWW");
  assert.equal(national?.merchantId, "ID1021125405972");

  // Tag 62 holds the reference and terminal labels.
  assert.equal(parsed.referenceLabel, "114793812");
  assert.equal(parsed.terminalLabel, "A03");
});

test("can fix an amount to a real merchant sticker", () => {
  const dynamic = withAmount(REAL_WORLD_CODE, 18500);
  const parsed = parseQris(dynamic);

  assert.equal(parsed.crcValid, true);
  assert.equal(parsed.initiationMethod, "dynamic");
  assert.equal(parsed.amount, 18500);
  // The merchant must still be the same merchant.
  assert.equal(parsed.merchantName, "BIOLBE");
  assert.equal(primaryAccount(parsed)?.merchantId, "ID1021125405972");
});

test("reads a static merchant code end to end", () => {
  const code = buildQris({
    merchantName: "Warung Bu Tin",
    merchantCity: "SURABAYA",
    nmid: "ID1020017611473",
    criteria: "UMI",
    merchantCategoryCode: "5812",
    postalCode: "60119",
  });

  const parsed = parseQris(code);

  assert.equal(parsed.crcValid, true);
  assert.equal(parsed.initiationMethod, "static");
  assert.equal(parsed.merchantName, "Warung Bu Tin");
  assert.equal(parsed.merchantCity, "SURABAYA");
  assert.equal(parsed.countryCode, "ID");
  assert.equal(parsed.currencyCode, "360");
  assert.equal(parsed.merchantCategoryCode, "5812");
  assert.equal(parsed.postalCode, "60119");
  // A static code carries no amount — the payer supplies it.
  assert.equal(parsed.amount, undefined);

  const account = primaryAccount(parsed);
  assert.ok(account, "expected a merchant account template");
  assert.equal(account.guid, "ID.CO.QRIS.WWW");
  assert.equal(account.merchantId, "ID1020017611473");
  assert.equal(account.criteria, "UMI");
});

test("reads a dynamic code and its amount", () => {
  const code = buildQris({
    merchantName: "Kopi Sore",
    merchantCity: "BANDUNG",
    nmid: "ID2029900112233",
    amount: 27500,
  });

  const parsed = parseQris(code);
  assert.equal(parsed.crcValid, true);
  assert.equal(parsed.initiationMethod, "dynamic");
  assert.equal(parsed.amount, 27500);
});

test("handles a nested acquirer template alongside the national one", () => {
  // Real stickers usually carry the acquirer's own template in tag 26 and the
  // national QRIS template in tag 51.
  const body =
    tlv("00", "01") +
    tlv("01", "11") +
    template("26", [
      ["00", "ID.DANA.WWW"],
      ["01", "936009153022591481"],
      ["02", "022591481"],
      ["03", "UMI"],
    ]) +
    template("51", [
      ["00", "ID.CO.QRIS.WWW"],
      ["02", "ID1020017611473"],
      ["03", "UMI"],
    ]) +
    tlv("52", "5812") +
    tlv("53", "360") +
    tlv("58", "ID") +
    tlv("59", "Toko Kita") +
    tlv("60", "JAKARTA PUSAT") +
    tlv("61", "10310");

  const parsed = parseQris(seal(body));

  assert.equal(parsed.crcValid, true);
  assert.equal(parsed.accounts.length, 2, "both templates should be read");

  // primaryAccount must prefer the national QRIS template, not tag 26.
  const account = primaryAccount(parsed);
  assert.equal(account?.guid, "ID.CO.QRIS.WWW");
  assert.equal(account?.merchantId, "ID1020017611473");

  const dana = parsed.accounts.find((a) => a.guid === "ID.DANA.WWW");
  assert.equal(dana?.merchantId, "022591481");
});

test("flags a tampered code instead of trusting it", () => {
  const code = buildQris({
    merchantName: "Toko Kita",
    merchantCity: "JAKARTA PUSAT",
    nmid: "ID1020017611473",
  });
  // Swap the city but leave the original checksum in place. Same length, so
  // every field still parses — only the checksum betrays the edit.
  const tampered = code.replace("JAKARTA PUSAT", "JAKARTA BARATT".slice(0, 13));

  const parsed = parseQris(tampered);
  assert.notEqual(parsed.merchantCity, "JAKARTA PUSAT");
  assert.equal(parsed.crcValid, false, "a tampered payload must not pass its checksum");
});

test("refuses input that is not a QRIS code at all", () => {
  assert.throws(() => parseQris("https://example.com/pay/123"), QrisParseError);
  assert.throws(() => parseQris(""), QrisParseError);
  assert.throws(() => parseQris("hello world"), QrisParseError);
});

test("refuses a code whose field length runs past the end", () => {
  // Tag 59 claims 99 characters of merchant name that are not there.
  assert.throws(() => parseQris("000201010211" + "5999Toko" + "63040000"), QrisParseError);
});

test("refuses a code with no checksum tag", () => {
  assert.throws(
    () => parseQris(tlv("00", "01") + tlv("01", "11") + tlv("59", "Toko")),
    QrisParseError,
  );
});

test("fixing an amount to a static code produces a valid dynamic code", () => {
  const staticCode = buildQris({
    merchantName: "Warung Bu Tin",
    merchantCity: "SURABAYA",
    nmid: "ID1020017611473",
    postalCode: "60119",
  });

  const dynamicCode = withAmount(staticCode, 45000);
  const parsed = parseQris(dynamicCode);

  assert.equal(parsed.crcValid, true, "the rewritten code must reseal correctly");
  assert.equal(parsed.initiationMethod, "dynamic");
  assert.equal(parsed.amount, 45000);
  // Everything identifying the merchant must survive untouched.
  assert.equal(parsed.merchantName, "Warung Bu Tin");
  assert.equal(parsed.merchantCity, "SURABAYA");
  assert.equal(parsed.postalCode, "60119");
  assert.equal(primaryAccount(parsed)?.merchantId, "ID1020017611473");
});

test("replacing an amount does not stack a second one", () => {
  const first = buildQris({
    merchantName: "Kopi Sore",
    merchantCity: "BANDUNG",
    nmid: "ID2029900112233",
    amount: 10000,
  });
  const second = withAmount(first, 99000);
  const parsed = parseQris(second);

  assert.equal(parsed.amount, 99000);
  assert.equal(
    parsed.tlv.filter((e) => e.tag === "54").length,
    1,
    "exactly one amount field should remain",
  );
});

test("refuses to rewrite a code whose checksum is already broken", () => {
  const code = buildQris({
    merchantName: "Toko Kita",
    merchantCity: "MEDAN",
    nmid: "ID1020017611473",
  });
  const broken = code.slice(0, -1) + (code.at(-1) === "A" ? "B" : "A");
  assert.throws(() => withAmount(broken, 5000), /checksum/i);
});

test("rejects an amount that is not a positive number", () => {
  const code = buildQris({
    merchantName: "Toko Kita",
    merchantCity: "MEDAN",
    nmid: "ID1020017611473",
  });
  assert.throws(() => withAmount(code, 0), /positive/i);
  assert.throws(() => withAmount(code, -100), /positive/i);
  assert.throws(() => withAmount(code, Number.NaN), /positive/i);
});

test("refuses to encode a field longer than QRIS can express", () => {
  assert.throws(() => tlv("59", "x".repeat(100)), /99/);
});

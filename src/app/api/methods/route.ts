import { NextResponse } from "next/server";
import { listTransferMethods, IdrxUnavailable } from "@/lib/idrx";

export const dynamic = "force-dynamic";

/**
 * The destinations the issuer will pay to.
 *
 * This list is fetched rather than hardcoded on purpose: bank codes change, and
 * a stale local copy is how a payout ends up addressed to nowhere. If the
 * issuer cannot be reached we return the failure instead of a guess.
 */
export async function GET() {
  try {
    const methods = await listTransferMethods();
    return NextResponse.json({ methods });
  } catch (error) {
    if (error instanceof IdrxUnavailable) {
      return NextResponse.json(
        { error: error.reason, message: error.message, detail: error.detail },
        { status: error.reason === "credentials-missing" ? 503 : 502 },
      );
    }
    return NextResponse.json(
      { error: "unknown", message: "Daftar tujuan tidak dapat diambil." },
      { status: 502 },
    );
  }
}

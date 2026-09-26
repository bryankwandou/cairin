import { NextResponse } from "next/server";
import { isConfigured, listTransferMethods, IdrxUnavailable } from "@/lib/idrx";

export const dynamic = "force-dynamic";

/**
 * Reports whether payouts can actually run right now.
 *
 * The interface asks this before it offers anyone a button. A rail that is not
 * configured says so plainly here, and the payout screen stays shut rather than
 * collecting bank details it has no way to use.
 */
export async function GET() {
  if (!isConfigured()) {
    return NextResponse.json({
      ready: false,
      reason: "credentials-missing",
      message:
        "Rail pencairan belum aktif di server ini: kredensial penerbit IDRX belum dipasang.",
      detail:
        "Kredensial hanya diberikan penerbit kepada akun bisnis yang sudah lolos verifikasi. Sampai itu ada, Cairin menolak memulai pencairan.",
    });
  }

  // Credentials existing is not the same as credentials working. The cheapest
  // honest check is to ask the issuer for something harmless and see if it
  // answers.
  try {
    const methods = await listTransferMethods();
    return NextResponse.json({
      ready: true,
      destinationCount: methods.length,
      message: "Rail pencairan aktif.",
    });
  } catch (error) {
    if (error instanceof IdrxUnavailable) {
      return NextResponse.json({
        ready: false,
        reason: error.reason,
        message: error.message,
        detail: error.detail,
      });
    }
    return NextResponse.json({
      ready: false,
      reason: "issuer-unreachable",
      message: "Penerbit tidak dapat dihubungi saat ini.",
    });
  }
}

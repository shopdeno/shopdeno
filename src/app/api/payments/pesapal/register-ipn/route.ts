import { NextResponse } from "next/server";
import { pesapalPost } from "@/lib/pesapal";

// One-time setup: GET /api/payments/pesapal/register-ipn
// Registers our IPN listener URL with PesaPal and returns the ipn_id.
// Copy the ipn_id into PESAPAL_IPN_ID in your .env before taking live orders.
// Re-run if the site URL changes or you switch between sandbox/production.

type RegisterIpnResponse = {
  url: string;
  created_date: string;
  ipn_id: string;
  error?: { error_type: string; code: string; message: string };
  status: string;
};

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    return NextResponse.json({ error: "NEXT_PUBLIC_SITE_URL is not set" }, { status: 500 });
  }

  try {
    const ipnUrl = `${siteUrl}/api/payments/pesapal/ipn`;
    const data = await pesapalPost<RegisterIpnResponse>("/api/URLSetup/RegisterIPN", {
      url: ipnUrl,
      ipn_notification_type: "GET",
    });

    if (data.error?.code) {
      return NextResponse.json({ error: data.error.message, raw: data }, { status: 400 });
    }

    return NextResponse.json({
      ipn_id: data.ipn_id,
      ipn_url: data.url,
      message: `Set PESAPAL_IPN_ID=${data.ipn_id} in your .env`,
    });
  } catch (err) {
    console.error("IPN registration failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "IPN registration failed" },
      { status: 500 }
    );
  }
}

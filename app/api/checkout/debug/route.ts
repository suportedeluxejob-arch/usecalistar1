import { NextResponse } from "next/server"

// Debug endpoint to check environment variables (remove in production)
export async function GET() {
  const apiKey = process.env.PAGOU_SECRET_KEY || ""
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ""

  return NextResponse.json({
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey.length,
    apiKeyPrefix: apiKey.substring(0, 10) || "EMPTY",
    apiKeySuffix: apiKey.length > 5 ? apiKey.substring(apiKey.length - 5) : "EMPTY",
    hasWhitespace: apiKey !== apiKey.trim(),
    appUrl: appUrl || "NOT_SET",
    apiMode: apiKey.startsWith("sk_live_") ? "PRODUCTION" : "SANDBOX",
  })
}

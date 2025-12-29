import { NextResponse } from "next/server"

export async function GET() {
  const apiKey = process.env.PAGOU_SECRET_KEY?.trim()

  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" })
  }

  const isProduction = apiKey.startsWith("sk_live_")
  const baseUrl = isProduction ? "https://api.pagou.com.br" : "https://sandbox.api.pagou.com.br"

  const testPayload = {
    amount: 10.0,
    description: "Teste de integração",
    expiration: 3600,
    external_reference: `test_${Date.now()}`,
    payer: {
      name: "Teste Cliente",
      document: "12345678909",
      email: "teste@teste.com",
    },
  }

  const url = `${baseUrl}/v1/pix`

  const authMethods = [
    { name: "X-API-KEY", headers: { "X-API-KEY": apiKey } },
    { name: "Authorization Bearer", headers: { Authorization: `Bearer ${apiKey}` } },
    { name: "api-key", headers: { "api-key": apiKey } },
    { name: "x-api-key lowercase", headers: { "x-api-key": apiKey } },
  ]

  const results: Record<string, unknown>[] = []

  for (const method of authMethods) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          ...method.headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testPayload),
      })

      const responseText = await response.text()
      let responseData
      try {
        responseData = JSON.parse(responseText)
      } catch {
        responseData = responseText
      }

      results.push({
        method: method.name,
        status: response.status,
        success: response.ok,
        data: responseData,
      })

      // If one works, break early
      if (response.ok) {
        break
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      results.push({
        method: method.name,
        error: errorMessage,
      })
    }
  }

  const keyCharCodes = apiKey.split("").map((char, i) => ({
    position: i,
    char: char,
    code: char.charCodeAt(0),
  }))

  return NextResponse.json({
    debug: {
      url,
      apiKeyLength: apiKey.length,
      apiKeyPrefix: apiKey.substring(0, 12),
      apiKeySuffix: apiKey.substring(apiKey.length - 8),
      keyCharCodes: keyCharCodes.slice(0, 15), // First 15 chars
      isProduction,
    },
    authTestResults: results,
  })
}

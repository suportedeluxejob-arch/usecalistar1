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
      document: "12345678909", // CPF teste
      email: "teste@teste.com",
    },
  }

  try {
    const url = `${baseUrl}/v1/pix`

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
        "User-Agent": "Calistar/1.0",
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

    return NextResponse.json({
      debug: {
        url,
        apiKeyPrefix: apiKey.substring(0, 10),
        apiKeyLength: apiKey.length,
        isProduction,
        requestPayload: testPayload,
      },
      response: {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: responseData,
      },
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({
      error: "Request failed",
      message: errorMessage,
    })
  }
}

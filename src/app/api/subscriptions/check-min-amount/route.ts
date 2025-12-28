import { NextResponse } from "next/server";

const NOWPAYMENTS_API_URL = "https://api.nowpayments.io/v1";

export async function GET(request: Request) {
  const apiKey = process.env.NOWPAYMENTS_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json(
      { error: "API key not configured" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const currencyFrom = searchParams.get("currency_from") || "usd";
  const currencyTo = searchParams.get("currency_to") || "usdc";

  try {
    // Пробуем разные варианты кодов для USDC и другие валюты с низким минимумом
    const possibleCodes = [
      "usdc",           // Стандартный USDC
      "usdcsol",        // USDC на Solana
      "usdcpolygon",    // USDC на Polygon
      "usdcmatic",      // USDC на Polygon (через Matic)
      "trx",            // TRON (из списка с минимумом <$2)
      "xrp",            // XRP (из списка с минимумом <$2)
      "ltc",            // Litecoin (из списка с минимумом <$2)
      "xlm",            // Stellar (из списка с минимумом <$2)
      "usdttrc20",      // USDT на TRON
      "usdterc20",      // USDT на Ethereum
    ];

    const results: Record<string, any> = {};

    for (const code of possibleCodes) {
      try {
        const response = await fetch(
          `${NOWPAYMENTS_API_URL}/min-amount?currency_from=${currencyFrom}&currency_to=${code}`,
          {
            headers: {
              "x-api-key": apiKey,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          results[code] = {
            success: true,
            min_amount: data.min_amount,
            currency_from: data.currency_from,
            currency_to: data.currency_to,
          };
        } else {
          const errorData = await response.json().catch(() => ({}));
          results[code] = {
            success: false,
            error: errorData.message || errorData.code || "Unknown error",
            status: response.status,
          };
        }
      } catch (error) {
        results[code] = {
          success: false,
          error: error instanceof Error ? error.message : "Request failed",
        };
      }
    }

    return NextResponse.json({
      currency_from: currencyFrom,
      tested_codes: results,
      recommendation: Object.entries(results).find(([_, data]: [string, any]) => data.success)?.[0] || "none",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to check minimum amount",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}


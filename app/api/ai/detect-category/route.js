import {
  CategoryServiceError,
  requestCategorySuggestion,
  validateCategoryInput,
} from "../../../../lib/ai-category.mjs";

export const runtime = "nodejs";

const WINDOW_MS = 60_000;
const REQUEST_LIMIT = 5;
const rateBuckets = new Map();

function clientAddress(request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function rateLimited(address, now = Date.now()) {
  if (rateBuckets.size > 500) {
    for (const [key, bucket] of rateBuckets) {
      if (bucket.resetAt <= now) rateBuckets.delete(key);
    }
  }
  const existing = rateBuckets.get(address);
  if (!existing || existing.resetAt <= now) {
    rateBuckets.set(address, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  existing.count += 1;
  return existing.count > REQUEST_LIMIT;
}

export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Malformed JSON request." }, { status: 400 });
  }

  try {
    const input = validateCategoryInput(payload);
    if (rateLimited(clientAddress(request))) {
      return Response.json(
        { error: "Too many AI requests were made. Please wait and try again." },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }

    const result = await requestCategorySuggestion({
      input,
      apiKey: process.env.OPENROUTER_API_KEY?.trim(),
      model: process.env.OPENROUTER_MODEL?.trim(),
      appUrl: process.env.NEXT_PUBLIC_APP_URL?.trim(),
    });
    return Response.json(result, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof CategoryServiceError) {
      if (error.status >= 500) {
        console.error("[Smart Category] request failed", {
          code: error.code,
          status: error.status,
          providerStatus: error.providerStatus,
        });
      }
      return Response.json({ error: error.publicMessage }, { status: error.status });
    }
    console.error("[Smart Category] unexpected server error");
    return Response.json(
      {
        error:
          "The AI category service is temporarily unavailable. Please choose a category manually.",
      },
      { status: 500 },
    );
  }
}

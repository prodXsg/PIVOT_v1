// Shared Gemini API helper for Pivot edge functions

/** Strip characters that could be used for prompt injection and enforce a length cap. */
export function sanitizeInput(s: string, maxLen = 500): string {
  return s
    .trim()
    .replace(/[{}\\\[\]`<>]/g, "")   // remove template/code chars
    .slice(0, maxLen);
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

export async function callGemini(combinedPrompt: string): Promise<unknown> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const body = JSON.stringify({
    contents: [{ parts: [{ text: combinedPrompt }] }],
    generationConfig: {
      temperature: 0.1,          // Low for strict rule-following
      maxOutputTokens: 4000,
      responseMimeType: "application/json",
    },
  });

  // Try up to 3 times on transient 503/429 (Gemini overload)
  let res: Response | null = null;
  let lastErrText = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    const controller = new AbortController();
    // 28-second timeout per attempt so a 10s frontend race doesn't fire first
    const timeoutId = setTimeout(() => controller.abort(), 28000);
    try {
      res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (e) {
      clearTimeout(timeoutId);
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 600 * attempt));
        continue;
      }
      throw e;
    }
    if (res.ok) break;
    lastErrText = await res.text();
    if (res.status !== 503 && res.status !== 429) break;
    if (attempt < 3) await new Promise((r) => setTimeout(r, 600 * attempt));
  }

  if (!res || !res.ok) {
    throw new Error(`Gemini ${res?.status ?? "no-response"}: ${lastErrText.slice(0, 200)}`);
  }

  const data = await res.json();
  const text: string | undefined =
    data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No text in Gemini response");

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Failed to parse Gemini JSON");
  }
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

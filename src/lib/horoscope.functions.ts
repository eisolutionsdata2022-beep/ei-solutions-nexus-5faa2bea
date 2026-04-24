/**
 * Horoscope server function — calls Lovable AI Gateway (Gemini) to produce a
 * structured Malayalam horoscope report. Pure JSON in / structured JSON out.
 * No PDF or download logic here — the client handles rendering & download.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { firebaseAuthMiddleware } from "./firebase-auth.middleware";
import type { HoroscopeReport } from "./horoscope-types";

const InputSchema = z.object({
  customerName: z.string().min(1).max(120),
  gender: z.enum(["Male", "Female", "Other"]),
  dateOfBirth: z.string().min(1).max(20),
  timeOfBirth: z.string().min(1).max(20),
  placeOfBirth: z.string().min(1).max(160),
  nakshatram: z.string().max(80).optional().default(""),
  product: z.enum(["standard", "premium"]),
});

type Result =
  | { ok: true; report: HoroscopeReport }
  | { ok: false; error: string };

const horoscopeTool = {
  type: "function",
  function: {
    name: "horoscope_report",
    description: "Detailed Malayalam Vedic horoscope report.",
    parameters: {
      type: "object",
      properties: {
        summary:        { type: "string", description: "ഒറ്റവരി പൊതുപ്രവചനം (Malayalam)" },
        personality:    { type: "string", description: "വ്യക്തിത്വ വിശകലനം — 3-5 വാക്യങ്ങൾ" },
        career:         { type: "string", description: "കരിയർ / ജോലി — 3-5 വാക്യങ്ങൾ" },
        finance:        { type: "string", description: "സാമ്പത്തിക സ്ഥിതി — 3-5 വാക്യങ്ങൾ" },
        marriage:       { type: "string", description: "വിവാഹം / പങ്കാളി ജീവിതം" },
        health:         { type: "string", description: "ആരോഗ്യ സൂചനകൾ" },
        education:      { type: "string", description: "വിദ്യാഭ്യാസം" },
        luckyPeriods:   { type: "string", description: "ഭാഗ്യ കാലങ്ങൾ, വർഷങ്ങൾ, ദിവസങ്ങൾ" },
        remedies:       { type: "string", description: "പരിഹാരങ്ങൾ — പൂജ, മന്ത്രം, ദാനം" },
        futureOutlook:  { type: "string", description: "1, 3, 5 വർഷ ഭാവി പ്രവചനം" },
        dasha:          { type: "string", description: "Premium only — Vimshottari Dasha timeline" },
        yearlyForecast: { type: "string", description: "Premium only — അടുത്ത 5 വർഷം ഓരോന്നിന്റെയും പ്രവചനം" },
      },
      required: [
        "summary", "personality", "career", "finance", "marriage",
        "health", "education", "luckyPeriods", "remedies", "futureOutlook",
      ],
      additionalProperties: false,
    },
  },
};

export const generateHoroscopeReport = createServerFn({ method: "POST" })
  .middleware([firebaseAuthMiddleware])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }): Promise<Result> => {
    if (!context.authUser) return { ok: false, error: "Authentication required." };

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { ok: false, error: "AI horoscope is not configured. Please contact admin." };

    const isPremium = data.product === "premium";
    const systemPrompt = `You are an experienced Kerala Hindu Vedic astrologer (ജ്യോതിഷ പണ്ഡിതൻ).
Produce a thorough horoscope reading entirely in Malayalam (മലയാളം).
Each field MUST contain 3–6 specific, encouraging-but-honest sentences. NO disclaimers.
${isPremium
      ? "This is a PREMIUM report — also fill `dasha` (Vimshottari Dasha timeline) and `yearlyForecast` (next 5 years, year-by-year)."
      : "This is a STANDARD report — leave `dasha` and `yearlyForecast` empty."}
Always call the horoscope_report tool — never plain text.`;

    const userPrompt = `വ്യക്തി: ${data.customerName}
ലിംഗം: ${data.gender}
ജനന തീയതി: ${data.dateOfBirth}
ജനന സമയം: ${data.timeOfBirth}
ജനന സ്ഥലം: ${data.placeOfBirth}
നക്ഷത്രം: ${data.nakshatram || "(provided as needed)"}

Generate a complete ${isPremium ? "PREMIUM (Sampoorna)" : "STANDARD"} Malayalam horoscope reading.`;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools: [horoscopeTool],
          tool_choice: { type: "function", function: { name: "horoscope_report" } },
        }),
      });

      if (res.status === 429) return { ok: false, error: "Rate limit exceeded. Please retry shortly." };
      if (res.status === 402) return { ok: false, error: "AI credits exhausted. Please contact admin." };
      if (!res.ok) {
        const t = await res.text();
        console.error("Horoscope AI gateway error:", res.status, t);
        return { ok: false, error: "AI service is currently unavailable. Please try again." };
      }

      const json = await res.json();
      const call = json?.choices?.[0]?.message?.tool_calls?.[0];
      if (!call?.function?.arguments) {
        return { ok: false, error: "AI did not return a structured report. Please retry." };
      }
      const report = JSON.parse(call.function.arguments) as HoroscopeReport;
      return { ok: true, report };
    } catch (err: any) {
      console.error("Horoscope request failed:", err);
      return { ok: false, error: err?.message || "Unexpected error during horoscope generation." };
    }
  });
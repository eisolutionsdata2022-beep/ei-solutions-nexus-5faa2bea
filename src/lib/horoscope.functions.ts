/**
 * Horoscope server function — calls Lovable AI Gateway (Gemini) to produce a
 * full Vedic-style Malayalam report (ജാതക ചക്രം, ഗ്രഹനിലകൾ, പ്രവചനങ്ങൾ,
 * ദശാ ഭുക്തി, പരിഹാരങ്ങൾ). Pure JSON in / structured JSON out.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { firebaseAuthMiddleware } from "./firebase-auth.middleware";
import type { HoroscopeReport } from "./horoscope-types";

const InputSchema = z.object({
  customerName: z.string().min(1).max(120),
  gender: z.enum(["Male", "Female", "Other"]),
  religion: z.enum(["Hindu", "Muslim", "Christian"]),
  dateOfBirth: z.string().min(1).max(20),
  timeOfBirth: z.string().min(1).max(20),
  placeOfBirth: z.string().min(1).max(160),
  nakshatram: z.string().max(80).optional().default(""),
  product: z.enum(["standard", "premium"]),
});

type Result =
  | { ok: true; report: HoroscopeReport }
  | { ok: false; error: string };

/* ───────────── tool schema (Gemini structured output) ───────────── */

const stringArr = { type: "array", items: { type: "string" } };

const horoscopeTool = {
  type: "function",
  function: {
    name: "horoscope_report",
    description: "Detailed Malayalam Vedic horoscope report including birth chart, planet positions, predictions and remedies.",
    parameters: {
      type: "object",
      properties: {
        summary:  { type: "string", description: "ഒറ്റവരി പൊതുപ്രവചനം" },

        // Birth chart
        lagnam: { type: "string", description: "ലഗ്നം in Malayalam, e.g. ഇടവം" },
        rashi:  { type: "string", description: "ചന്ദ്ര രാശി in Malayalam" },
        chakram: {
          type: "array",
          description: "Exactly 12 cells, one per house 1-12, with rashi & planet codes (SU/MO/MA/ME/JU/VE/SA/RA/KE).",
          items: {
            type: "object",
            properties: {
              house:   { type: "number" },
              rashi:   { type: "string" },
              planets: stringArr,
            },
            required: ["house", "rashi", "planets"],
          },
        },
        grahaNilakal: {
          type: "array",
          description: "9 grahas: Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, Ketu.",
          items: {
            type: "object",
            properties: {
              planet:    { type: "string" },
              house:     { type: "number" },
              rashi:     { type: "string" },
              condition: { type: "string" },
              code:      { type: "string" },
            },
            required: ["planet", "house", "rashi", "condition"],
          },
        },

        // Predictions
        generalPredictions: {
          type: "array",
          description: "4-8 short predictions like ലഗ്നം, വ്യക്തിത്വം, കുടുംബം, വിവാഹം, തൊഴിൽ, സുഖം, ആത്മീയത.",
          items: {
            type: "object",
            properties: {
              titleMl: { type: "string" },
              titleEn: { type: "string" },
              body:    { type: "string" },
            },
            required: ["titleMl", "body"],
          },
        },
        lifeStages: {
          type: "array",
          description: "Age bands like 0-7, 8-16, 17-25, 26-35, 36-45, 46-55, 56-65, 66+.",
          items: {
            type: "object",
            properties: {
              ageRange:   { type: "string" },
              prediction: { type: "string" },
            },
            required: ["ageRange", "prediction"],
          },
        },
        marriageYoga:           { type: "string" },
        childrenFortune:        { type: "string" },
        education:              { type: "string" },
        career:                 { type: "string" },
        foreignTravel:          { type: "string" },
        financialGrowthPeriods: { type: "string", description: "Multi-line: each line YYYY-YYYY: description" },
        health:                 { type: "string" },
        obstacles:              { type: "string" },
        turningPoints:          { type: "string", description: "Multi-line: each line is one turning point with year/age" },

        // Remedies
        poojas:       stringArr,
        temples:      stringArr,
        shantiKarmas: stringArr,
        daanam:       stringArr,
        mantras:      stringArr,
        vratas:       stringArr,
        goodDays:     stringArr,
        cautionDays:  stringArr,

        // Premium
        dashaBhukti: {
          type: "array",
          description: "Premium only — Vimshottari mahadasha rows.",
          items: {
            type: "object",
            properties: {
              planet:    { type: "string" },
              startYear: { type: "number" },
              endYear:   { type: "number" },
              years:     { type: "number" },
            },
            required: ["planet", "startYear", "endYear", "years"],
          },
        },
        yearlyForecasts: {
          type: "array",
          description: "Premium only — next 5 years.",
          items: {
            type: "object",
            properties: {
              year:       { type: "number" },
              prediction: { type: "string" },
            },
            required: ["year", "prediction"],
          },
        },
        gocharaPhalam: { type: "string", description: "Premium only — current ഗോചര ഫലം paragraph." },
      },
      required: [
        "summary",
        "lagnam", "rashi", "chakram", "grahaNilakal",
        "generalPredictions", "lifeStages",
        "marriageYoga", "childrenFortune", "education", "career",
        "foreignTravel", "financialGrowthPeriods",
        "health", "obstacles", "turningPoints",
        "poojas", "temples", "shantiKarmas", "daanam",
        "mantras", "vratas", "goodDays", "cautionDays",
      ],
      additionalProperties: false,
    },
  },
};

/* ───────────── religion-specific framing ───────────── */

const religionGuide: Record<"Hindu" | "Muslim" | "Christian", string> = {
  Hindu: `The customer is HINDU. Use traditional Vedic astrology framework (ജ്യോതിഷം), Vimshottari Dasha, Nakshatra-based predictions. Recommend Hindu remedies — temple visits (ക്ഷേത്ര ദർശനം — ഗുരുവായൂർ, ശബരിമല, etc.), specific Vedic mantras (ഓം ഗം ഗണപതയേ നമഃ, ഓം നമഃ ശിവായ, ഗായത്രി മന്ത്രം), pujas (ഗണപതി ഹോമം, നവഗ്രഹ പൂജ), shanti karmas, donations (ദാനം), specific vratas (ഏകാദശി, പ്രദോഷ).`,
  Muslim: `The customer is MUSLIM. Frame predictions respectfully within Islamic worldview — Allah's will (അല്ലാഹുവിന്റെ ഇച്ഛ), barakah, rizq. Use Ilm-ul-Nujoom style observations of stars/planets as natural signs. For remedies, recommend ONLY Islamic practices — five daily Salah (നമസ്കാരം), Quranic recitation (Surah Al-Fatiha, Ayat al-Kursi, Surah Yaseen), dua, sadaqah (ദാനധർമ്മം), fasting on Mondays/Thursdays, dhikr, visits to mosques/dargah. NEVER suggest temples, idols, mantras, or Hindu rituals. The "poojas/temples/shantiKarmas/mantras/vratas" arrays must contain Islamic equivalents (e.g. "5 വക്ത് നമസ്കാരം" instead of pooja).`,
  Christian: `The customer is CHRISTIAN. Frame predictions within Christian worldview — God's plan (ദൈവത്തിന്റെ പദ്ധതി), divine grace, providence. Use star/planetary observations as God's signs in nature. For remedies recommend ONLY Christian practices — daily prayer, Bible reading (Psalms 23, 91, 121), Holy Mass, Rosary (ജപമാല), confession, charity, novenas, visits to churches/shrines (വേളാങ്കണ്ണി, ഭരണങ്ങാനം, etc.). NEVER suggest temples, mantras, pujas. The "poojas/temples/shantiKarmas/mantras/vratas" arrays must contain Christian equivalents (e.g. "ഞായർ വിശുദ്ധ കുർബാന" instead of pooja).`,
};

/* ───────────── server function ───────────── */

export const generateHoroscopeReport = createServerFn({ method: "POST" })
  .middleware([firebaseAuthMiddleware])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }): Promise<Result> => {
    if (!context.authUser) return { ok: false, error: "Authentication required." };

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { ok: false, error: "AI horoscope is not configured. Please contact admin." };

    const isPremium = data.product === "premium";

    const systemPrompt = `You are a wise, experienced Kerala astrologer producing a complete horoscope reading entirely in Malayalam (മലയാളം).

${religionGuide[data.religion]}

Output MUST be a single tool call to "horoscope_report".

Rules:
- ALL text strings must be in Malayalam (മലയാളം) — no English in body text. Planet names may include English in parentheses, e.g. "സൂര്യൻ (Sun)".
- Every text section: 3-6 specific, encouraging-but-honest sentences. Mention concrete years/ages/months.
- "chakram" MUST contain exactly 12 entries, house 1..12 in order, each with the correct Malayalam rashi name and the planets occupying it (SU, MO, MA, ME, JU, VE, SA, RA, KE).
- "grahaNilakal" MUST contain all 9 grahas in this order: സൂര്യൻ, ചന്ദ്രൻ, ചൊവ്വ, ബുധൻ, വ്യാഴം, ശുക്രൻ, ശനി, രാഹു, കേതു — and be consistent with chakram.
- "generalPredictions" should produce 5-7 micro-sections like ലഗ്നം, വ്യക്തിത്വം, കുടുംബം, വിവാഹം, തൊഴിൽ, സുഖം, ആത്മീയത.
- "lifeStages" should cover 7-8 age bands from childhood to old age.
- Each remedy array (poojas, temples, shantiKarmas, daanam, mantras, vratas, goodDays, cautionDays) should contain 3-6 short bullet items.
- ${isPremium
        ? `This is a PREMIUM (സമ്പൂർണ) report — also fill "dashaBhukti" (9 Vimshottari mahadashas with start/end years), "yearlyForecasts" (next 5 calendar years 2026-2030), and "gocharaPhalam" (current transit reading).`
        : `This is a STANDARD report — leave "dashaBhukti", "yearlyForecasts" and "gocharaPhalam" empty/omitted.`}`;

    const userPrompt = `വ്യക്തി: ${data.customerName}
ലിംഗം: ${data.gender}
മതം: ${data.religion}
ജനന തീയതി: ${data.dateOfBirth}
ജനന സമയം: ${data.timeOfBirth}
ജനന സ്ഥലം: ${data.placeOfBirth}
നക്ഷത്രം: ${data.nakshatram || "(derive from birth details)"}

Produce a complete ${isPremium ? "PREMIUM (സമ്പൂർണ ജാതകം)" : "STANDARD"} Malayalam Vedic horoscope appropriate for a ${data.religion} family.`;

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

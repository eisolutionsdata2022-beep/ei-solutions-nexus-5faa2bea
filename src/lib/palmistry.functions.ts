import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { firebaseAuthMiddleware } from "./firebase-auth.middleware";

const inputSchema = z.object({
  // each image is a base64 data URL (data:image/png;base64,...)
  leftPalm: z.string().max(8_000_000).optional(),
  rightPalm: z.string().max(8_000_000).optional(),
  customerName: z.string().min(1).max(120),
  gender: z.enum(["Male", "Female", "Other"]),
  language: z.enum(["Malayalam", "English", "Hindi", "Both"]),
});

type Result =
  | {
      ok: true;
      reading: {
        lifeLine: string;
        headLine: string;
        heartLine: string;
        fateLine: string;
        marriageLine: string;
        wealthLine: string;
        careerOutlook: string;
        healthIndicators: string;
        personality: string;
        futureGrowth: string;
        marks?: string;
        comparison?: string;
      };
    }
  | { ok: false; error: string };

const palmTool = {
  type: "function",
  function: {
    name: "palm_reading",
    description: "Detailed palmistry reading from one or both palm photos.",
    parameters: {
      type: "object",
      properties: {
        lifeLine: { type: "string", description: "ആയുസ്സ് രേഖ analysis" },
        headLine: { type: "string", description: "ബുദ്ധി രേഖ analysis" },
        heartLine: { type: "string", description: "ഹൃദയ രേഖ analysis" },
        fateLine: { type: "string", description: "ഭാഗ്യ രേഖ analysis" },
        marriageLine: { type: "string", description: "വിവാഹ രേഖ analysis" },
        wealthLine: { type: "string", description: "ധന രേഖ analysis" },
        careerOutlook: { type: "string", description: "തൊഴിൽ സാധ്യത" },
        healthIndicators: { type: "string", description: "ആരോഗ്യ സൂചനകൾ" },
        personality: { type: "string", description: "വ്യക്തിത്വ വിശകലനം" },
        futureGrowth: { type: "string", description: "ഭാവി വളർച്ച സാധ്യത" },
        marks: { type: "string", description: "Notable palm marks/symbols (optional)" },
        comparison: {
          type: "string",
          description: "Left vs right hand comparison (only if both supplied)",
        },
      },
      required: [
        "lifeLine",
        "headLine",
        "heartLine",
        "fateLine",
        "marriageLine",
        "wealthLine",
        "careerOutlook",
        "healthIndicators",
        "personality",
        "futureGrowth",
      ],
      additionalProperties: false,
    },
  },
};

export const generatePalmistryReading = createServerFn({ method: "POST" })
  .middleware([firebaseAuthMiddleware])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }): Promise<Result> => {
    if (!context.authUser) return { ok: false, error: "Authentication required." };
    if (!data.leftPalm && !data.rightPalm) {
      return { ok: false, error: "At least one palm image is required." };
    }

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { ok: false, error: "AI palmistry is not configured. Please contact admin." };
    }

    const langInstruction =
      data.language === "Malayalam"
        ? "Respond entirely in Malayalam."
        : data.language === "English"
          ? "Respond entirely in English."
          : data.language === "Hindi"
            ? "Respond entirely in Hindi."
            : "Respond in BOTH Malayalam and English (Malayalam first, then English in parentheses).";

    const systemPrompt = `You are an experienced Indian palmistry expert (കൈരേഖ ശാസ്ത്രജ്ഞൻ) trained in traditional Hindu / South-Indian / Kerala palmistry methods.
Analyze the palm photo(s) carefully. Use ${data.gender} and Hindu palmistry conventions (males = right hand active, females = left hand active).
${langInstruction}
Each field must be 2–4 sentences, specific, encouraging but honest. Avoid disclaimers.
Always call the palm_reading tool — never plain text.`;

    const userContent: Array<any> = [
      {
        type: "text",
        text: `Customer: ${data.customerName} (${data.gender}). Provide a detailed traditional palmistry reading from these palm photo(s).`,
      },
    ];
    if (data.leftPalm) {
      userContent.push({ type: "image_url", image_url: { url: data.leftPalm } });
      userContent.push({ type: "text", text: "↑ Left palm" });
    }
    if (data.rightPalm) {
      userContent.push({ type: "image_url", image_url: { url: data.rightPalm } });
      userContent.push({ type: "text", text: "↑ Right palm" });
    }

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
          tools: [palmTool],
          tool_choice: { type: "function", function: { name: "palm_reading" } },
        }),
      });

      if (res.status === 429) return { ok: false, error: "Rate limit exceeded. Please retry shortly." };
      if (res.status === 402) return { ok: false, error: "AI credits exhausted. Please contact admin." };
      if (!res.ok) {
        const t = await res.text();
        console.error("Palmistry AI gateway error:", res.status, t);
        return { ok: false, error: "AI palmistry service is currently unavailable." };
      }

      const json = await res.json();
      const call = json.choices?.[0]?.message?.tool_calls?.[0];
      if (!call?.function?.arguments) {
        return { ok: false, error: "AI did not return a structured palm reading." };
      }
      const args = JSON.parse(call.function.arguments);
      return { ok: true, reading: args };
    } catch (err: any) {
      console.error("Palmistry request failed:", err);
      return { ok: false, error: err?.message || "Unexpected error during palm reading." };
    }
  });

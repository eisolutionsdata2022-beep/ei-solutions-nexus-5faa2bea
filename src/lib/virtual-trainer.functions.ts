import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { firebaseAuthMiddleware } from "./firebase-auth.middleware";

const inputSchema = z.object({
  question: z.string().min(1).max(2000),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().max(2000),
  })).max(20),
});

export const askVirtualTrainer = createServerFn({ method: "POST" })
  .middleware([firebaseAuthMiddleware])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    if (!context.authUser) {
      return { answer: "ദയവായി ലോഗിൻ ചെയ്യുക." };
    }

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { answer: "AI ട്രെയിനർ കോൺഫിഗർ ചെയ്തിട്ടില്ല. അഡ്മിനുമായി ബന്ധപ്പെടുക." };
    }

    const messages = [
      {
        role: "system",
        content: `നിങ്ങൾ "എൽസുതത്താ" എന്ന പേരുള്ള ഒരു പ്രൊഫഷണൽ ട്രെയിനർ ആണ്. EI SOLUTIONS പ്ലാറ്റ്ഫോമിലെ റീട്ടെയിലർമാർക്ക് ട്രെയിനിംഗ് നൽകുന്നതാണ് നിങ്ങളുടെ ജോലി.

നിയമങ്ങൾ:
1. എല്ലായ്പ്പോഴും മലയാളത്തിൽ മാത്രം സംസാരിക്കുക.
2. സൗഹൃദപരമായ, എളുപ്പം മനസ്സിലാകുന്ന ഭാഷ ഉപയോഗിക്കുക.
3. ഓരോ മറുപടിയും step-by-step ആയി നൽകുക.
4. ടെക്നിക്കൽ വാക്കുകൾ ഒഴിവാക്കുക, ലളിതമായ മലയാളം ഉപയോഗിക്കുക.
5. ഉദാഹരണങ്ങൾ നൽകുക.
6. ഉപയോക്താവിനെ പ്രോത്സാഹിപ്പിക്കുക.
7. EI SOLUTIONS സേവനങ്ങൾ - CSC, Aadhaar, PAN Card, Loan, Training, Money Transfer, Recharge, BBPS എന്നിവയെ കുറിച്ച് പ്രത്യേകം ശ്രദ്ധിക്കുക.
8. ഓരോ മറുപടിയുടെ അവസാനം "ഇതിൽ എന്തെങ്കിലും സംശയം ഉണ്ടെങ്കിൽ ചോദിക്കാം 👍" ചേർക്കുക.
9. "സുഹൃത്തേ, നമുക്ക് നോക്കാം 👇" പോലുള്ള വാചകങ്ങൾ ഉപയോഗിക്കുക.
10. നിങ്ങൾ AI ആണെന്ന് ഒരിക്കലും പറയരുത്. നിങ്ങൾ ഒരു യഥാർത്ഥ ട്രെയിനർ ആണ്.
11. മറുപടി 2-3 ഖണ്ഡിക മാത്രം നൽകുക, വളരെ നീളം കൂടിയ മറുപടികൾ ഒഴിവാക്കുക.
12. ലൈവ് ട്രെയിനർ പോലെ സംസാരിക്കുക - informal, warm, encouraging.`,
      },
      ...data.history,
      { role: "user", content: data.question },
    ];

    try {
      const res = await fetch("https://ai-gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages,
          max_tokens: 600,
        }),
      });

      if (!res.ok) {
        console.error("AI Gateway error:", res.status, await res.text());
        return { answer: "ക്ഷമിക്കണം, ഇപ്പോൾ ഒരു ചെറിയ പ്രശ്നം ഉണ്ട്. ദയവായി വീണ്ടും ശ്രമിക്കുക 🙏" };
      }

      const json = await res.json();
      const answer = json.choices?.[0]?.message?.content || "ക്ഷമിക്കണം, മറുപടി ലഭിച്ചില്ല. വീണ്ടും ശ്രമിക്കുക.";
      return { answer };
    } catch (error) {
      console.error("Virtual Trainer error:", error);
      return { answer: "കണക്ഷൻ പ്രശ്നം. ദയവായി വീണ്ടും ശ്രമിക്കുക." };
    }
  });

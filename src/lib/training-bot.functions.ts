import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { firebaseAuthMiddleware } from "./firebase-auth.middleware";

const inputSchema = z.object({
  question: z.string().min(1).max(2000),
  trainingTitle: z.string().min(1).max(500),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().max(2000),
  })).max(10),
});

export const askTrainingBot = createServerFn({ method: "POST" })
  .middleware([firebaseAuthMiddleware])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    if (!context.authUser) {
      return { answer: "Authentication required. Please log in again." };
    }

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { answer: "AI assistant is not configured. Please contact admin." };
    }

    const messages = [
      {
        role: "system",
        content: `You are a helpful AI training assistant for the session "${data.trainingTitle}". Help trainees with their doubts, explain concepts clearly, and provide useful information. Keep responses concise (2-3 paragraphs max). If you don't know the specific training content, provide general guidance and suggest they ask the trainer directly.`,
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
          max_tokens: 500,
        }),
      });

      if (!res.ok) {
        console.error("AI Gateway error:", res.status, await res.text());
        return { answer: "I'm having trouble right now. Please try again or ask the trainer directly." };
      }

      const json = await res.json();
      const answer = json.choices?.[0]?.message?.content || "I couldn't generate a response. Please try again.";
      return { answer };
    } catch (error) {
      console.error("AI Bot error:", error);
      return { answer: "Connection error. Please try again." };
    }
  });

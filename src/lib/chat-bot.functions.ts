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

export const askChatBot = createServerFn({ method: "POST" })
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
        content: `You are a helpful AI assistant for the EI Solutions portal — a CSC (Common Service Center) platform for e-governance and digital India services. Help users with:
- Navigating the portal (training, services, recharge, wallet, KYC)
- Understanding their dashboard features
- Training session queries
- Service-related questions
- General support

Keep responses concise (2-3 sentences). Be friendly and professional. If the user needs human support, suggest they switch to "Live Chat" to connect with admin/staff.`,
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
          max_tokens: 300,
        }),
      });

      if (!res.ok) {
        console.error("AI Gateway error:", res.status, await res.text());
        return { answer: "I'm having trouble right now. Please try again or switch to Live Chat." };
      }

      const json = await res.json();
      const answer = json.choices?.[0]?.message?.content || "I couldn't generate a response. Please try again.";
      return { answer };
    } catch (error) {
      console.error("Chat Bot error:", error);
      return { answer: "Connection error. Please try again." };
    }
  });

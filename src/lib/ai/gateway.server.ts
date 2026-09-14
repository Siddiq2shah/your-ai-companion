import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

import { isOpenAIModel } from "./models";

export const GATEWAY_BASE_URL = "https://ai.gateway.lovable.dev/v1";

export function lovableApiKey() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  return key;
}

/**
 * Provider resolution lives behind this single interface so that bring-your-own
 * OpenAI / Gemini keys can be added later without touching any calling code:
 * set OPENAI_API_KEY or GEMINI_API_KEY and the same model ids route directly.
 */
export function resolveChatModel(modelId: string): {
  model: LanguageModel;
  providerKey: "openai" | "lovable";
} {
  const bareId = modelId.split("/").slice(1).join("/");

  if (isOpenAIModel(modelId)) {
    const ownKey = process.env["OPENAI_API_KEY"];
    if (ownKey) {
      const openai = createOpenAI({ apiKey: ownKey });
      return { model: openai.responses(bareId), providerKey: "openai" };
    }
    const gateway = createOpenAI({
      baseURL: GATEWAY_BASE_URL,
      apiKey: lovableApiKey(),
      headers: {
        "Lovable-API-Key": lovableApiKey(),
        "X-Lovable-AIG-SDK": "vercel-ai-sdk",
      },
    });
    return { model: gateway.responses(modelId), providerKey: "openai" };
  }

  const geminiKey = process.env["GEMINI_API_KEY"];
  if (geminiKey) {
    const google = createOpenAICompatible({
      name: "lovable",
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
      apiKey: geminiKey,
    });
    return { model: google(bareId), providerKey: "lovable" };
  }

  const gateway = createOpenAICompatible({
    name: "lovable",
    baseURL: GATEWAY_BASE_URL,
    headers: {
      "Lovable-API-Key": lovableApiKey(),
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });
  return { model: gateway(modelId), providerKey: "lovable" };
}

/** Raw gateway chat-completions call, used for small utility generations. */
export async function gatewayJson(
  model: string,
  messages: Array<{ role: string; content: unknown }>,
  extra: Record<string, unknown> = {},
): Promise<string | null> {
  const res = await fetch(`${GATEWAY_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": lovableApiKey(),
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({ model, messages, ...extra }),
  });
  if (!res.ok) {
    console.error("gateway error", res.status, await res.text());
    return null;
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? null;
}

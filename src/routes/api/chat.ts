import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from "ai";
import { z } from "zod";

import { resolveChatModel } from "@/lib/ai/gateway.server";
import { generateImageToStorage } from "@/lib/ai/media.server";
import { DEFAULT_MODEL, DEFAULT_SYSTEM_MESSAGE, isOpenAIModel } from "@/lib/ai/models";
import { requireUser } from "@/lib/supabase-bearer.server";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if (!auth) return new Response("Unauthorized", { status: 401 });
        const { supabase, user } = auth;

        const body = (await request.json()) as {
          messages: UIMessage[];
          model?: string;
          systemMessage?: string;
        };

        const modelId = body.model ?? DEFAULT_MODEL;
        const { model, providerKey } = resolveChatModel(modelId);

        const { data: memories } = await supabase
          .from("memories")
          .select("kind, content")
          .order("updated_at", { ascending: false })
          .limit(60);

        const memoryBlock =
          memories && memories.length > 0
            ? `\n\nLong-term memory about the user (use silently when relevant):\n${memories
                .map((m) => `- [${m.kind}] ${m.content}`)
                .join("\n")}`
            : "";

        const system = `${body.systemMessage?.trim() || DEFAULT_SYSTEM_MESSAGE}${memoryBlock}`;

        try {
          const result = streamText({
            model,
            system,
            messages: convertToModelMessages(body.messages),
            abortSignal: request.signal,
            stopWhen: stepCountIs(8),
            tools: {
              generate_image: tool({
                description:
                  "Generate an image from a text description. Use only when the user asks for an image, picture, illustration or diagram to be created.",
                inputSchema: z.object({
                  prompt: z.string().describe("Detailed description of the image to create"),
                }),
                execute: async ({ prompt }) => {
                  const out = await generateImageToStorage(supabase, user.id, prompt);
                  if ("error" in out) return { error: out.error };
                  return { storagePath: out.path, prompt };
                },
              }),
            },
            ...(isOpenAIModel(modelId) && providerKey === "openai"
              ? {
                  providerOptions: {
                    openai: {
                      forceReasoning: true,
                      reasoningEffort: "low",
                      reasoningSummary: "auto",
                      store: false,
                      include: ["reasoning.encrypted_content"],
                    },
                  },
                }
              : {}),
          });

          return result.toUIMessageStreamResponse({
            sendReasoning: true,
            originalMessages: body.messages,
            onError: (error) => {
              console.error("chat stream error", error);
              return error instanceof Error ? error.message : "The assistant failed to respond.";
            },
          });
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") {
            return new Response(null, { status: 499 });
          }
          console.error(error);
          return new Response(
            error instanceof Error ? error.message : "The assistant failed to respond.",
            { status: 500 },
          );
        }
      },
    },
  },
});

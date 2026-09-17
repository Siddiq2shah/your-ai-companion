import { createFileRoute } from "@tanstack/react-router";

import { gatewayJson } from "@/lib/ai/gateway.server";
import { requireUser } from "@/lib/supabase-bearer.server";

const KINDS = ["preference", "project", "person", "decision", "instruction", "fact"];

export const Route = createFileRoute("/api/memory")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if (!auth) return new Response("Unauthorized", { status: 401 });
        const { supabase, user } = auth;

        const body = (await request.json()) as {
          conversationId?: string;
          exchange?: { user: string; assistant: string };
        };
        const exchange = body.exchange;
        if (!exchange?.user) return Response.json({ saved: 0 });

        const { data: existing } = await supabase
          .from("memories")
          .select("content")
          .order("updated_at", { ascending: false })
          .limit(60);

        const raw = await gatewayJson(
          "openai/gpt-6-astra",
          [
            {
              role: "system",
              content: `Extract durable, useful long-term facts about the user from a chat exchange.
Only save things worth remembering months later: preferences, ongoing projects, important people, decisions, recurring instructions, stable personal facts.
Ignore one-off questions, transient context and anything already known.
Known memories:
${(existing ?? []).map((m) => `- ${m.content}`).join("\n") || "(none)"}

Reply with JSON only: {"memories":[{"kind":"preference|project|person|decision|instruction|fact","content":"short sentence"}]}
Return an empty array when nothing is worth saving.`,
            },
            {
              role: "user",
              content: `User: ${exchange.user}\n\nAssistant: ${exchange.assistant?.slice(0, 4000) ?? ""}`,
            },
          ],
          { reasoning_effort: "low", response_format: { type: "json_object" } },
        );

        if (!raw) return Response.json({ saved: 0 });

        let parsed: { memories?: Array<{ kind?: string; content?: string }> } = {};
        try {
          parsed = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, ""));
        } catch {
          return Response.json({ saved: 0 });
        }

        const rows = (parsed.memories ?? [])
          .filter((m) => typeof m.content === "string" && m.content.trim().length > 3)
          .slice(0, 5)
          .map((m) => ({
            user_id: user.id,
            kind: KINDS.includes(m.kind ?? "") ? m.kind! : "fact",
            content: m.content!.trim(),
            source_conversation_id: body.conversationId ?? null,
          }));

        if (rows.length === 0) return Response.json({ saved: 0 });

        const { error } = await supabase.from("memories").insert(rows);
        if (error) console.error("memory insert failed", error);

        return Response.json({ saved: rows.length });
      },
    },
  },
});

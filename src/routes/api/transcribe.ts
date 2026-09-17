import { createFileRoute } from "@tanstack/react-router";

import { GATEWAY_BASE_URL, lovableApiKey } from "@/lib/ai/gateway.server";
import { requireUser } from "@/lib/supabase-bearer.server";

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if (!auth) return new Response("Unauthorized", { status: 401 });

        const incoming = await request.formData();
        const audio = incoming.get("audio");
        if (!(audio instanceof File)) {
          return Response.json({ error: "No audio provided" }, { status: 400 });
        }

        const form = new FormData();
        form.append("file", audio, audio.name || "recording.webm");
        form.append("model", "google/gemini-3.5-transcribe");

        const res = await fetch(`${GATEWAY_BASE_URL}/audio/transcriptions`, {
          method: "POST",
          headers: {
            "Lovable-API-Key": lovableApiKey(),
            "X-Lovable-AIG-SDK": "fetch",
          },
          body: form,
        });

        if (!res.ok) {
          const detail = await res.text();
          console.error("transcription failed", res.status, detail);
          return Response.json(
            { error: `Transcription failed (${res.status})` },
            { status: res.status },
          );
        }

        const data = (await res.json()) as { text?: string };
        return Response.json({ text: data.text ?? "" });
      },
    },
  },
});

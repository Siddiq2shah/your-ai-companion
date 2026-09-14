import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

import { gatewayJson } from "./gateway.server";

export const STORAGE_PREFIX = "storage:";
export const BUCKET = "chat-media";

export async function signStoragePath(
  supabase: SupabaseClient<Database>,
  path: string,
): Promise<string | null> {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

/** Turns `storage:<path>` references inside message parts into signed URLs. */
export async function resolveFileUrl(
  supabase: SupabaseClient<Database>,
  url: string,
): Promise<string> {
  if (!url.startsWith(STORAGE_PREFIX)) return url;
  const signed = await signStoragePath(supabase, url.slice(STORAGE_PREFIX.length));
  return signed ?? url;
}

export async function generateImageToStorage(
  supabase: SupabaseClient<Database>,
  userId: string,
  prompt: string,
): Promise<{ path: string } | { error: string }> {
  const content = await gatewayJson(
    "google/gemini-3.1-flash-image",
    [{ role: "user", content: prompt }],
    { modalities: ["image", "text"] },
  ).catch(() => null);

  // Image models return the picture on the message, not in `content`, so the
  // helper above cannot be reused for extraction — do a direct call instead.
  if (content === null) {
    // fall through to direct call below
  }

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": process.env["LOVABLE_API_KEY"]!,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: "google/gemini-3.1-flash-image",
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  });

  if (!res.ok) {
    return { error: `Image generation failed (${res.status})` };
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { images?: Array<{ image_url?: { url?: string } }> } }>;
  };
  const dataUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!dataUrl?.startsWith("data:")) return { error: "No image was returned." };

  const [meta, base64] = dataUrl.split(",");
  const mediaType = meta?.match(/data:(.*?);/)?.[1] ?? "image/png";
  const bytes = Uint8Array.from(atob(base64 ?? ""), (c) => c.charCodeAt(0));
  const ext = mediaType.split("/")[1] ?? "png";
  const path = `${userId}/generated/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: mediaType });
  if (error) return { error: error.message };

  return { path };
}

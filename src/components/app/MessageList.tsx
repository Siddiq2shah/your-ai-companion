import { useQuery } from "@tanstack/react-query";
import { BrainCircuit, FileText, Loader2 } from "lucide-react";
import type { FileUIPart, UIMessage } from "ai";

import {
  Message,
  MessageContent,
} from "@/components/ai-elements/message";
import { MessageResponse } from "@/components/ai-elements/message";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

/** Signs a `storage:`-backed generated image on the fly (owner-scoped). */
function GeneratedImage({ path }: { path: string }) {
  const { data: url, isLoading } = useQuery({
    queryKey: ["media", path],
    queryFn: async () => {
      const { data } = await supabase.storage
        .from("chat-media")
        .createSignedUrl(path, 60 * 60);
      return data?.signedUrl ?? null;
    },
  });

  if (isLoading || !url) {
    return (
      <div className="h-56 w-56 animate-pulse rounded-xl bg-muted" />
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer">
      <img
        src={url}
        alt="Generated image"
        className="max-h-96 max-w-full rounded-xl border shadow-sm"
      />
    </a>
  );
}

function Reasoning({ text }: { text: string }) {
  return (
    <details className="group rounded-lg border bg-secondary/50 text-sm">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground">
        <BrainCircuit className="h-3.5 w-3.5" />
        Thinking
        <Chevron className="ml-auto transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t px-3 py-2 text-muted-foreground">
        <MessageResponse>{text}</MessageResponse>
      </div>
    </details>
  );
}

function Chevron({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={cn("h-3.5 w-3.5", className)}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

type ToolLike = {
  state?: string;
  output?: { storagePath?: string; error?: string };
};

function renderPart(message: UIMessage, index: number) {
  const part = message.parts[index];
  const key = `${message.id}-${index}`;

  switch (part.type) {
    case "text":
      return <MessageResponse key={key}>{part.text}</MessageResponse>;
    case "reasoning":
      return part.text ? <Reasoning key={key} text={part.text} /> : null;
    case "file": {
      const file = part as FileUIPart;
      if (file.mediaType?.startsWith("image/")) {
        return (
          <img
            key={key}
            src={file.url}
            alt={file.filename ?? "Attached image"}
            className="max-h-80 max-w-full rounded-xl border object-contain"
          />
        );
      }
      return (
        <div
          key={key}
          className="flex items-center gap-2 rounded-lg border bg-secondary px-3 py-2 text-xs"
        >
          <FileText className="h-4 w-4 shrink-0" />
          <span className="truncate">{file.filename ?? "Attachment"}</span>
        </div>
      );
    }
    default: {
      if (typeof part.type === "string" && part.type.startsWith("tool-")) {
        const tool = part as ToolLike;
        if (tool.state === "output-available") {
          if (tool.output?.storagePath) {
            return <GeneratedImage key={key} path={tool.output.storagePath} />;
          }
          if (tool.output?.error) {
            return (
              <p key={key} className="text-sm text-destructive">
                {tool.output.error}
              </p>
            );
          }
          return null;
        }
        return (
          <p
            key={key}
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating image…
          </p>
        );
      }
      return null;
    }
  }
}

export function MessageList({
  messages,
  streaming,
}: {
  messages: UIMessage[];
  streaming: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      {messages.map((message, index) => {
        const isLast = index === messages.length - 1;
        const emptyAssistant =
          message.role === "assistant" &&
          !message.parts.some(
            (p) =>
              p.type === "text" ||
              p.type === "file" ||
              p.type === "reasoning" ||
              (typeof p.type === "string" && p.type.startsWith("tool-")),
          );
        if (emptyAssistant && !(streaming && isLast)) return null;
        return (
          <Message key={message.id} from={message.role}>
            <MessageContent>
              {message.parts.map((_, i) => renderPart(message, i))}
              {emptyAssistant && streaming && isLast && (
                <p className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.2s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.1s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
                </p>
              )}
            </MessageContent>
          </Message>
        );
      })}
    </div>
  );
}

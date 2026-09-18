"use client";

import { useRef, useState } from "react";
import { Loader2, Mic, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import type { ChatStatus, FileUIPart } from "ai";

import {
  PromptInput,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
  usePromptInputController,
} from "@/components/ai-elements/prompt-input";
import { authedFetch } from "@/lib/api-auth";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function AttachmentStrip() {
  const attachments = usePromptInputAttachments();
  if (attachments.files.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 px-3 pt-3">
      {attachments.files.map((file) => (
        <div key={file.id} className="group relative">
          {file.mediaType?.startsWith("image/") ? (
            <img
              src={file.url}
              alt={file.filename ?? "Attachment"}
              className="h-16 w-16 rounded-lg border object-cover"
            />
          ) : (
            <div className="flex h-16 max-w-32 items-center rounded-lg border bg-secondary px-3 text-xs">
              <span className="truncate">{file.filename ?? "File"}</span>
            </div>
          )}
          <button
            type="button"
            aria-label="Remove attachment"
            onClick={() => attachments.remove(file.id)}
            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background shadow"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

function AddAttachmentButton() {
  const attachments = usePromptInputAttachments();
  return (
    <PromptInputButton
      tooltip="Add images"
      onClick={() => attachments.openFileDialog()}
    >
      <PlusIcon className="size-4" />
    </PromptInputButton>
  );
}

function MicButton({ disabled }: { disabled?: boolean }) {
  const controller = usePromptInputController();
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        setTranscribing(true);
        try {
          const form = new FormData();
          form.append("audio", blob, "recording.webm");
          const res = await authedFetch("/api/transcribe", {
            method: "POST",
            body: form,
          });
          const data = (await res.json()) as { text?: string; error?: string };
          if (!res.ok || data.error) {
            throw new Error(data.error || "Transcription failed");
          }
          const text = (data.text ?? "").trim();
          if (!text) {
            toast.error("Nothing was heard — try again.");
          } else {
            const current = controller.textInput.value;
            controller.textInput.setInput(
              current ? `${current} ${text}` : text,
            );
          }
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : "Transcription failed",
          );
        } finally {
          setTranscribing(false);
        }
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch {
      toast.error("Microphone access is needed for voice input.");
    }
  };

  const stop = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  };

  return (
    <PromptInputButton
      tooltip={recording ? "Stop and transcribe" : "Voice input"}
      variant={recording ? "destructive" : "ghost"}
      disabled={disabled || transcribing}
      onClick={recording ? stop : start}
    >
      {transcribing ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Mic className="size-4" />
      )}
    </PromptInputButton>
  );
}

type Props = {
  status: ChatStatus;
  onStop: () => void;
  onSubmit: (text: string, files: FileUIPart[]) => Promise<void>;
  disabled?: boolean;
};

export function Composer({ status, onStop, onSubmit, disabled }: Props) {
  return (
    <PromptInputProvider>
      <PromptInput
        accept="image/*"
        multiple
        maxFileSize={MAX_FILE_SIZE}
        onSubmit={async ({ text, files }) => {
          if (!text.trim() && files.length === 0) return;
          await onSubmit(text, files as FileUIPart[]);
        }}
        onError={(error) => toast.error(error.message)}
      >
        <PromptInputBody>
          <AttachmentStrip />
          <PromptInputTextarea
            placeholder="Message your assistant…"
            disabled={disabled}
          />
          <PromptInputFooter>
            <PromptInputTools>
              <AddAttachmentButton />
              <MicButton disabled={disabled} />
            </PromptInputTools>
            <PromptInputSubmit status={status} onStop={onStop} />
          </PromptInputFooter>
        </PromptInputBody>
      </PromptInput>
    </PromptInputProvider>
  );
}

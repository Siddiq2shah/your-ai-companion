export type ModelVendor = "openai" | "google";

export type ChatModel = {
  id: string;
  label: string;
  vendor: ModelVendor;
  blurb: string;
};

export const CHAT_MODELS: ChatModel[] = [
  {
    id: "openai/gpt-6-astra",
    label: "GPT-6 Astra",
    vendor: "openai",
    blurb: "Most capable — deep reasoning and long work",
  },
  {
    id: "openai/gpt-5.5",
    label: "GPT-5.5",
    vendor: "openai",
    blurb: "Frontier reasoning and coding",
  },
  {
    id: "openai/gpt-5.4-mini",
    label: "GPT-5.4 Mini",
    vendor: "openai",
    blurb: "Fast and economical",
  },
  {
    id: "google/gemini-3.1-pro-preview",
    label: "Gemini 3.1 Pro",
    vendor: "google",
    blurb: "Strong reasoning with long context",
  },
  {
    id: "google/gemini-3.8-flash",
    label: "Gemini 3.8 Flash",
    vendor: "google",
    blurb: "Quick everyday answers",
  },
  {
    id: "google/gemini-3.1-flash-lite",
    label: "Gemini 3.1 Flash Lite",
    vendor: "google",
    blurb: "Fastest and cheapest",
  },
];

export const DEFAULT_MODEL = "openai/gpt-6-astra";

export function getModel(id: string): ChatModel {
  return CHAT_MODELS.find((m) => m.id === id) ?? CHAT_MODELS[0]!;
}

export function isOpenAIModel(id: string) {
  return id.startsWith("openai/");
}

export const DEFAULT_SYSTEM_MESSAGE =
  "You are a thoughtful personal AI assistant. Be direct, concrete and concise. Use markdown, tables and fenced code blocks when they make the answer clearer.";

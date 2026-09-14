# AI Apps Platform — App #1: Personal AI Assistant

A single-page private AI workspace with a left app rail (Assistant live, other apps as
"Coming soon" placeholders), built on a premium minimal SaaS look using your attached palette.

## Access

- Sign in with email/password or Google.
- An allowlist gate: only your email address is allowed in. Anyone else who signs in
  sees a "not authorized" screen and is signed out.
- Everything (chats, messages, settings, memory) is private to your account.

## Layout

```text
+------+--------------------+-------------------------------------+
| apps | chats              |  model v   settings   theme         |
| rail | search             |-------------------------------------|
|  A   | + New chat         |  conversation (streamed answers)     |
|  ..  | pinned             |                                     |
|  ..  | recent             |  [ message box | image | mic ]      |
+------+--------------------+-------------------------------------+
```

- Left rail: app switcher (Assistant + placeholder slots for future apps).
- Chat sidebar: new chat, search, pinned section, rename / pin / delete per chat.
- Mobile: rail and chat list collapse into slide-over drawers; composer stays fixed.
- Light and dark mode toggle, remembered per device.

## Chat experience

- Permanent conversation history; each chat has its own URL so reloads restore it.
- Streaming responses with a visible thinking state.
- Rendering for markdown, code blocks with copy, tables, links, and generated images.
- Composer inputs: text, image upload / paste / drag-and-drop, and voice recording that
  is transcribed to editable text before sending (audio itself is discarded).

## Models and settings

- Model dropdown listing OpenAI and Gemini models, served through Lovable AI.
- Next to it, a settings panel with a global system message editor plus Save and Reset.
- Each conversation stores the system message text in force when it was created, so old
  chats keep their original behavior.
- The AI layer is written as one provider interface, so your own OpenAI/Gemini keys can
  be plugged in later with no interface changes.

## Memory

- All chats stored permanently.
- Automatic long-term memory: after each exchange, useful facts are extracted and saved —
  preferences, projects, important people, decisions, recurring instructions. Saved
  memories are injected into later conversations, and a memory view lets you see them.

## Design

Palette from your image: yellow #FFFF33, pink #FF96FD, violet #7D5FFE, cyan #5BE7F6,
blue #0074FF, deep blue #0049DC, green #30E274, near-black #373435, off-white #FEFEFE.
Used as a restrained SaaS system: near-black/off-white base, #0074FF as primary action,
violet and green as accents, the brights reserved for app icons and small status marks.
Tokens defined once in the theme so light and dark both derive from them.

## Technical notes

- Lovable Cloud provides auth, database and storage.
- Tables: `profiles`, `conversations` (title, pinned, system_message_snapshot, model),
  `messages` (role, parts, attachments), `user_settings` (system message, default model,
  theme), `memories` (kind, content, source chat). RLS scoped to the owner on all of them.
- Chat streaming runs through a server route calling the Lovable AI Gateway; keys stay
  server-side. Image uploads go to a private storage bucket; voice audio is transcribed
  server-side and never stored.
- Memory extraction runs server-side after a completed response.

## Build order

1. Cloud setup, auth + allowlist gate, schema and policies.
2. Shell: app rail, chat sidebar, theme, design tokens.
3. Streaming chat with markdown/code/table rendering.
4. Chat management: search, rename, pin, delete.
5. Model dropdown, system message settings, per-chat snapshot.
6. Image input, voice input, image output.
7. Automatic long-term memory and memory view.

# Your AI Companion

Build a modern web platform for AI apps. For now, fully develop App #1: Personal AI Assistant. It should be a 1 page only, with placeholders for more apps. There should be a navigation bar on the left listing all the apps.

Core experience

Create a private, responsive AI chatbot with:

Secure login

New chats and permanent conversation history

Search, rename, pin and delete chats

Streaming responses

Markdown, code, tables and links

Light and dark mode

Desktop and mobile layouts

The platform should support more AI apps later through an app switcher.

For now, only I should be able to use the app.

AI models

Add a model dropdown with OpenAI and Gemini models through Lovable AI.

Structure the AI layer so I can later add my own OpenAI and Gemini API keys without changing the interface.

Inputs and outputs

Support:

Text input

Image upload, paste and drag-and-drop

Voice recording with transcription and editing before sending

The assistant can output:

Text

Markdown

Code

Tables

Generated images

System message

Create a settings component next to the model dropdown where I can write and save a global system message.

Include:

System message editor

Save and reset buttons

Each conversation should store the system message version used when it was created.

Memory

Store all chats permanently.

Also create long-term memory that saves useful information from previous chats, such as:

Preferences

Projects

Important people

Decisions

Recurring instructions

Design

Use a premium, minimal SaaS design with colors attached

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8b187e95-591e-4631-ae89-0bf5b3bb97c6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

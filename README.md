This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Avatar conversation flow

HeyGen handles recognition, answers and voice in FULL mode using the configured
`LIVEAVATAR_VOICE_AGENT_ID` (or `VOICE_AGENT_ID`). The server uses
`LIVEAVATAR_API_KEY` (or `API_KEY`); keys never go to the browser.
A voice ID selects a voice; a voice agent ID selects the conversational agent.
/* progress step 3 */
Model choice is a latency decision. Measured on this machine's 4GB T1200, answering
"Where is your Bangalore office?" from the knowledge base:

| Model | GPU offload | Decode | Time per answer |
| --- | --- | --- | --- |
| `qwen3:0.6b` | 100% GPU | 22.6 tok/s | **~1.43s** (in use) |
| `qwen3:1.7b` | 29/29 layers, 100% GPU | 12.2 tok/s | ~2.25s |
| `qwen3:4b` | 26/37 layers, 73% GPU | 5.5 tok/s | ~57s |

`qwen3:0.6b` is the default, chosen for latency. The trade is wording quality: it will
sometimes answer a question that needs a small inference ("Are you open on Sunday?" against
a Mon–Fri entry) by asking a question back instead of answering. `qwen3:1.7b` is steadier
on those and costs about 0.8s more — one edit to `OLLAMA_MODEL` plus a dev restart.

Two guards in `lib/llm.ts` exist specifically because of 0.6b, and should stay if the model
is changed again:

- `stripEchoedQuestion()` — 0.6b opens replies by repeating the question ("Do you have an
  office in Mumbai? I don't have that information."), which the avatar would speak aloud.
  When the reply is *only* the repeated question it returns empty, and the route speaks
  `FALLBACK_SPOKEN_REPLY` rather than letting the avatar parrot the shopper.
- The few-shot example in `lib/knowledgePrompt.ts` must demonstrate **answering**, not
  refusing. An earlier version used a refusal as the example and 0.6b copied it wholesale,
  claiming ignorance of facts that were sitting in the retrieved knowledge.

The 4B model does not fit in 4GB alongside the KV cache, so a third of it runs on the CPU.
Since answers are grounded in retrieved knowledge, the smaller model is reciting supplied
facts rather than recalling them from training, which is why 1.7B is enough here. On a
larger GPU, raise `OLLAMA_MODEL` to `qwen3:4b` or `qwen3:8b`.

**Thinking must stay suppressed.** Qwen3 is a hybrid reasoning model and the avatar speaks
whatever text it is handed, so deliberation must never reach it. Two defences, both needed:
`/no_think` in the system prompt stops it being generated, and `stripReasoning()` in
`lib/llm.ts` removes it if it appears anyway. Note that Ollama's `think: false` alone was
*not* sufficient here — the model still deliberated, in plain text, and took 49s instead of
15s for a one-line greeting. The reply also arrives with a *dangling* `</think>` and no
opening tag, because the chat template supplies the opener; a stripper that only matches
balanced pairs would let the entire monologue through to the avatar's mouth.

### Latency

Measured end to end through `/api/chat`, warm: **~1.8s**, and it breaks down as

| Phase | Time |
| --- | --- |
| knowledge retrieval (Postgres) | ~5ms |
| prefill (~235 prompt tokens) | ~90ms |
| **decode (~18 output tokens)** | **~1700ms** |

Decode is ~98% of it and its cost is linear in tokens generated, so **answer length is the
latency dial**. Tightening the prompt from "2-4 sentences" to "one sentence, max 40 words"
took a measured 3545ms to 2148ms on its own; `num_predict` is capped at 80 to stop a
runaway answer becoming a runaway wait.

Things that were measured and turned out *not* to be the problem, so they are not worth
revisiting:

- **Docker vs native Ollama** — 22.6 vs 22.5 tok/s on the same model. WSL2 GPU passthrough
  costs nothing here; running in Docker is free.
- **`localhost` vs `127.0.0.1` from Node** — 2-8ms either way. No IPv6 resolution penalty.
- **Flash attention** — neutral on this Turing card. Left on; it frees KV-cache VRAM.

What remains is the GPU. 12 tok/s for a 1.7B model fully resident is simply what a 4GB
T1200 does; a larger card is the only way past it without shrinking the model.

Two settings exist purely to avoid *cold* latency, which is far worse than the steady
state: `OLLAMA_KEEP_ALIVE=-1` keeps the model resident indefinitely (the default drops it
after 5 minutes idle, so the first question after any pause paid a multi-second reload),
and `warmUpModel()` is fired from the session-token route so the model loads while HeyGen
is still bringing up the video stream.

### Who answers

`AVATAR_BRAIN` in `.env` decides:

- `local` (default) — this app answers, grounded in `avatar_knowledge`. HeyGen's agent is
  started without a context so it does not reply on its own.
- `heygen` — HeyGen's agent answers from `LIVEAVATAR_CONTEXT_ID`, as it did before the
  knowledge base existed. The database knowledge is unused in this mode.

`app/constants/knowledge.ts` is retained as a backup and is read by nothing but the import
script. Adding knowledge there has no effect on the avatar.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
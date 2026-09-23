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

Start the local data services:

```bash
docker compose up -d db redis
npx prisma migrate dev
npm run dev
```

Persona drafts are saved to PostgreSQL. **Publish to avatar** snapshots the intro,
persona, instructions and every saved ingest source with usable text into Docker Redis.
It creates an immutable HeyGen context with the intro as `opening_text` and the persona,
instructions and complete source text in `prompt`. Failed or unextracted sources are
listed as excluded; content is not silently truncated.

New sessions read the active context ID from Redis and use the supported inline
`avatar_persona` FULL-mode configuration, preserving the configured LiveAvatar agent's
voice, model, language and speech settings. The stored agent itself is not modified.
Redis is required for session startup, so a cache outage cannot silently drop your context.
Publishing errors leave the previous version active. Repeating an identical publication
reuses its context. Reconnect after publishing; publish again after adding/removing sources.
No manual prompt-variable setup is needed.

[LiveAvatar session token API](https://docs.liveavatar.com/api-reference/sessions/create-session-token)

## Learn More

To learn more about Next.js, take a look at the following resources:

/* progress step 6 */
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
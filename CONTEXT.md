# Architecture Context

How this application is actually put together, as of 2026-09-19. Read this before
touching the avatar, the turn pipeline or the Redis layer.

Where something is unverified, it says so. Nothing in here is asserted from assumption.

---

## 1. The architecture in one picture

```
                 ┌────────────────────────────┐
                 │      HeyGen LiveAvatar     │
  shopper mic ──▶│  STT → LLM → TTS → avatar  │──▶ video + audio
                 └─────────────┬──────────────┘
                               │  SDK events (LiveKit)
                               ▼
                 ┌────────────────────────────┐
                 │      This Next.js app      │
                 │  turn state · buffer       │
                 │  Redis · memory · persona  │
                 │  catalogue · retrieval     │
                 │  persistence · admin       │
                 └────────────────────────────┘
```

**HeyGen owns the LLM and the voice.** The shopper's microphone goes straight to HeyGen
over LiveKit. HeyGen transcribes, decides the answer and speaks it. This application
never generates the avatar's reply.

The app's job is everything around that conversation: identifying turns, tracking their
lifecycle, handling barge-in, preparing context, remembering, persisting and reporting.

---

## 2. Gemini is not in the conversation path

`GEMINI_API_KEY` is **not required** for any part of the avatar working: session start,
speech capture, the answer, the audio, playback, or the buffer.

This was already true before the refactor, which is worth stating plainly because the
code suggested otherwise. `/api/agent/stream` previously ran a complete
Gemini → text pipeline, but **nothing ever called it** — verified by grepping the whole
tree, where the only references were Next's own generated `.next/types` files. The
avatar has always talked to HeyGen directly from `AvatarPanel`.

**Gemini retained (isolated, optional):** `app/api/chat/route.ts` and
`app/constants/knowledge.ts`. These are leftovers from a different product (a "DevKit
Market" assistant) and are not wired to anything in this app. They are kept, not
deleted, because removing an unrelated route was outside the brief — but they gate
nothing. If `GEMINI_API_KEY` is absent, that route returns 500 and the avatar is
unaffected.

**Gemini removed:** the entire LLM pipeline in `/api/agent/stream`, and the dead client
helper `components/lib/gemini.ts`.

---

## 3. What the HeyGen SDK actually supports

Read from `node_modules/@heygen/liveavatar-web-sdk/lib/**/*.d.ts` at version `0.0.18`,
not from memory. This is the contract the implementation is built against.

| SDK method | Command emitted | What it does |
| --- | --- | --- |
| `repeat(text)` | `avatar.speak_text` | speaks literal text, **bypassing the LLM** |
| `message(text)` | `avatar.speak_response` | routes text **through** HeyGen's LLM |
| `repeatAudio(b64)` | `avatar.speak_audio` | plays supplied audio |
| `interrupt()` | `avatar.interrupt` | barge-in |
| `startListening()` / `stopListening()` | `avatar.start_listening` / `stop_listening` | mic gating |

Inbound events used: `USER_TRANSCRIPTION` (final), `USER_TRANSCRIPTION_CHUNK`
(partial), `USER_SPEAK_STARTED`, `AVATAR_SPEAK_STARTED`, `AVATAR_SPEAK_ENDED`,
`AVATAR_TRANSCRIPTION`, `SESSION_STOPPED`, `SESSION_STREAM_READY`,
`SESSION_DISCONNECTED`.

### Known limitation: no per-turn context injection

For `AgentType.FULL` there is **no API to push application context into HeyGen's LLM
mid-conversation**. Knowledge is bound when the session token is minted, via
`avatar_persona` and `context_id` on `POST /v1/sessions/token`.

Only `ElevenLabsAgentSession` exposes `sendContextualUpdate()`, and that path refuses
`message`/`repeat`/`repeatAudio` entirely.

So the retrieval infrastructure below **prepares** context and does not pretend to
inject it. The context packet is built, budgeted, cached and reported for diagnostics
and turn records, ready for whichever injection mechanism the integration gains. It is
not quietly fed to a second LLM.

---

## 4. Turn lifecycle

Every shopper utterance is one turn with a unique `turnId`.

```
RECEIVED → BUFFER_STARTED → CONTEXT_READY → ANSWER_STARTED → ANSWER_COMPLETED → SAVED
    └──────────────┴────────────────┴──────────────┬──────────┘
                                                   ▼
                                        INTERRUPTED / FAILED → SAVED
```

Defined in [lib/agent/turnState.ts](lib/agent/turnState.ts). Invalid transitions are
refused and reported, not silently applied.

Two failure modes this exists to prevent:

1. **Double-speak** — a buffer or answer firing twice for one utterance.
2. **Zombie completion** — a delayed callback from an interrupted turn arriving late and
   marking it `ANSWER_COMPLETED` after the next turn already began. `INTERRUPTED` and
   `FAILED` can only progress to `SAVED`, so this is structurally impossible rather than
   a matter of timing.

### Partial vs final

| | Partial (`USER_TRANSCRIPTION_CHUNK`) | Final (`USER_TRANSCRIPTION`) |
| --- | --- | --- |
| Opens a turn | no | yes |
| Fires the buffer | no | yes |
| Retrieval / context | no | yes |
| Redis or DB write | no | yes |
| Network call | no | yes |

Duplicate finals are collapsed twice over: synchronously on the client by event id, and
on the server by a 3-second-windowed fingerprint in Redis.

---

## 5. Buffer architecture

The buffer is the short filler ("Hmm…", "Give me a second…") that puts sound in the room
before the real answer.

**It depends on nothing.** [lib/agent/buffer.ts](lib/agent/buffer.ts) is synchronous and
imports only two constant files — no Redis, no Postgres, no retrieval, no page index, no
LLM, no network. This is enforced by a test that disables `global.fetch` and asserts
selection still works.

Delivery is HeyGen-native and always LLM-bypassing:

- `avatar.speak_audio` (`repeatAudio`) when pre-generated audio is registered
- `avatar.speak_text` (`repeat`) otherwise

`avatar.speak_response` (`message`) is deliberately never used for the buffer — it would
route through HeyGen's LLM and produce a second answer.

### Ordering

On the client, the order inside `onFinalTranscript` is: dedupe check (in-memory, free) →
speak the buffer → *then* report to the server. Verified by a test asserting the speak
call is observed before any network call.

On the server, `/api/agent/stream` emits `turn.started` and `buffer` on the first SSE
frame before awaiting anything. A consequence worth knowing: the server emits its buffer
event *before* the Redis dedupe check, so a duplicate request still produces a server
`buffer` event (then `duplicate`, and no turn is opened). This is intentional — moving
dedupe first would make the buffer wait on Redis. The guard that actually prevents
double-speak is the client's synchronous one, because the client is where speak commands
are issued.

### Buffer speaking is OFF by default

`TurnManager` selects and reports the buffer always, but only *speaks* it when
`NEXT_PUBLIC_AVATAR_BUFFER=on`.

**Why:** in FULL mode HeyGen answers every utterance itself. A client-side filler plus
HeyGen's own reply is two utterances for one question. Whether they interleave acceptably
cannot be confirmed without a live billable session, so this ships opt-in rather than on
an assumption. Selection, delivery and single-fire behaviour are fully implemented and
tested; only the live interleaving is unverified.

`BUFFER_AUDIO_MANIFEST` in [app/constants/bufferAudio.ts](app/constants/bufferAudio.ts)
is currently **empty**, so every buffer resolves to `speak_text`. `bufferAudioReady()`
reports this honestly. To enable cached audio, drop files at
`public/audio/buffers/<audioKey>.wav|.mp3` and register the URLs.

---

## 6. Redis

[lib/redis.ts](lib/redis.ts) is the single Redis abstraction. Upstash REST over `fetch`,
so there is no extra client dependency and no socket to hold across serverless
boundaries.

### Keys and TTLs

| Key | TTL | Invalidated by |
| --- | --- | --- |
| `persona:default` | 24h | `PATCH /api/persona` |
| `catalogue:index:v1` | 1h | SKU create / update / delete |
| `pageindex:latest:summary` | 1h | `POST /api/ingest/index` |
| `queryctx:{hash}` | 10m | TTL only |
| `session:{id}:memory` | 2d | rolling, last 8 turns |
| `session:{id}:turns` | 2d | rolling |
| `session:{id}:lock` | 20s | released by owner |
| `session:{id}:turn:{turnId}` | 30m | TTL only |
| `session:{id}:dedupe:{fingerprint}` | 2m | TTL only |
| `shopper:{fingerprint}:memory` | 2d | rolling |

### Locking

`SET key token EX ttl NX` to acquire; release and renew go through a Lua `EVAL` that
compares the token before acting. This is what makes it safe: a slow request whose lock
already expired **cannot** delete the lock its successor now holds. Tested explicitly.

### The fallback is not Redis, and never claims to be

When Redis is unconfigured or unreachable, the module degrades to a process-local `Map`
and says so:

- one clear `console.warn` naming exactly what is lost
- `redisStatus().backend === 'memory'`
- `redisStatus().distributedLocking === false`
- every lock handle carries `distributed: false`
- the admin dashboard tile reads *"in-memory fallback, locks are process-local"* and is
  never coloured green

Two workers on the fallback do **not** share state. Callers needing real mutual exclusion
must check the flag rather than assume it.

### Cross-shopper safety

`queryctx:{hash}` is derived from the utterance **alone** and contains only catalogue and
document matches. Session memory is read per session and never enters a shared key, so
one shopper's memory cannot be served to another. Tested.

---

## 7. Database vs Redis

| Postgres | Redis |
| --- | --- |
| conversation records, completed turns | hot turn state |
| audit / activity log | session + shopper memory |
| persona persistence | locks and dedupe markers |
| catalogue, sources, page-index metadata | retrieval and persona cache |

No audio is stored in Postgres. Transcript turns are persisted via the existing batched
`useConversationRecorder` → `POST /api/sessions/{id}/turns` path, which was already
working and is untouched.

Note on identity: Redis runtime state is keyed by HeyGen's `session.sessionId`; the
Postgres record has its own id and stores `avatarSessionId`, so the two join on that.

---

## 8. `/api/agent/stream`

No longer an LLM endpoint. It owns transcript event handling, turn creation, buffer
emission, Redis state, context preparation, lifecycle transitions, interruption,
persistence hooks and diagnostics.

`POST` body: `{ sessionId, turnId?, text?, action }` where action is
`partial | final | interrupt | answer_started | answer_completed`.

SSE events: `turn.started`, `buffer`, `runtime`, `context`, `turn.ready`, `turn.state`,
`interrupt`, `duplicate`, `busy`, `rejected`, `ignored`, `error`. Every event carries
`requestId`, and where applicable `sessionId`, `turnId` and timestamps.

`GET` returns runtime diagnostics: role, who owns the LLM and voice, `geminiRequired:
false`, and the real Redis status.

---

## 9. Latency and observability

Stamps recorded per turn: `transcriptReceivedAt`, `bufferRequestedAt`, `bufferStartedAt`,
`contextStartedAt`, `contextReadyAt`, `answerStartedAt`, `firstAudioAt`,
`answerCompletedAt`, `interruptedAt`, `persistedAt`.

`measureTurn()` derives: transcript→buffer, transcript→answer, transcript→first audio,
context duration, answer duration, total.

Correlation: `sessionId` + `turnId` + `requestId` on every event. No secrets are logged —
not the API key, session token, or any signed URL.

---

## 10. LiveAvatar configuration

Resolved in [lib/liveavatarConfig.ts](lib/liveavatarConfig.ts), a pure module with no
Next or Prisma imports so it stays independently testable.

| Configured | `avatar_source` | `avatar_id` sent | `is_sandbox` |
| --- | --- | --- | --- |
| `LIVEAVATAR_AVATAR_ID` | `LIVEAVATAR_AVATAR_ID` | the configured avatar | omitted |
| context only | `LIVEAVATAR_CONTEXT_ID` | sandbox | `true` |
| neither | `sandbox-default` | sandbox | `true` |

Sandbox mode is **never** inferred from the absence of a context id. `readEnv()` trims
whitespace, strips surrounding quotes, and treats `VAR=` as unset.

Diagnostics logged on every mint:

```
LiveAvatar configuration: avatar source = LIVEAVATAR_AVATAR_ID, avatar configured = true,
context configured = false, sandbox = false, mode = FULL
```

---

## 11. Persona

One authoritative source: the single `avatar_personas` row keyed `default`, edited at
`/admin/persona`, served by `/api/persona`, cached in Redis under `persona:default` and
invalidated on save. Defaults live only in [lib/persona.ts](lib/persona.ts).

Persona is data, not an LLM dependency. It is available to whichever HeyGen mechanism
can accept it — today, the token-mint payload (see the limitation in §3).

---

## 12. Environment variables

**Required**

| Variable | Why |
| --- | --- |
| `LIVEAVATAR_API_KEY` | minting session tokens; without it the avatar cannot start |
| `DATABASE_URL` | Postgres: conversations, catalogue, persona, audit |

**Recommended**

| Variable | Why |
| --- | --- |
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | shared runtime state and real distributed locking; without both, the in-memory fallback is used and says so |
| `LIVEAVATAR_AVATAR_ID` | your avatar; without it the sandbox avatar is used |

**Optional**

| Variable | Why |
| --- | --- |
| `LIVEAVATAR_CONTEXT_ID` | HeyGen-side context configuration |
| `LIVEAVATAR_AUDIO_API_KEY` | only used in `LITE` mode |
| `NEXT_PUBLIC_AVATAR_BUFFER` | `on` enables client-side buffer speech (default off, see §5) |
| `GEMINI_API_KEY` | **only** for the isolated `/api/chat` route; nothing in the avatar path needs it |

No secret is exposed to the browser. The only `NEXT_PUBLIC_` variable is a feature flag.

---

## 13. Test results

Run 2026-09-19. Pure modules compiled with the project's own strict `tsconfig` path
aliases and exercised directly.

| Suite | Result |
| --- | --- |
| Redis: fallback honesty, set/get/del, TTL expiry, cache hit/miss/invalidate, lock ownership, non-owner release refused, deadlock expiry, renew, dedupe, session isolation, capped append | **31 / 31** |
| Turn lifecycle: legal + illegal transitions, zombie completion, latency maths, fingerprinting, TurnManager partial/final/duplicate/empty/happy-path/barge-in/supersede/buffer-off/reset | **63 / 63** |
| Avatar config (7 env shapes), safe diagnostics, buffer independence + determinism + ordering, context scoring/limits/budgets, cache-key isolation | **39 / 39** |
| **Total** | **133 / 133** |

Route-level, against a running dev server:

| Case | Result |
| --- | --- |
| `GET /api/agent/stream` diagnostics | `geminiRequired: false`, `backend: memory` |
| Partial transcript | `ignored: partial_transcript`, no work done |
| Empty transcript | `ignored: empty_transcript` |
| Final transcript, **no Gemini key** | buffer at **+1ms**, context at +21ms, turn opened |
| Duplicate final | `duplicate`, no second turn |
| answer_started → answer_completed | `ANSWER_STARTED` → `ANSWER_COMPLETED`, latency measured |
| Interrupt then late completion | `rejected: illegal transition INTERRUPTED -> ANSWER_COMPLETED` |
| Unknown turn id | `ignored: unknown_turn` |

Pages, all `200`: `/` 61ms · `/admin/persona` 89ms · `/admin/ingest` 73ms ·
`/admin/conversations` 149ms · `/admin/dashboard` 102ms · `/admin/catalogue` 98ms ·
`/admin/activelog` 319ms · `/admin/memory` 98ms · `/api/persona` 86ms.

`npm run lint` — 0 errors, 1 pre-existing unrelated warning in
`app/api/retrieve/route.ts`. `tsc --noEmit` — clean. `npm run build` — compiles, with 3
pre-existing unrelated Turbopack warnings from `lib/storage.ts`.

### Bugs found by these tests

1. **`tokenize()` dropped every ≤2-character token**, making `M6`, `M8`, `A2` — the part
   codes this fastener catalogue is built on — permanently unsearchable. Pre-existing.
   Fixed: short tokens are kept when they contain a digit.
2. **Double `controller.close()`** in the duplicate and busy branches of
   `/api/agent/stream` threw and aborted the SSE stream, so clients received nothing.
   Introduced during this refactor; fixed.
3. **The empty-transcript guard rejected `answer_started` / `answer_completed`**, which
   legitimately carry no text. Introduced during this refactor; fixed.

---

## 14. Known gaps and unverified areas

- **No live LiveAvatar session was started** — that is billable. Everything up to the
  HeyGen boundary is verified; the HeyGen side of the wire is not.
- **Buffer interleaving with HeyGen's FULL-mode reply is unverified.** Hence
  `NEXT_PUBLIC_AVATAR_BUFFER` defaulting off.
- **Redis has only been exercised on the in-memory fallback**, since no Upstash
  credentials are configured here. The Redis code paths (`SET NX`, Lua `EVAL` release and
  renew) are written against the Upstash REST contract but have **not** been run against
  a live instance.
- **Context injection into HeyGen's LLM is not implemented** because the SDK exposes no
  mechanism for `AgentType.FULL`. Retrieval is built and budgeted, not wired.
- **Database-unavailable and HeyGen-unavailable failure modes were reasoned about, not
  simulated.** The orchestration route catches and isolates support-side failures, and
  the buffer provably precedes any DB call, but neither outage was induced.
- `shopper:{fingerprint}:memory` has a key and a TTL but nothing writes to it yet — no
  shopper fingerprinting exists.
- `/api/chat`, `/api/retrieve` and `app/constants/knowledge.ts` remain unused by any
  client.

---

## 15. Running it

```bash
npm run dev
```

Then: `http://localhost:3000` for the avatar, `http://localhost:3000/admin/dashboard`
for service health.

Check the pipeline without starting a billable session:

```bash
curl -s http://localhost:3000/api/agent/stream
```

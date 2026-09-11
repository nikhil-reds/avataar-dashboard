import { NextResponse } from 'next/server';
import { RUBENIUS_KNOWLEDGE } from '../../constants/knowledge';

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

const SYSTEM_PROMPT = `You are Rubenius, an AI assistant for DevKit Market — a marketplace for production-ready starter kits and developer tools built by Nikhil Anand.

You have access to the full DevKit Market knowledge base below. Use it to answer questions accurately. When a user asks about products, pricing, or the creator, refer to this data.

Keep answers concise (2–4 sentences). Give direct, developer-friendly answers — no fluff, no upselling.

KNOWLEDGE BASE:
${JSON.stringify(RUBENIUS_KNOWLEDGE, null, 2)}`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

  let message: string;
  let history: ChatMessage[] = [];
  try {
    ({ message, history = [] } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Gemini uses "model" for assistant turns
  const contents = [
    ...history.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    { role: 'user', parts: [{ text: message }] },
  ];

  const res = await fetch(
    `${GEMINI_API_BASE}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 512,
        },
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: text }, { status: res.status });
  }

  const data = await res.json();
  const response = data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No response generated.';

  return NextResponse.json({ response });
}

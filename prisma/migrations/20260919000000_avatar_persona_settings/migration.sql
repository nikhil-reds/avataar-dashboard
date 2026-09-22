CREATE TABLE "avatar_personas" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL DEFAULT 'default',
    "openingIntro" TEXT NOT NULL,
    "persona" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "avatar_personas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "avatar_personas_key_key" ON "avatar_personas"("key");

INSERT INTO "avatar_personas" (
    "id",
    "key",
    "openingIntro",
    "persona",
    "instructions",
    "updatedAt"
) VALUES (
    '00000000-0000-4000-8000-000000000001',
    'default',
    'Hello, welcome to Trifast. I can help with fastener specifications, materials, stock and lead times.',
    'A calm, knowledgeable Trifast product specialist who speaks clearly, asks useful follow-up questions and keeps answers practical for buyers and engineers.',
    'Answer from the approved catalogue and indexed supplier documents. Keep responses concise, confirm important part numbers, and avoid guessing when product data is missing.',
    CURRENT_TIMESTAMP
);

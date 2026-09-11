-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'OPERATOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "SkuState" AS ENUM ('LIVE', 'REVIEW', 'DRAFT');

-- CreateEnum
CREATE TYPE "LogKind" AS ENUM ('CHAT', 'RENDER', 'INGEST');

-- CreateEnum
CREATE TYPE "IngestJobState" AS ENUM ('QUEUED', 'EXTRACTING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "ReviewVerdict" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RenderState" AS ENUM ('QUEUED', 'RENDERING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('LIVE', 'ENDED', 'ERROR');

-- CreateEnum
CREATE TYPE "SpeakerRole" AS ENUM ('SHOPPER', 'AVATAR', 'SYSTEM');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'OPERATOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_skus" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "weight" TEXT,
    "makingCharge" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "supplier" TEXT,
    "talkingPoints" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source" TEXT NOT NULL DEFAULT 'Manual',
    "state" "SkuState" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_skus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "session" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "latency" TEXT NOT NULL,
    "kind" "LogKind" NOT NULL,
    "status" TEXT NOT NULL,
    "cost" DECIMAL(8,2),
    "tokensIn" INTEGER,
    "tokensOut" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingest_jobs" (
    "id" TEXT NOT NULL,
    "file" TEXT NOT NULL,
    "state" "IngestJobState" NOT NULL DEFAULT 'QUEUED',
    "pct" TEXT NOT NULL DEFAULT '0%',
    "note" TEXT,
    "page" INTEGER NOT NULL DEFAULT 1,
    "totalPages" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingest_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extracted_rows" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "conf" TEXT NOT NULL,
    "fields" JSONB NOT NULL,
    "verdict" "ReviewVerdict" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "extracted_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avatar_renders" (
    "id" TEXT NOT NULL,
    "script" TEXT NOT NULL,
    "voice" TEXT NOT NULL,
    "length" TEXT,
    "state" "RenderState" NOT NULL DEFAULT 'QUEUED',
    "videoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "avatar_renders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopper_sessions" (
    "id" TEXT NOT NULL,
    "avatarSessionId" TEXT,
    "title" TEXT,
    "summary" TEXT,
    "status" "SessionStatus" NOT NULL DEFAULT 'LIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "durationSec" INTEGER,
    "turnCount" INTEGER NOT NULL DEFAULT 0,
    "lastTurnAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "locale" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shopper_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_turns" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "eventId" TEXT NOT NULL,
    "who" "SpeakerRole" NOT NULL,
    "text" TEXT NOT NULL,
    "spokenAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_turns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retained_facts" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retained_facts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "product_skus_sku_key" ON "product_skus"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "shopper_sessions_avatarSessionId_key" ON "shopper_sessions"("avatarSessionId");

-- CreateIndex
CREATE INDEX "shopper_sessions_startedAt_idx" ON "shopper_sessions"("startedAt" DESC);

-- CreateIndex
CREATE INDEX "shopper_sessions_status_startedAt_idx" ON "shopper_sessions"("status", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "shopper_sessions_turnCount_idx" ON "shopper_sessions"("turnCount" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "session_turns_eventId_key" ON "session_turns"("eventId");

-- CreateIndex
CREATE INDEX "session_turns_sessionId_seq_idx" ON "session_turns"("sessionId", "seq");

-- CreateIndex
CREATE UNIQUE INDEX "session_turns_sessionId_seq_key" ON "session_turns"("sessionId", "seq");

-- CreateIndex
CREATE INDEX "retained_facts_sessionId_idx" ON "retained_facts"("sessionId");

-- AddForeignKey
ALTER TABLE "extracted_rows" ADD CONSTRAINT "extracted_rows_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ingest_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_turns" ADD CONSTRAINT "session_turns_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "shopper_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retained_facts" ADD CONSTRAINT "retained_facts_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "shopper_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;


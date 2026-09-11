/*
  Warnings:

  - You are about to drop the column `latency` on the `activity_logs` table. All the data in the column will be lost.
  - You are about to drop the column `session` on the `activity_logs` table. All the data in the column will be lost.
  - You are about to drop the column `time` on the `activity_logs` table. All the data in the column will be lost.
  - The `status` column on the `activity_logs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `length` on the `avatar_renders` table. All the data in the column will be lost.
  - The `pct` column on the `ingest_jobs` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "LogStatus" AS ENUM ('OK', 'ERROR', 'ESCALATED');

-- AlterEnum
ALTER TYPE "LogKind" ADD VALUE 'SESSION';

-- AlterTable
ALTER TABLE "activity_logs" DROP COLUMN "latency",
DROP COLUMN "session",
DROP COLUMN "time",
ADD COLUMN     "detail" TEXT,
ADD COLUMN     "latencyMs" INTEGER,
ADD COLUMN     "sessionId" TEXT,
ALTER COLUMN "model" DROP NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "LogStatus" NOT NULL DEFAULT 'OK',
ALTER COLUMN "cost" SET DATA TYPE DECIMAL(10,4);

-- AlterTable
ALTER TABLE "avatar_renders" DROP COLUMN "length",
ADD COLUMN     "durationSec" INTEGER;

-- AlterTable
ALTER TABLE "ingest_jobs" DROP COLUMN "pct",
ADD COLUMN     "pct" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "activity_logs_createdAt_idx" ON "activity_logs"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "activity_logs_kind_createdAt_idx" ON "activity_logs"("kind", "createdAt" DESC);

-- CreateEnum
CREATE TYPE "IngestSourceKind" AS ENUM ('FILE', 'TEXT');

-- CreateEnum
CREATE TYPE "IngestSourceStatus" AS ENUM ('STAGED', 'PENDING_EXTRACTION', 'INDEXED', 'FAILED');

-- CreateEnum
CREATE TYPE "PageIndexDocStatus" AS ENUM ('INDEXED', 'PENDING_EXTRACTION', 'ERROR');

-- AlterTable
ALTER TABLE "ingest_jobs" ADD COLUMN     "sourceId" TEXT;

-- CreateTable
CREATE TABLE "ingest_sources" (
    "id" TEXT NOT NULL,
    "kind" "IngestSourceKind" NOT NULL,
    "title" TEXT NOT NULL,
    "fileName" TEXT,
    "mime" TEXT NOT NULL,
    "ext" TEXT NOT NULL DEFAULT '',
    "sizeBytes" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "storagePath" TEXT,
    "text" TEXT,
    "status" "IngestSourceStatus" NOT NULL DEFAULT 'STAGED',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingest_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_index_builds" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "label" TEXT,
    "sourceCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_index_builds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_index_documents" (
    "id" TEXT NOT NULL,
    "buildId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "status" "PageIndexDocStatus" NOT NULL,
    "note" TEXT,
    "chars" INTEGER NOT NULL DEFAULT 0,
    "words" INTEGER NOT NULL DEFAULT 0,
    "sections" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "page_index_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_index_nodes" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "depth" INTEGER NOT NULL,
    "heading" TEXT NOT NULL,
    "startChar" INTEGER NOT NULL,
    "endChar" INTEGER NOT NULL,
    "words" INTEGER NOT NULL,
    "preview" TEXT NOT NULL,

    CONSTRAINT "page_index_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ingest_sources_createdAt_idx" ON "ingest_sources"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "ingest_sources_checksum_idx" ON "ingest_sources"("checksum");

-- CreateIndex
CREATE INDEX "page_index_builds_createdAt_idx" ON "page_index_builds"("createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "page_index_documents_buildId_ordinal_key" ON "page_index_documents"("buildId", "ordinal");

-- CreateIndex
CREATE INDEX "page_index_nodes_documentId_ordinal_idx" ON "page_index_nodes"("documentId", "ordinal");

-- CreateIndex
CREATE UNIQUE INDEX "page_index_nodes_documentId_ordinal_key" ON "page_index_nodes"("documentId", "ordinal");

-- CreateIndex
CREATE UNIQUE INDEX "ingest_jobs_sourceId_key" ON "ingest_jobs"("sourceId");

-- AddForeignKey
ALTER TABLE "ingest_jobs" ADD CONSTRAINT "ingest_jobs_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ingest_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_index_documents" ADD CONSTRAINT "page_index_documents_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "page_index_builds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_index_documents" ADD CONSTRAINT "page_index_documents_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ingest_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_index_nodes" ADD CONSTRAINT "page_index_nodes_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "page_index_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;


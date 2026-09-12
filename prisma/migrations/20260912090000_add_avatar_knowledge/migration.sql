-- CreateTable
CREATE TABLE "avatar_knowledge" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "category" TEXT,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "importKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "avatar_knowledge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "avatar_knowledge_importKey_key" ON "avatar_knowledge"("importKey");

-- CreateIndex
CREATE INDEX "avatar_knowledge_isActive_updatedAt_idx" ON "avatar_knowledge"("isActive", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "avatar_knowledge_category_idx" ON "avatar_knowledge"("category");

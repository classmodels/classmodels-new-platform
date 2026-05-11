-- CreateTable
CREATE TABLE "TestshootModel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Model',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "downloadUnlocked" BOOLEAN NOT NULL DEFAULT false,
    "unlockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestshootModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestshootPhoto" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestshootPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestshootFeedback" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestshootFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TestshootPhoto_modelId_assetId_key" ON "TestshootPhoto"("modelId", "assetId");

-- AddForeignKey
ALTER TABLE "TestshootPhoto" ADD CONSTRAINT "TestshootPhoto_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "TestshootModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestshootPhoto" ADD CONSTRAINT "TestshootPhoto_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestshootFeedback" ADD CONSTRAINT "TestshootFeedback_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "TestshootModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

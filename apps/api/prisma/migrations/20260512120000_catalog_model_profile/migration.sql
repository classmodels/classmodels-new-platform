-- AlterTable
ALTER TABLE "User" ADD COLUMN "legacyWpUserId" INTEGER;
ALTER TABLE "User" ADD COLUMN "profilePhotoAssetId" TEXT;

CREATE UNIQUE INDEX "User_legacyWpUserId_key" ON "User"("legacyWpUserId");

CREATE UNIQUE INDEX "User_profilePhotoAssetId_key" ON "User"("profilePhotoAssetId");

ALTER TABLE "User" ADD CONSTRAINT "User_profilePhotoAssetId_fkey" FOREIGN KEY ("profilePhotoAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "ModelAdminFavorite" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "modelUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModelAdminFavorite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ModelAdminFavorite_adminUserId_modelUserId_key" ON "ModelAdminFavorite"("adminUserId", "modelUserId");

ALTER TABLE "ModelAdminFavorite" ADD CONSTRAINT "ModelAdminFavorite_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ModelAdminFavorite" ADD CONSTRAINT "ModelAdminFavorite_modelUserId_fkey" FOREIGN KEY ("modelUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

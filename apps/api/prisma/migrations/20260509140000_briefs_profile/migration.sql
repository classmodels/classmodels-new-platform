-- CreateEnum
CREATE TYPE "BriefStatus" AS ENUM ('open', 'closed', 'archived');

-- CreateEnum
CREATE TYPE "BriefResponseStatus" AS ENUM ('submitted', 'withdrawn', 'accepted', 'declined');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phone" TEXT,
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "companyName" TEXT;

-- CreateTable
CREATE TABLE "ClientBrief" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "BriefStatus" NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientBrief_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelBriefResponse" (
    "id" TEXT NOT NULL,
    "briefId" TEXT NOT NULL,
    "modelUserId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "BriefResponseStatus" NOT NULL DEFAULT 'submitted',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModelBriefResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ModelBriefResponse_briefId_modelUserId_key" ON "ModelBriefResponse"("briefId", "modelUserId");

-- AddForeignKey
ALTER TABLE "ClientBrief" ADD CONSTRAINT "ClientBrief_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelBriefResponse" ADD CONSTRAINT "ModelBriefResponse_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "ClientBrief"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelBriefResponse" ADD CONSTRAINT "ModelBriefResponse_modelUserId_fkey" FOREIGN KEY ("modelUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

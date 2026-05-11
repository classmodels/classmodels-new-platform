-- AlterTable
ALTER TABLE "ClientBrief" ADD COLUMN     "ageChildFrom" INTEGER,
ADD COLUMN     "ageChildTo" INTEGER,
ADD COLUMN     "ageManFrom" INTEGER,
ADD COLUMN     "ageManTo" INTEGER,
ADD COLUMN     "ageWomanFrom" INTEGER,
ADD COLUMN     "ageWomanTo" INTEGER,
ADD COLUMN     "endTime" TEXT,
ADD COLUMN     "eventDate" TIMESTAMP(3),
ADD COLUMN     "extraInfo" TEXT,
ADD COLUMN     "startTime" TEXT,
ADD COLUMN     "wantedChildren" INTEGER,
ADD COLUMN     "wantedMen" INTEGER,
ADD COLUMN     "wantedWomen" INTEGER;

-- AlterTable
ALTER TABLE "Subscription" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "modelSheet" JSONB;

-- AlterTable
ALTER TABLE "PushCampaign" ADD COLUMN     "sentByUserId" TEXT,
ADD COLUMN     "recipientListId" TEXT;

-- CreateTable
CREATE TABLE "WebPushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebPushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelPushSettings" (
    "userId" TEXT NOT NULL,
    "notifyHistoryEvents" BOOLEAN NOT NULL DEFAULT true,
    "notifyAgencyBroadcasts" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModelPushSettings_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "ModelPushInbox" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "meta" JSONB,
    "readAt" TIMESTAMP(3),
    "campaignId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModelPushInbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushRecipientList" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushRecipientList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushRecipientListMember" (
    "listId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushRecipientListMember_pkey" PRIMARY KEY ("listId","userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "WebPushSubscription_endpoint_key" ON "WebPushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "WebPushSubscription_userId_idx" ON "WebPushSubscription"("userId");

-- CreateIndex
CREATE INDEX "ModelPushInbox_userId_readAt_createdAt_idx" ON "ModelPushInbox"("userId", "readAt", "createdAt");

-- AddForeignKey
ALTER TABLE "PushCampaign" ADD CONSTRAINT "PushCampaign_sentByUserId_fkey" FOREIGN KEY ("sentByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushCampaign" ADD CONSTRAINT "PushCampaign_recipientListId_fkey" FOREIGN KEY ("recipientListId") REFERENCES "PushRecipientList"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebPushSubscription" ADD CONSTRAINT "WebPushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelPushSettings" ADD CONSTRAINT "ModelPushSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelPushInbox" ADD CONSTRAINT "ModelPushInbox_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelPushInbox" ADD CONSTRAINT "ModelPushInbox_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "PushCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushRecipientList" ADD CONSTRAINT "PushRecipientList_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushRecipientListMember" ADD CONSTRAINT "PushRecipientListMember_listId_fkey" FOREIGN KEY ("listId") REFERENCES "PushRecipientList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushRecipientListMember" ADD CONSTRAINT "PushRecipientListMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

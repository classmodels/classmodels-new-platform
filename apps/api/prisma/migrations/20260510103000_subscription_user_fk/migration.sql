-- AlterTable Subscription (uitbreiding voor Mollie + Prisma @updatedAt)
ALTER TABLE "Subscription" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Subscription" ADD COLUMN "mollieSubscriptionId" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'EUR';

CREATE UNIQUE INDEX "Subscription_molliePaymentId_key" ON "Subscription"("molliePaymentId");

ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

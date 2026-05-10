-- AlterTable
ALTER TABLE "AgendaBooking" ADD COLUMN "cancelToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "AgendaBooking_cancelToken_key" ON "AgendaBooking"("cancelToken");

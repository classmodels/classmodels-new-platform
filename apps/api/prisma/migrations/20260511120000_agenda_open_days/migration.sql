-- AlterTable
ALTER TABLE "AgendaCalendar" ADD COLUMN "restrictToOpenDays" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "AgendaOpenDay" (
    "id" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "openDate" DATE NOT NULL,
    "repeatYearly" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgendaOpenDay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgendaOpenDay_calendarId_openDate_key" ON "AgendaOpenDay"("calendarId", "openDate");

-- CreateIndex
CREATE INDEX "AgendaOpenDay_calendarId_openDate_idx" ON "AgendaOpenDay"("calendarId", "openDate");

-- AddForeignKey
ALTER TABLE "AgendaOpenDay" ADD CONSTRAINT "AgendaOpenDay_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "AgendaCalendar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
